from typing import TypedDict

from pydantic import BaseModel


class MessageDict(TypedDict):
    content: str
    id: str


class Context(BaseModel):
    summaries: list[str]
    messages: list[MessageDict]
