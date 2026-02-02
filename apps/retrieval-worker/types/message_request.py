from typing import Literal

from pydantic import BaseModel, Field


class MessageData(BaseModel):
    user_id: str
    notebook_id: str
    message_id: str
    content: str = Field(..., min_length=1)
    role: Literal["user"]

    class Config:
        extra = "forbid"
