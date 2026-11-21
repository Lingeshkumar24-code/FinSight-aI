from __future__ import annotations

import time

import httpx

from .base import CompletionRequest, CompletionResponse, LLMProvider, ProviderError


_OPENROUTER_FALLBACK_MODELS = [
    "baidu/ernie-5.5-flash-preview:free",
    "recursive/flint-v1.0:free",
    "google/gemma-4-31b-it:free",
    "inclusionai/ling-3.2-flash:free",
    "deepseek/deepseek-chat",
]


class OpenRouterProvider(LLMProvider):
    """OpenRouter exposes an OpenAI-compatible chat completions API that
    fans out to many underlying models — used here as the "catch-all"
    fallback provider."""

    name = "openrouter"

    def __init__(
        self,
        api_key: str,
        model: str = "baidu/ernie-5.5-flash-preview:free",
        timeout: float = 25.0,
    ) -> None:
        self.api_key = (api_key or "").strip()
        self.model = (model or "baidu/ernie-5.5-flash-preview:free").strip()
        self.timeout = timeout
        self._base_url = "https://openrouter.ai/api/v1/chat/completions"

    async def complete(self, request: CompletionRequest) -> CompletionResponse:
        messages = []
        if request.system:
            messages.append({"role": "system", "content": request.system})
        messages.append({"role": "user", "content": request.prompt})

        models_to_try = [self.model] + [m for m in _OPENROUTER_FALLBACK_MODELS if m != self.model]
        started = time.perf_counter()
        last_error: Exception | None = None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://finsight-frontend-2w1v.onrender.com",
            "X-Title": "FinSight AI",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for model_name in models_to_try:
                try:
                    resp = await client.post(
                        self._base_url,
                        headers=headers,
                        json={
                            "model": model_name,
                            "messages": messages,
                            "temperature": request.temperature,
                            "max_tokens": request.max_tokens,
                        },
                    )
                    if resp.status_code in (400, 404, 429) or "rate" in resp.text.lower():
                        continue

                    resp.raise_for_status()
                    data = resp.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content")
                    usage = data.get("usage", {})

                    if not isinstance(text, str) or not text.strip():
                        continue

                    latency_ms = (time.perf_counter() - started) * 1000
                    return CompletionResponse(
                        text=text,
                        provider=self.name,
                        model=model_name,
                        latency_ms=latency_ms,
                        input_tokens=usage.get("prompt_tokens"),
                        output_tokens=usage.get("completion_tokens"),
                    )
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code in (400, 404, 429):
                        last_error = exc
                        continue
                    last_error = exc
                    break
                except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
                    last_error = exc
                    continue

        raise ProviderError(f"OpenRouter provider failed: {last_error or 'all models exhausted'}")
