
from pydantic import BaseModel, Field


class QueryOptimizer(BaseModel):
    optimized_query: str = Field(
        ...,
        description="The fully de-contextualized, specific question optimized for vector search.",
    )
    keywords: list[str] = Field(
        ..., description="Top 3-5 unique technical keywords for hybrid search (BM25)."
    )
