from pydantic import BaseModel, Field

from .chunks import ParentChunk


class LLMOptimizedQuery(BaseModel):

    optimized_query: str = Field(
        ...,
        description="The fully de-contextualized, specific question optimized for vector search.",
    )
    keywords: list[str] = Field(
        ..., description="Top 3-5 unique technical keywords for hybrid search (BM25)."
    )


class OptimizedQuery(LLMOptimizedQuery):

    id: str | None = Field(
        default=None,
        description="Locally assigned identifier for this optimized query.",
    )
    embeddings: list[float] | None = Field(
        default=None,
        description="Embeddings for the optimized query.",
    )
    parentIds: list[str] | None = Field(
        default=None,
        description="Parent IDs for the optimized query.",
    )
    # Parent chunks are populated later in the pipeline; they are not
    # present in the initial LLM output and therefore must be optional here.
    parentChunks: list[ParentChunk] | None = Field(
        default=None,
        description="Parent chunks attached after retrieval.",
    )


class QueryOptimizer(BaseModel):

    reasoning: str = Field(
        ...,
        alias="_reasoning",
        description="Explain why you are splitting or combining the queries.",
    )
    queries: list[LLMOptimizedQuery] = Field(
        ...,
        description="List of optimized query + keyword objects.",
    )
