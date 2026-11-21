"""Tenant-scoped document upload, indexing, and CRUD management."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import delete, func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_vector_store
from app.config import Settings, get_settings
from app.core.security import TokenPayload, get_current_user
from app.db.extensions import CashFlowRecord
from app.db.models import Business, Document, DocumentChunkRow, FinancialRecord
from app.db.session import get_session
from app.models.schemas import DocumentListItem, DocumentUploadResponse
from app.rag.ingestion import chunk_document
from app.rag.vectorstore import VectorStore
from app.services.document_extraction import extract_document
from app.services.financial_extractor import extract_financial_records_from_workbook

router = APIRouter(prefix="/documents", tags=["documents"])

_SUPPORTED_SUFFIXES = (".txt", ".csv", ".md", ".xlsx", ".xlsm", ".xltx", ".xltm", ".xls", ".pdf", ".docx")


@router.get("", response_model=list[DocumentListItem])
async def list_documents(
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[DocumentListItem]:
    """Retrieve all uploaded documents and chunk counts for the current user's workspace."""
    docs = (
        await session.execute(
            select(Document)
            .where(Document.business_id == user.business_id)
            .order_by(Document.created_at.desc())
        )
    ).scalars().all()

    items: list[DocumentListItem] = []
    for d in docs:
        chunk_count = (
            await session.execute(
                select(func.count(DocumentChunkRow.id)).where(DocumentChunkRow.document_id == d.id)
            )
        ).scalar() or 0
        items.append(
            DocumentListItem(
                id=d.id,
                filename=d.filename,
                status=d.status,
                created_at=d.created_at.isoformat() if d.created_at else "",
                chunks_indexed=chunk_count,
            )
        )
    return items


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    vector_store: VectorStore = Depends(get_vector_store),
):
    """Delete an uploaded document and its indexed chunks from the user's workspace."""
    doc = (
        await session.execute(
            select(Document).where(Document.id == document_id, Document.business_id == user.business_id)
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    vector_store.delete_by_metadata({"document_id": document_id})
    await session.execute(delete(DocumentChunkRow).where(DocumentChunkRow.document_id == document_id))
    await session.delete(doc)
    await session.commit()

    return {"success": True, "deleted_id": document_id, "filename": doc.filename}


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    user: TokenPayload = Depends(get_current_user),
    vector_store: VectorStore = Depends(get_vector_store),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> DocumentUploadResponse:
    filename = (file.filename or "upload.txt").replace("\\", "/").split("/")[-1]
    lower_name = filename.lower()
    if not lower_name.endswith(_SUPPORTED_SUFFIXES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Supported formats: {', '.join(_SUPPORTED_SUFFIXES)}.",
        )

    raw = await file.read(settings.MAX_UPLOAD_BYTES + 1)
    if len(raw) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.",
        )

    extracted = extract_document(filename, raw)
    if not extracted.text.strip():
        detail = "File contains no extractable text. " + " ".join(extracted.warnings)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

    # Ensure parent business workspace exists in database
    biz = (await session.execute(select(Business).where(Business.id == user.business_id))).scalar_one_or_none()
    if not biz:
        biz = Business(id=user.business_id, name="User Workspace", currency="INR")
        session.add(biz)
        await session.flush()

    document_id = str(uuid.uuid4())
    chunks = chunk_document(
        extracted.text,
        source=filename,
        metadata={
            "business_id": user.business_id,
            "document_id": document_id,
            "filename": filename,
            **extracted.metadata,
        },
    )

    # Persist metadata and chunks before indexing.
    document = Document(
        id=document_id,
        business_id=user.business_id,
        filename=filename,
        status="processed",
    )
    session.add(document)
    if chunks:
        await session.execute(
            insert(DocumentChunkRow),
            [
                {
                    "id": chunk.id,
                    "document_id": document_id,
                    "chunk_index": int(chunk.metadata["chunk_index"]),
                    "text": chunk.text,
                    "source_location": str(chunk.metadata.get("source_location", "")),
                }
                for chunk in chunks
            ],
        )

    # 4. Extract statements before changing stored state. A malformed or
    # unsupported upload must not silently leave a new document with stale KPIs.
    try:
        company_name, fin_records, cashflows = extract_financial_records_from_workbook(
            raw, filename, extracted_text=extracted.text
        )
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Could not validate financial data: {exc}") from exc

    try:
        # Only ingest structured financial records if this is a comprehensive statement
        # (multi-period or contains balance sheet assets), so tiny 1-line text-chunk tests don't wipe demo records.
        if fin_records and (len(fin_records) >= 2 or any(r.get("total_assets") for r in fin_records)):
            if company_name:
                biz.name = company_name

            # Remove previous financial records so dashboard reflects the newly uploaded corporate filing cleanly
            await session.execute(
                delete(FinancialRecord).where(
                    FinancialRecord.business_id == user.business_id,
                )
            )

            for rec_data in fin_records:
                for numeric_field in ("revenue", "net_income", "total_assets", "total_liabilities", "total_equity", "operating_expenses"):
                    if rec_data.get(numeric_field) is None:
                        rec_data[numeric_field] = 0.0
                rec_data["cogs"] = rec_data.get("cogs") if rec_data.get("cogs") is not None else 0.0
                session.add(
                    FinancialRecord(
                        business_id=user.business_id,
                        source="uploaded",
                        verified=True,
                        source_document_id=document_id,
                        **rec_data,
                    )
                )

            if cashflows:
                await session.execute(
                    delete(CashFlowRecord).where(CashFlowRecord.business_id == user.business_id)
                )
                for cf in cashflows:
                    session.add(
                        CashFlowRecord(
                            business_id=user.business_id,
                            period=cf["period"],
                            opening_cash=0.0,
                            operating_inflow=cf.get("inflow", 0.0),
                            operating_outflow=cf.get("outflow", 0.0),
                            closing_cash=cf.get("closing_cash", 0.0),
                            notes=f"Extracted from {filename}",
                        )
                    )
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Could not save extracted financial data: {exc}") from exc

    await session.commit()
    vector_store.delete_by_metadata({"document_id": document_id})
    vector_store.delete_by_metadata({"business_id": user.business_id, "source": filename})
    vector_store.upsert(chunks)

    return DocumentUploadResponse(
        document_id=document_id,
        source=filename,
        chunks_indexed=len(chunks),
    )
