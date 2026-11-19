from __future__ import annotations

import io

from fastapi import HTTPException, status


def extract_text(filename: str, raw: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        try:
            import fitz

            document = fitz.open(stream=raw, filetype="pdf")
            try:
                return "\n".join(page.get_text() for page in document)
            finally:
                document.close()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to extract PDF text: {exc}",
            ) from exc

    if lower.endswith(".xlsx"):
        try:
            import openpyxl

            workbook = openpyxl.load_workbook(io.BytesIO(raw), data_only=True)
            sections: list[str] = []
            for sheet_name in workbook.sheetnames:
                rows = list(workbook[sheet_name].iter_rows(values_only=True))
                if not rows:
                    continue
                lines = [f"=== Sheet: {sheet_name} ==="]
                for row in rows:
                    if not any(cell is not None and str(cell).strip() != "" for cell in row):
                        continue
                    lines.append(" | ".join(str(cell).strip() if cell is not None else "" for cell in row))
                sections.append("\n".join(lines))
            return "\n\n".join(sections)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse Excel workbook: {exc}",
            ) from exc

    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File is not valid UTF-8 text",
        ) from exc
