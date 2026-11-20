"""
Builds an `LLMRouter` from application settings, ordering providers by
`LLM_PROVIDER_PRIORITY` and skipping any provider whose required
credential is missing (so a deployment with only an OpenAI key, say,
gets a one-provider router rather than a crash).
"""
from __future__ import annotations

from app.config import Settings
from app.llm.providers.base import LLMProvider
from app.llm.providers.groq_provider import GroqProvider
from app.llm.providers.openrouter_provider import OpenRouterProvider
from app.llm.router import LLMRouter


def _build_available_providers(settings: Settings) -> dict[str, LLMProvider]:
    available: dict[str, LLMProvider] = {}
    if settings.GROQ_API_KEY:
        available["groq"] = GroqProvider(settings.GROQ_API_KEY, model=settings.GROQ_MODEL)
    if settings.OPENROUTER_API_KEY:
        available["openrouter"] = OpenRouterProvider(
            settings.OPENROUTER_API_KEY, model=settings.OPENROUTER_MODEL
        )
    return available


def build_llm_router(settings: Settings) -> LLMRouter | None:
    available = _build_available_providers(settings)
    ordered = [
        available[name] for name in settings.LLM_PROVIDER_PRIORITY if name in available
    ]
    if not ordered:
        return None
    return LLMRouter(providers=ordered)
