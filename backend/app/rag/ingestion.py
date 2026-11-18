"""
Document Ingestion
---------------------
Doc-aware chunking: splits on paragraph boundaries first, and only falls
back to a hard character split for a paragraph that is itself longer
than `max_chars`. Each chunk keeps its source document name and sequence
index so the Response Generation node can cite "Q3_Budget.pdf, chunk 2"
rather than a bare chunk id.
"""
from __future__ import annotations

import uuid

from app.rag.vectorstore import DocumentChunk


def chunk_document(
    text: str,
    source: str,
    max_chars: int = 800,
    overlap: int = 100,
) -> list[DocumentChunk]:
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")
    if overlap < 0 or overlap >= max_chars:
        raise ValueError("overlap must be >= 0 and < max_chars")

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    raw_chunks: list[str] = []
    buffer = ""

    for para in paragraphs:
        if len(para) > max_chars:
            # Hard-split an oversized paragraph with overlap.
            start = 0
            while start < len(para):
                end = start + max_chars
                raw_chunks.append(para[start:end])
                start = end - overlap
            continue

        candidate = f"{buffer}\n\n{para}".strip() if buffer else para
        if len(candidate) <= max_chars:
            buffer = candidate
        else:
            if buffer:
                raw_chunks.append(buffer)
            buffer = para

    if buffer:
        raw_chunks.append(buffer)

    return [
        DocumentChunk(
            id=str(uuid.uuid4()),
            text=chunk_text,
            source=source,
            metadata={"chunk_index": i, "source": source},
        )
        for i, chunk_text in enumerate(raw_chunks)
    ]
