"""
Agentic RAG & Dynamic Dashboard Evaluation Suite
------------------------------------------------
Validates:
1. Dynamic Dashboard Metrics:
   - Uploading Reliance Industries updates dashboard to Reliance metrics (Sales: ₹10,55,780 Cr, Profit: ₹80,775 Cr, Assets: ₹21,77,546 Cr).
   - Uploading State Bank of India changes the dashboard to SBI metrics (Sales: ₹5,14,932.59 Cr, Profit: ₹83,298.78 Cr, Assets: ₹83,21,175.98 Cr).
   - Proves that dashboard metrics change dynamically with whatever document is uploaded.
2. Agentic RAG Checklist Evaluation:
   - Context Precision, Context Recall, Precision@3, Recall@3, MRR, Query Rewrite Quality.
   - Faithfulness (Groundedness), Answer Relevance, Answer Correctness, Citation Accuracy.
   - Task Success Rate (TSR), Tool Selection Accuracy, Step Efficiency, Error Recovery.
   - Latency (P50, P95), Token Usage, and Cost.
"""
from __future__ import annotations

import io
from pathlib import Path
import uuid
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.core.security import create_access_token
from app.evaluation.agentic_rag_eval import GoldenQuery, evaluate_agentic_rag

RELIANCE_PATH = Path(r"C:\Users\linge\Downloads\Reliance Industries.xlsx")
SBI_PATH = Path(r"C:\Users\linge\Downloads\SBI.xlsx")


@pytest.mark.skipif(not (RELIANCE_PATH.exists() and SBI_PATH.exists()), reason="Corporate workbooks not found")
def test_dashboard_metrics_change_dynamically_per_uploaded_document(client: TestClient):
    """
    Validates that whenever a new document is uploaded, the dashboard metrics dynamically
    change and reflect the uploaded filing, overriding old figures.
    """
    user_id = str(uuid.uuid4())
    biz_id = str(uuid.uuid4())
    token = create_access_token(user_id=user_id, business_id=biz_id, role="owner", settings=get_settings())
    headers = {"Authorization": f"Bearer {token}"}

    # --- Phase 1: Upload Reliance Industries ---
    with open(RELIANCE_PATH, "rb") as f:
        rel_bytes = f.read()

    up1 = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": ("Reliance Industries.xlsx", io.BytesIO(rel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert up1.status_code == 200, up1.text

    dash1 = client.get("/api/v1/financials/dashboard", headers=headers)
    assert dash1.status_code == 200
    d1 = dash1.json()

    assert d1["available"] is True
    assert d1["data_label"] == "VERIFIED"
    assert d1["source"] == "uploaded"
    assert d1["period"] == "2026-03-31"

    rel_records = d1["records"]
    assert len(rel_records) == 10
    rel_latest = rel_records[-1]
    assert rel_latest["revenue"] == 1055780.0
    assert rel_latest["net_income"] == 80775.0
    assert rel_latest["total_assets"] == 2177546.0
    assert rel_latest["cash"] == 145977.0

    ratios1 = {r["name"]: r["value"] for r in d1["ratios"]}
    assert 0.05 <= ratios1["net_margin_pct"] <= 12.0
    assert 0.35 <= ratios1["debt_to_equity"] <= 0.60
    assert 1.1 <= ratios1["total_liabilities_to_equity"] <= 1.6

    # --- Phase 2: Upload State Bank of India ---
    with open(SBI_PATH, "rb") as f:
        sbi_bytes = f.read()

    up2 = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": ("SBI.xlsx", io.BytesIO(sbi_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert up2.status_code == 200, up2.text

    dash2 = client.get("/api/v1/financials/dashboard", headers=headers)
    assert dash2.status_code == 200
    d2 = dash2.json()

    assert d2["available"] is True
    assert d2["data_label"] == "VERIFIED"
    assert d2["source"] == "uploaded"

    sbi_records = d2["records"]
    assert len(sbi_records) == 10
    sbi_latest = sbi_records[-1]
    # Verify dashboard metrics CHANGED from Reliance to SBI!
    assert sbi_latest["revenue"] != rel_latest["revenue"]
    assert abs(sbi_latest["revenue"] - 514932.59) < 1.0
    assert abs(sbi_latest["net_income"] - 83298.78) < 1.0
    assert abs(sbi_latest["total_assets"] - 8321175.98) < 1.0
    assert abs(sbi_latest["cash"] - 268681.74) < 1.0

    ratios2 = {r["name"]: r["value"] for r in d2["ratios"]}
    assert ratios2["net_margin_pct"] != ratios1["net_margin_pct"]
    assert 12.0 <= ratios2["net_margin_pct"] <= 20.0  # SBI net margin ~16.1%
    assert ratios2["total_liabilities_to_equity"] > 10.0  # Banking total leverage > 10x
    assert 10.0 <= ratios2["debt_to_equity"] <= 13.0  # SBI reported borrowings/equity ~11.4x


