from __future__ import annotations

import re
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import build_graph
from app.api.deps import get_llm_router, get_retriever
from app.core.security import TokenPayload, get_current_user
from app.db.models import Document
from app.db.session import get_session
from app.llm.router import LLMRouter
from app.models.schemas import AdvisorRequest, AdvisorResponse
from app.rag.retriever import Retriever
from app.services.financial_context import build_context

router = APIRouter(prefix="/advisor", tags=["advisor"])


@router.post("/ask", response_model=AdvisorResponse)
async def ask(
    payload: AdvisorRequest,
    user: TokenPayload = Depends(get_current_user),
    retriever: Retriever = Depends(get_retriever),
    llm_router: LLMRouter | None = Depends(get_llm_router),
    session: AsyncSession = Depends(get_session),
) -> AdvisorResponse:
    # Give every answer the owner's ledger snapshot (latest revenue, cash,
    # budgets, transactions), so "how does this investment fit my business?"
    # is answered from real recorded data and not just the uploaded docs.
    extracted = dict(payload.extracted_params)
    try:
        context = await build_context(session, user.business_id)
        extracted.setdefault("_business_context", context.prompt_context)
    except Exception:  # never fail an advisory answer because context is unavailable
        pass

    # Fetch user's workspace documents to resolve target document scope
    target_doc_id = payload.document_id
    try:
        user_docs = (
            await session.execute(
                select(Document)
                .where(Document.business_id == user.business_id)
                .order_by(Document.created_at.desc())
            )
        ).scalars().all()
    except Exception:
        user_docs = []

    # If no explicit document_id is passed, determine target document
    q_lower = payload.query.lower()
    is_comparative = any(term in q_lower for term in ("compare", "comparison", "inconsistency", "inconsistencies", "difference between", "versus", "vs"))

    if not target_doc_id and user_docs and not is_comparative:
        # Check if query names a specific document or company
        for d in user_docs:
            clean_stem = re.sub(r"\.[^.]+$", "", d.filename).lower()
            tokens = [t for t in re.split(r"[\s_-]+", clean_stem) if len(t) > 2]
            if clean_stem in q_lower or any(t in q_lower for t in tokens):
                target_doc_id = d.id
                break
        # If still not matched and query is a single-document inquiry, default to latest document
        if not target_doc_id and user_docs:
            single_doc_signals = ("summarize", "summary", "this document", "our", "total revenue", "net profit", "balance sheet", "assets", "debt", "cash flow", "ratio", "margin")
            if any(sig in q_lower for sig in single_doc_signals) or len(user_docs) == 1:
                target_doc_id = user_docs[0].id

    # Scope retrieval to the authenticated tenant and target document if identified
    meta_filter = {"business_id": user.business_id}
    if target_doc_id:
        meta_filter["document_id"] = target_doc_id
        extracted["_target_document_id"] = target_doc_id

    retriever = Retriever(
        retriever.store,
        min_score=retriever.min_score,
        metadata_filter=meta_filter,
    )
    graph = build_graph(retriever=retriever, llm_router=llm_router)
    final_state = await graph.ainvoke(
        {"user_query": payload.query, "extracted_params": extracted}
    )
    return AdvisorResponse(
        intent=final_state.get("intent", "general_rag"),
        route=final_state.get("route", ""),
        is_valid=final_state.get("is_valid", False),
        tool_result=final_state.get("tool_result", {}),
        citations=final_state.get("rag_citations", []),
        validation_notes=final_state.get("validation_notes", []),
        answer=final_state.get("final_response") or "",
    )
