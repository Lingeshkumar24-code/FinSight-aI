"""
Document ingestion endpoint.

Accepts plain-text-decodable files (.txt, .csv, .md — anything
UTF-8-ish) and indexes them into the vector store for RAG. Binary
formats (PDF, XLSX) need a format-specific extraction step before they
reach `chunk_document`; that extraction lives outside this MVP's scope
but is a clean seam: parse to text, then call the same
`chunk_document` + `vector_store.upsert` pipeline used here. The
architecture diagram's n8n "Document Ingestion Workflow (on Upload)"
is exactly where that extraction would run in production, handing
clean text to this same code path via a webhook.
"""
from __future__ import annotations

import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.deps import get_vector_store
from app.core.security import TokenPayload, get_current_user
from app.models.schemas import DocumentUploadResponse
from app.rag.ingestion import chunk_document
from app.rag.vectorstore import VectorStore

router = APIRouter(prefix="/documents", tags=["documents"])

_SUPPORTED_SUFFIXES = (".txt", ".csv", ".md", ".xlsx")


def _extract_text_from_xlsx(raw_bytes: bytes) -> str:
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), data_only=True)
        sections: list[str] = []
        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue
            lines = [f"=== Sheet: {sheet_name} ==="]
            for row in rows:
                if not any(cell is not None and str(cell).strip() != "" for cell in row):
                    continue
                cells = [str(cell).strip() if cell is not None else "" for cell in row]
                lines.append(" | ".join(cells))
            sections.append("\n".join(lines))
        return "\n\n".join(sections)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse Excel workbook: {exc}",
        ) from exc


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    _user: TokenPayload = Depends(get_current_user),
    vector_store: VectorStore = Depends(get_vector_store),
) -> DocumentUploadResponse:
    filename = file.filename or "upload.txt"
    lower_name = filename.lower()
    if not lower_name.endswith(_SUPPORTED_SUFFIXES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type. Supported formats: {', '.join(_SUPPORTED_SUFFIXES)}. "
                "For PDFs, upload text or export to CSV/XLSX."
            ),
        )

    raw = await file.read()
    if lower_name.endswith(".xlsx"):
        text = _extract_text_from_xlsx(raw)
    else:
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File is not valid UTF-8 text"
            ) from exc

    if not text.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File is empty")

    document_id = str(uuid.uuid4())
    chunks = chunk_document(text, source=filename)
    vector_store.upsert(chunks)

    return DocumentUploadResponse(
        document_id=document_id, source=filename, chunks_indexed=len(chunks)
    )
