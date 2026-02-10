from pydantic import BaseModel


class BaseChunk(BaseModel):
    """Base chunk structure returned from database queries."""

    id: str
    content: str
    parentIds: list[str]


class ParentChunk(BaseModel):
    """Parent chunk structure returned from database queries."""

    id: str
    content: str
    cleanContent: str
    sourceId: str
