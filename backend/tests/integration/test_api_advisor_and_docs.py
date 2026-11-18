import io


def test_advisor_computes_budget_variance(client, auth_headers):
    resp = client.post(
        "/api/v1/advisor/ask",
        headers=auth_headers,
        json={
            "query": "Did we overspend our marketing budget this quarter?",
            "extracted_params": {
                "budget": {"marketing": 10000},
                "actual": {"marketing": 14000},
            },
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "budget_variance"
    assert body["is_valid"] is True
    assert "marketing" in body["tool_result"]["breaches"]


def test_advisor_missing_params_is_handled_gracefully(client, auth_headers):
    resp = client.post(
        "/api/v1/advisor/ask",
        headers=auth_headers,
        json={"query": "What's our WACC?"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_valid"] is False
    assert "missing" in body["answer"].lower()


def test_document_upload_then_advisor_uses_rag(client, auth_headers):
    file_content = (
        b"Our biggest Q3 operational risk was a single-vendor dependency "
        b"for packaging materials, which caused a two-week shipping delay."
    )
    upload_resp = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={"file": ("q3_notes.txt", io.BytesIO(file_content), "text/plain")},
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["chunks_indexed"] >= 1

    ask_resp = client.post(
        "/api/v1/advisor/ask",
        headers=auth_headers,
        json={"query": "Tell me about our vendor dependency situation."},
    )
    assert ask_resp.status_code == 200
    body = ask_resp.json()
    assert body["route"] == "rag:retrieve"
    assert any("q3_notes.txt" in c for c in body["citations"])


def test_document_upload_rejects_unsupported_type(client, auth_headers):
    resp = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={"file": ("report.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert resp.status_code == 415


def test_document_upload_rejects_empty_file(client, auth_headers):
    resp = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={"file": ("empty.txt", io.BytesIO(b"   "), "text/plain")},
    )
    assert resp.status_code == 422


def test_what_if_simulator_endpoint(client, auth_headers):
    resp = client.post(
        "/api/v1/simulator/what-if",
        headers=auth_headers,
        json={
            "starting_revenue": 20000,
            "starting_costs": 15000,
            "starting_cash": 10000,
            "levers": {"monthly_revenue_growth_pct": 3.0},
            "periods": 6,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["periods"]) == 6
    assert body["ending_cash"] > 10000


def test_report_generation_returns_pdf(client, auth_headers):
    resp = client.post(
        "/api/v1/reports/generate",
        headers=auth_headers,
        json={
            "business_name": "Acme Co",
            "period": "2026-Q3",
            "ratios": [{"name": "current_ratio", "value": 2.1, "interpretation": "healthy"}],
            "notes": "Overall healthy quarter.",
        },
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"
    assert len(resp.content) > 100
