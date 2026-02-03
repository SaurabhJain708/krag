
from pydantic import BaseModel, ConfigDict, Field


class BaseChunk(BaseModel):
    """Base chunk structure returned from database queries."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    content: str
    parentIds: list[str] = Field(..., alias="parentIds")
