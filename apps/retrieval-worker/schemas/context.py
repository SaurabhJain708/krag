from typing import TypedDict

from pydantic import BaseModel


class MessageDict(TypedDict):
    role: str
    content: str
    id: str


class Context(BaseModel):
    summary: str
    messages: list[MessageDict]
