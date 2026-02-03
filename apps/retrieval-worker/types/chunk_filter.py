
from pydantic import BaseModel, Field


class SelectedChunkIds(BaseModel):
    """
    Response model for LLM chunk filtering.

    Represents the selected chunk IDs that are semantically relevant to the user's query.
    The LLM returns this structure after analyzing candidate chunks and identifying
    which ones contain or point to the answer in their surrounding context.
    """

    selected_ids: list[str] = Field(
        ...,
        description="List of chunk IDs that are relevant to the user's query. Each ID must be a string.",
        min_length=0,
    )