@pytest.mark.skipif(not (RELIANCE_PATH.exists() and SBI_PATH.exists()), reason="Corporate workbooks not found")
def test_agentic_rag_full_checklist_evaluation(client: TestClient):
    """
    Executes the golden evaluation dataset across the Agentic RAG engine,
    scoring all checklist metrics against production quality gates.
    """
    user_id = str(uuid.uuid4())
    biz_id = str(uuid.uuid4())
    token = create_access_token(user_id=user_id, business_id=biz_id, role="owner", settings=get_settings())
    headers = {"Authorization": f"Bearer {token}"}

    # Upload Reliance Industries
    with open(RELIANCE_PATH, "rb") as f:
        rel_bytes = f.read()
    client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": ("Reliance Industries.xlsx", io.BytesIO(rel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )

    # Golden Dataset defining queries, expected entities, numbers, and grounding targets
    golden_dataset: list[GoldenQuery] = [
        GoldenQuery(
            query_id="Q1_RELIANCE_REVENUE",
            query="What is the sales and revenue of Reliance Industries in FY24, FY25, and FY26?",
            target_document="Reliance Industries.xlsx",
            expected_entities=["Sales"],
            expected_numbers=[899041.0, 962820.0, 1055780.0],
            expected_context_keywords=["Sales"],
            expected_tool="rag:retrieve",
        ),
        GoldenQuery(
            query_id="Q2_RELIANCE_PROFIT_DEBT",
            query="What is the net profit and total borrowings of Reliance Industries?",
            target_document="Reliance Industries.xlsx",
            expected_entities=["Borrowings", "profit"],
            expected_numbers=[80775.0, 402962.0],
            expected_context_keywords=["Borrowings", "profit"],
            expected_tool="rag:retrieve",
        ),
        GoldenQuery(
            query_id="Q3_RELIANCE_EXECUTIVE_SUMMARY",
            query="Summarize the overall financial position, debt, and profitability of Reliance Industries based on the uploaded workbook.",
            target_document="Reliance Industries.xlsx",
            expected_entities=["Debt", "profit"],
            expected_numbers=[80775.0, 1055780.0],
            expected_context_keywords=["Borrowings", "Sales"],
            expected_tool="rag:retrieve",
        ),
        GoldenQuery(
            query_id="Q4_RELIANCE_CASH_FLOW",
            query="What is the cash from operating activity and closing cash balance for Reliance Industries?",
            target_document="Reliance Industries.xlsx",
            expected_entities=["Cash", "Operating"],
            expected_numbers=[192113.0, 145977.0],
            expected_context_keywords=["Cash", "Operating"],
            expected_tool="rag:retrieve",
        ),
        GoldenQuery(
            query_id="Q5_OFF_TOPIC_GUARD",
            query="Who won the cricket world cup final?",
            target_document="",
            expected_entities=[],
            expected_numbers=[],
            expected_context_keywords=[],
            expected_tool="rag:retrieve",
            is_off_topic=True,
        ),
    ]

    def ask_rag(q: str) -> dict:
        resp = client.post("/api/v1/advisor/ask", headers=headers, json={"query": q})
        assert resp.status_code == 200, resp.text
        return resp.json()

    # Run the comprehensive evaluation
    report = evaluate_agentic_rag(golden_dataset, ask_rag)
    metrics = report.to_dict()

    print("\n" + "=" * 60)
    print("AGENTIC RAG EVALUATION REPORT RESULTS")
    print("=" * 60)
    import json
    print(json.dumps(metrics, indent=2))
    print("=" * 60)
    for s in report.sample_results:
        print(f"SAMPLE {s.query_id}: recall={s.context_recall}, prec={s.context_precision}, faith={s.faithfulness}, correct={s.answer_correctness}")
        print(f"  Citations: {s.citations}")

    # Checklist Assertion Gates:
    # 1. Retrieval Metrics
    assert report.context_recall >= 0.85, f"Context Recall too low: {report.context_recall}"
    assert report.context_precision >= 0.25, f"Context Precision too low: {report.context_precision}"
    assert report.mrr >= 0.30, f"MRR too low: {report.mrr}"
    assert report.query_rewrite_quality >= 0.80, f"Query Rewrite Quality too low: {report.query_rewrite_quality}"

    # 2. Generation & Grounding Metrics
    assert report.faithfulness >= 0.60, f"Faithfulness / Groundedness too low: {report.faithfulness}"
    assert report.answer_correctness >= 0.80, f"Answer Correctness too low: {report.answer_correctness}"
    assert report.citation_accuracy >= 0.95, f"Citation Accuracy too low: {report.citation_accuracy}"

    # 3. Trajectory & Tool Metrics
    assert report.task_success_rate >= 0.80, f"Task Success Rate too low: {report.task_success_rate}"
    assert report.tool_selection_accuracy >= 0.95, f"Tool Selection Accuracy too low: {report.tool_selection_accuracy}"
    assert report.error_recovery_rate == 1.0

    # 4. Operational Metrics
    assert report.p50_latency_ms < 5000, f"P50 latency too high: {report.p50_latency_ms}ms"
    assert report.cost_per_task_usd < 0.01, f"Cost per task too high: ${report.cost_per_task_usd}"
