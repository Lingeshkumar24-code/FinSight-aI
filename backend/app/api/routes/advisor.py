from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.graph import build_graph
from app.api.deps import get_llm_router, get_retriever
from app.core.security import TokenPayload, get_current_user
from app.llm.router import LLMRouter
from app.models.schemas import AdvisorRequest, AdvisorResponse
from app.rag.retriever import Retriever

router = APIRouter(prefix="/advisor", tags=["advisor"])


@router.post("/ask", response_model=AdvisorResponse)
async def ask(
    payload: AdvisorRequest,
    _user: TokenPayload = Depends(get_current_user),
    retriever: Retriever = Depends(get_retriever),
    llm_router: LLMRouter | None = Depends(get_llm_router),
) -> AdvisorResponse:
    graph = build_graph(retriever=retriever, llm_router=llm_router)
    final_state = await graph.ainvoke(
        {"user_query": payload.query, "extracted_params": payload.extracted_params}
    )
    return AdvisorResponse(
        intent=final_state.get("intent", "general_rag"),
        route=final_state.get("route", ""),
        is_valid=final_state.get("is_valid", False),
        tool_result=final_state.get("tool_result", {}),
        citations=final_state.get("rag_citations", []),
        validation_notes=final_state.get("validation_notes", []),
        answer=final_state.get("final_response", ""),
    )
