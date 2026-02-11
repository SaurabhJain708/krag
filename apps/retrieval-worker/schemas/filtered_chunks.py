from pydantic import BaseModel, Field


class FilteredParentChunk(BaseModel):
    """Simplified parent chunk structure for filtered results."""

    content: str = Field(..., description="The content of the parent chunk.")
    sourceId: str = Field(..., description="The source ID of the parent chunk.")


class FilteredQueryResult(BaseModel):
    """Result structure for filtered parent chunks per optimized query."""

    optimized_query: str = Field(
        ...,
        description="The optimized query string.",
    )
    parent_chunks: list[FilteredParentChunk] = Field(
        ...,
        description="List of filtered parent chunks for this query.",
    )
