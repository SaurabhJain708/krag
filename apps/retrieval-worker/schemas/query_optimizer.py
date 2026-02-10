from pydantic import BaseModel, Field


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


class QueryOptimizer(BaseModel):

    _reasoning: str = Field(
        ...,
        description="Explain why you are splitting or combining the queries.",
    )
    queries: list[LLMOptimizedQuery] = Field(
        ...,
        description="List of optimized query + keyword objects.",
    )
