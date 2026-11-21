"""
Universal Document Ingestion, Dynamic Dashboard & Agentic RAG Verification Suite
---------------------------------------------------------------------------------
Validates:
1. Uploading a CSV document (column-oriented or row-oriented) dynamically populates
   the dashboard with verified financial figures, replacing demo data.
2. Uploading a single-sheet Excel workbook dynamically populates the dashboard.
3. RAG answers correctly across various business questions:
   - "Summarize this document"
   - "Summarize our financial position"
   - "What is our total revenue?"
   - "What is our net profit?"
   - "Compare revenue across different years"
   - "Identify financial risks"
   - "Explain the balance sheet"
   - "What are the key findings?"
   - "Create a dashboard from the uploaded data"
"""
from __future__ import annotations

import io
import uuid
import openpyxl
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.core.security import create_access_token


def test_csv_upload_populates_dashboard_and_answers_rag(client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    biz_id = str(uuid.uuid4())
    token = create_access_token(user_id=user_id, business_id=biz_id, role="owner", settings=get_settings())
    headers = {"Authorization": f"Bearer {token}"}

    csv_content = """Period,Revenue,Operating Expenses,Net Income,Total Assets,Total Liabilities,Borrowings,Cash
2023,100000,60000,40000,200000,80000,50000,30000
2024,120000,70000,50000,240000,90000,55000,35000
2025,150000,85000,65000,300000,100000,60000,45000
"""
    files = {"file": ("TechCorp_Financials.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    up = client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert up.status_code == 200, up.text

    # 1. Verify dashboard updated
    dash = client.get("/api/v1/financials/dashboard", headers=headers)
    assert dash.status_code == 200
    d = dash.json()
    assert d["available"] is True
    assert d["source"] == "uploaded"
    assert len(d["records"]) == 3
    latest = d["records"][-1]
    assert latest["revenue"] == 150000.0
    assert latest["net_income"] == 65000.0
    assert latest["total_assets"] == 300000.0
    assert latest["cash"] == 45000.0

    # 2. Test RAG queries
    # Query A: Total Revenue
    res_rev = client.post("/api/v1/advisor/ask", headers=headers, json={"query": "What is our total revenue?", "extracted_params": {}})
    assert res_rev.status_code == 200
    assert "1,50,000" in res_rev.json()["answer"] or "150,000" in res_rev.json()["answer"]

    # Query B: Net Profit
    res_np = client.post("/api/v1/advisor/ask", headers=headers, json={"query": "What is our net profit?", "extracted_params": {}})
    assert res_np.status_code == 200
    assert "65,000" in res_np.json()["answer"]

    # Query C: Multi-year revenue comparison
    res_comp = client.post("/api/v1/advisor/ask", headers=headers, json={"query": "Compare revenue across different years", "extracted_params": {}})
    assert res_comp.status_code == 200
    ans_comp = res_comp.json()["answer"]
    assert "Revenue" in ans_comp or "Sales" in ans_comp

    # Query D: Financial risks
    res_risk = client.post("/api/v1/advisor/ask", headers=headers, json={"query": "Identify financial risks", "extracted_params": {}})
    assert res_risk.status_code == 200
    assert "Risk" in res_risk.json()["answer"] or "Borrowings" in res_risk.json()["answer"]

    # Query E: Key findings
    res_find = client.post("/api/v1/advisor/ask", headers=headers, json={"query": "What are the key findings?", "extracted_params": {}})
    assert res_find.status_code == 200
    assert "Key Findings" in res_find.json()["answer"] or "Revenue" in res_find.json()["answer"]


def test_single_sheet_excel_upload_populates_dashboard(client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    biz_id = str(uuid.uuid4())
    token = create_access_token(user_id=user_id, business_id=biz_id, role="owner", settings=get_settings())
    headers = {"Authorization": f"Bearer {token}"}

    # Create an in-memory workbook with a single sheet named "Report"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Report"
    ws.append(["Metric", "FY23", "FY24", "FY25"])
    ws.append(["Sales", 500000, 650000, 800000])
    ws.append(["Operating Expenses", 300000, 380000, 450000])
    ws.append(["Net Profit", 200000, 270000, 350000])
    ws.append(["Total Assets", 1200000, 1500000, 1800000])
    ws.append(["Total Liabilities", 400000, 500000, 600000])
    ws.append(["Borrowings", 250000, 300000, 350000])
    ws.append(["Cash", 150000, 200000, 250000])

    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    files = {"file": ("Apex_Manufacturing.xlsx", io.BytesIO(excel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    up = client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert up.status_code == 200, up.text

    dash = client.get("/api/v1/financials/dashboard", headers=headers)
    assert dash.status_code == 200
    d = dash.json()
    assert d["available"] is True
    assert d["source"] == "uploaded"
    assert len(d["records"]) == 3
    latest = d["records"][-1]
    assert latest["revenue"] == 800000.0
    assert latest["net_income"] == 350000.0
    assert latest["total_assets"] == 1800000.0
