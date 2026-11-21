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


def test_agentic_rag_intent_classification():
    from app.rag.agentic_rag import FinancialIntent, classify_financial_intent

    assert classify_financial_intent("should we take a loan?") == FinancialIntent.LOAN_DECISION
    assert classify_financial_intent("in which stock can we invest surplus cash?") == FinancialIntent.STOCK_INVESTMENT
    assert classify_financial_intent("give me an executive summary") == FinancialIntent.SUMMARY
    assert classify_financial_intent("what are our operating expenses?") == FinancialIntent.EXPENSES
    assert classify_financial_intent("tell me total invoiced revenue") == FinancialIntent.REVENUE


def test_agentic_rag_loan_decision_uses_extracted_evidence_not_canned_text():
    """Even though this document contains 'LN-001' and loan-register content
    that previously triggered a hardcoded, fully-canned Aarohan advisory
    response, the engine must derive its answer only from the actual
    figures present in THIS document (2,350,000 cash / 2,810,000 debt),
    never from literal fallback text keyed off those trigger strings."""
    from app.rag.agentic_rag import AgenticRAGEngine
    store = InMemoryVectorStore()
    text = (
        "=== [Sheet: Loan Register] ===\n"
        "Loan ID | Lender | Type | Principal | Rate | EMI | Outstanding | Status\n"
        "LN-001 | Demo National Bank | Term Loan | 3000000 | 11.5% | 82000 | 1680000 | Active\n"
        "LN-002 | Demo Urban Finance | Working Capital | 1000000 | 12.5% | 26500 | 520000 | Active\n"
        "LN-003 | Demo Co-operative Bank | Equipment Loan | 800000 | 10.5% | 17500 | 610000 | Active\n\n"
        "=== [Sheet: Balance Sheet] ===\n"
        "Cash and Cash Equivalents | 2350000\n"
        "Total Debt | 2810000\n"
    )
    store.upsert(chunk_document(text, source="dataset.xlsx"))
    retriever = Retriever(store)
    agentic = AgenticRAGEngine(retriever)

    loan_res = agentic.retrieve_and_reason("should we take a loan or not?")

    # The old literal advisory text must never appear again.
    assert "DO NOT TAKE AN ADDITIONAL COMMERCIAL LOAN" not in loan_res.reasoned_decision
    assert "Demo National Bank" not in loan_res.reasoned_decision or loan_res.structured_metrics.get("total_debt") == 2810000.0

    # The real figures, extracted generically from this document, must appear.
    assert loan_res.structured_metrics.get("cash_balance") == 2350000.0
    assert loan_res.structured_metrics.get("total_debt") == 2810000.0
    assert "2,810,000" in loan_res.reasoned_decision


def test_agentic_rag_no_hardcoded_company_branching_for_unseen_company():
    """A document for a completely unrelated, unseen company must not
    trigger the Reliance/SBI/Aarohan-specific code paths, and no figures
    may be returned that weren't present in the document itself."""
    from app.rag.agentic_rag import AgenticRAGEngine
    store = InMemoryVectorStore()
    text = (
        "=== [Sheet: Balance Sheet] ===\n"
        "Company Name | Zephyr Consumer Goods Pvt Ltd\n"
        "Total Assets | 9900000\n"
        "Total Debt | 1200000\n"
        "Cash and Cash Equivalents | 450000\n"
    )
    store.upsert(chunk_document(text, source="zephyr.xlsx"))
    retriever = Retriever(store)
    agentic = AgenticRAGEngine(retriever)

    res = agentic.retrieve_and_reason("what is our financial position?")

    assert "Aarohan" not in res.reasoned_decision
    assert "Reliance" not in res.reasoned_decision
    assert "State Bank" not in res.reasoned_decision
    assert res.structured_metrics.get("total_debt") == 1200000.0
    assert res.structured_metrics.get("cash_balance") == 450000.0
