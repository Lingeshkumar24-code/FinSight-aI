from __future__ import annotations

from dataclasses import dataclass

from app.rag.vectorstore import ScoredChunk, VectorStore


@dataclass
class RetrievedContext:
    combined_text: str
    citations: list[str]
    scored_chunks: list[ScoredChunk]


class Retriever:
    def __init__(self, store: VectorStore, min_score: float = 0.05) -> None:
        self.store = store
        self.min_score = min_score

    def retrieve(self, query: str, top_k: int = 4) -> RetrievedContext:
        hits = [
            h
            for h in self.store.similarity_search(query, top_k=top_k)
            if h.score >= self.min_score
        ]
        combined = "\n\n---\n\n".join(h.chunk.text for h in hits)
        # De-duplicate citations: same source+chunk_index referenced once only.
        seen: set[str] = set()
        citations: list[str] = []
        for h in hits:
            label = f"{h.chunk.source} (chunk {h.chunk.metadata.get('chunk_index', '?')})"
            if label not in seen:
                seen.add(label)
                citations.append(label)
        return RetrievedContext(combined_text=combined, citations=citations, scored_chunks=hits)
