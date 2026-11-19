import pytest

from app.rag.ingestion import chunk_document
from app.rag.retriever import Retriever
from app.rag.vectorstore import InMemoryVectorStore


def test_chunking_respects_paragraph_boundaries_when_possible():
    text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
    chunks = chunk_document(text, source="doc.txt", max_chars=1000)
    assert len(chunks) == 1
    assert "Paragraph one." in chunks[0].text
    assert "Paragraph three." in chunks[0].text


def test_chunking_splits_when_over_max_chars():
    text = "A" * 50 + "\n\n" + "B" * 50
    chunks = chunk_document(text, source="doc.txt", max_chars=60, overlap=0)
    assert len(chunks) >= 2


def test_chunking_tracks_source_and_index():
    text = "Para one.\n\nPara two."
    chunks = chunk_document(text, source="budget.pdf", max_chars=8, overlap=0)
    for chunk in chunks:
        assert chunk.source == "budget.pdf"
        assert "source" in chunk.metadata


def test_invalid_overlap_raises():
    with pytest.raises(ValueError):
        chunk_document("text", source="x.txt", max_chars=100, overlap=200)


def test_retriever_returns_most_relevant_chunk():
    store = InMemoryVectorStore()
    chunks = chunk_document(
        "Marketing budget overspend was driven by a paid social campaign.\n\n"
        "Office rent remained flat quarter over quarter with no variance.",
        source="q3_report.pdf",
        max_chars=200,
    )
    store.upsert(chunks)

    retriever = Retriever(store)
    result = retriever.retrieve("why did marketing overspend this quarter?")

    assert "marketing" in result.combined_text.lower()
    assert len(result.citations) >= 1
    assert "q3_report.pdf" in result.citations[0]


def test_retriever_returns_empty_context_for_unrelated_query():
    store = InMemoryVectorStore()
    store.upsert(chunk_document("Cats are fluffy mammals.", source="unrelated.txt"))

    retriever = Retriever(store, min_score=0.3)
    result = retriever.retrieve("quarterly capital structure WACC analysis")

    assert result.combined_text == ""
    assert result.citations == []


def test_retriever_applies_tenant_metadata_filter():
    store = InMemoryVectorStore()
    store.upsert([
        *chunk_document(
            "Acme revenue was 100.",
            source="acme.xlsx",
            metadata={"business_id": "acme"},
        ),
        *chunk_document(
            "OtherCo revenue was 900.",
            source="other.xlsx",
            metadata={"business_id": "other"},
        ),
    ])

    result = Retriever(store, metadata_filter={"business_id": "acme"}).retrieve("revenue")

    assert "Acme" in result.combined_text
    assert "OtherCo" not in result.combined_text
    assert all("other.xlsx" not in citation for citation in result.citations)
