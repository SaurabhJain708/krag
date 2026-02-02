from fastapi import FastAPI
from modal_services import Qwen2_5_7BAWQ
from pydantic import BaseModel

app = FastAPI()

# Initialize the Modal class instance
remote_llm = Qwen2_5_7BAWQ()


class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    max_tokens: int = 2048
    temperature: float = 0.1
    json_schema: str | None = None


class ChatResponse(BaseModel):
    response: str


@app.get("/search")
def search(q: str):
    return {"status": "ok", "uv_worker": True, "query": q}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint that uses the Qwen2.5-7B-AWQ model via Modal.

    Example request:
    {
        "messages": [
            {"role": "user", "content": "Hello, how are you?"}
        ],
        "max_tokens": 2048,
        "temperature": 0.1
    }
    """
    # Convert Pydantic models to dict format expected by the Modal method
    messages_dict = [
        {"role": msg.role, "content": msg.content} for msg in request.messages
    ]

    # Call the async Modal method
    response_text = await remote_llm.chat.aio(
        messages=messages_dict,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        json_schema=request.json_schema,
    )

    return ChatResponse(response=response_text)
