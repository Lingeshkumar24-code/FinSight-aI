import io
from pathlib import Path
import uuid
import pytest
from fastapi.testclient import TestClient
from app.config import get_settings
from app.core.security import create_access_token


RELIANCE_PATH = Path(r"C:\Users\linge\Downloads\Reliance Industries.xlsx")


@pytest.mark.skipif(not RELIANCE_PATH.exists(), reason="Reliance Industries.xlsx not found")
def test_reliance_upload_updates_dashboard_and_agentic_rag(client: TestClient):
    # Dedicated isolated tenant for Reliance Industries
    user_id = str(uuid.uuid4())
    biz_id = str(uuid.uuid4())
    token = create_access_token(user_id=user_id, business_id=biz_id, role="owner", settings=get_settings())
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload Reliance Industries.xlsx
    with open(RELIANCE_PATH, "rb") as f:
        file_bytes = f.read()

    files = {
        "file": (
            "Reliance Industries.xlsx",
            io.BytesIO(file_bytes),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    up_resp = client.post("/api/v1/documents/upload", headers=auth_headers, files=files)
    assert up_resp.status_code == 200
    upload_data = up_resp.json()
    assert upload_data["source"] == "Reliance Industries.xlsx"
    assert upload_data["chunks_indexed"] > 0

    # 2. Verify Dashboard returns live uploaded metrics (NOT DEMO DATA)
    dash_resp = client.get("/api/v1/financials/dashboard", headers=auth_headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()

    assert dash_data["available"] is True
    assert dash_data["data_label"] == "VERIFIED"
    assert dash_data["source"] == "uploaded"
    assert dash_data["verified"] is True
    assert dash_data["period"] == "2026-03-31"
    assert len(dash_data["periods"]) == 10
    assert "2026-03-31" in dash_data["periods"]
    assert "2017-03-31" in dash_data["periods"]

    # Verify Core Financial Metrics
    ratios = {r["name"]: r["value"] for r in dash_data["ratios"]}
    assert "current_ratio" in ratios
    assert "quick_ratio" in ratios
    assert "debt_to_equity" in ratios
    assert "gross_margin_pct" in ratios
    assert "return_on_equity_pct" in ratios
    assert "debt_to_assets" in ratios

    # The workbook reports working capital components, but not the current
    # asset/current liability totals or COGS needed for these ratios.
    assert ratios["current_ratio"] is None
    assert ratios["quick_ratio"] is None
    assert 0.35 <= ratios["debt_to_equity"] <= 0.60
    assert 1.1 <= ratios["total_liabilities_to_equity"] <= 1.6
    assert ratios["gross_margin_pct"] is None
    assert 7.0 <= ratios["return_on_equity_pct"] <= 12.0
    assert 15.0 <= ratios["debt_to_assets"] <= 25.0
    assert 50.0 <= ratios["total_liabilities_to_assets"] <= 65.0

    # 3. Test Agentic RAG Q&A via AI Advisor
    # Query 1: Executive Summary
    summary_resp = client.post(
        "/api/v1/advisor/ask",
        headers=auth_headers,
        json={"query": "Summarize the financial data in this document", "extracted_params": {}},
    )
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()
    assert summary_data["is_valid"] is True
    assert any("Reliance Industries" in c for c in summary_data["citations"])
    ans_combined = (summary_data["answer"] + " " + summary_data.get("tool_result", {}).get("agentic_decision", "")).lower()
    assert "reliance" in ans_combined
    decision_text = summary_data.get("tool_result", {}).get("agentic_decision", "")
    assert "8,99,041" in decision_text or "10,55,780" in decision_text
    assert "1,79,065" in decision_text or "80,775" in decision_text

    # Query 2: Sales & Revenue
    rev_resp = client.post(
        "/api/v1/advisor/ask",
        headers=auth_headers,
        json={"query": "What is the revenue and sales of Reliance Industries?", "extracted_params": {}},
    )
    assert rev_resp.status_code == 200
    rev_data = rev_resp.json()
    assert rev_data["is_valid"] is True
    rev_combined = rev_data["answer"] + " " + rev_data.get("tool_result", {}).get("agentic_decision", "")
    assert "8,99,041" in rev_combined or "10,55,780" in rev_combined

    # Query 3: Debt & Loan Decision
    loan_resp = client.post(
        "/api/v1/advisor/ask",
        headers=auth_headers,
        json={"query": "Should we take a loan or what is our debt capacity?", "extracted_params": {}},
    )
    assert loan_resp.status_code == 200
    loan_data = loan_resp.json()
    assert loan_data["is_valid"] is True
    loan_combined = loan_data["answer"] + " " + loan_data.get("tool_result", {}).get("agentic_decision", "")
    assert "4,02,962" in loan_combined or "9,04,030" in loan_combined or "borrowing" in loan_combined.lower()

    # Query 4: Stock Investment & Valuation
    stock_resp = client.post(
        "/api/v1/advisor/ask",
        headers=auth_headers,
        json={"query": "Can we invest in stocks or what is the valuation?", "extracted_params": {}},
    )
    assert stock_resp.status_code == 200
    stock_data = stock_resp.json()
    assert stock_data["is_valid"] is True
    stock_combined = stock_data["answer"] + " " + stock_data.get("tool_result", {}).get("agentic_decision", "")
    assert "18,67,490" in stock_combined or "1,380" in stock_combined or "21.4" in stock_combined
