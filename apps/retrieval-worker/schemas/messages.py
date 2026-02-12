from pydantic import BaseModel, Field


class MessageData(BaseModel):
    notebook_id: str
    assistant_message_id: str
    user_message_id: str
    content: str = Field(..., min_length=1)
    encryption_type: str | None = None
    encryption_key: str | None = None

    class Config:
        extra = "forbid"
