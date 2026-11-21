from __future__ import annotations

import time
import httpx

from .base import CompletionRequest, CompletionResponse, LLMProvider, ProviderError


_FALLBACK_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]


class GroqProvider(LLMProvider):
    """Groq provides lightning-fast LLM inference via an OpenAI-compatible
    chat completions API. Used as a high-speed provider option."""

    name = "groq"

    def __init__(
        self,
        api_key: str,
        model: str = "openai/gpt-oss-120b",
        timeout: float = 30.0,
    ) -> None:
        self.api_key = (api_key or "").strip()
        self.model = (model or "openai/gpt-oss-120b").strip()
        self.timeout = timeout
        self._base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def complete(self, request: CompletionRequest) -> CompletionResponse:
        messages = []
        if request.system:
            messages.append({"role": "system", "content": request.system})
        messages.append({"role": "user", "content": request.prompt})

        # Models to attempt in order
        models_to_try = [self.model] + [m for m in _FALLBACK_MODELS if m != self.model]
        started = time.perf_counter()
        last_error: Exception | None = None

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for model_name in models_to_try:
                try:
                    resp = await client.post(
                        self._base_url,
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json={
                            "model": model_name,
                            "messages": messages,
                            "temperature": request.temperature,
                            "max_tokens": request.max_tokens,
                        },
                    )
                    # If 400/404 model not found or 429 rate limit, try next fallback model on Groq
                    if resp.status_code in (400, 404, 429) and ("model" in resp.text.lower() or "rate" in resp.text.lower()):
                        continue

                    resp.raise_for_status()
                    data = resp.json()
                    text = data["choices"][0]["message"].get("content")
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
                    if exc.response.status_code in (400, 404, 429) and ("model" in exc.response.text.lower() or "rate" in exc.response.text.lower()):
                        last_error = exc
                        continue
                    last_error = exc
                    break
                except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
                    last_error = exc
                    continue

        raise ProviderError(f"Groq provider failed: {last_error or 'all models returned 404'}")
