import threading
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables before other imports that may depend on them
root_dir = Path(__file__).parent.parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from lib.process_request import process_request  # noqa: E402
from modal_services import app as modal_app  # noqa: E402
from schemas import MessageData  # noqa: E402
from utils.db_client import close_db, init_db  # noqa: E402

# Global event to signal when Modal app is ready
modal_ready = threading.Event()
modal_context = None


def run_modal_app():
    """Run Modal app in a separate thread."""
    global modal_context
    modal_context = modal_app.run()
    modal_context.__enter__()
    modal_ready.set()
    try:
        # Keep the context alive
        while True:
            threading.Event().wait(timeout=1)
    except KeyboardInterrupt:
        pass
    finally:
        modal_context.__exit__(None, None, None)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Start Modal app in background thread
    modal_thread = threading.Thread(target=run_modal_app, daemon=True)
    modal_thread.start()
    # Wait for Modal app to be ready
    modal_ready.wait()

    await init_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)


@app.get("/search")
def search(q: str):
    return {"status": "ok", "uv_worker": True, "query": q}


@app.post("/chat")
async def chat(request: MessageData):
    notebook_id = request.notebook_id
    assistant_message_id = request.assistant_message_id
    content = request.content
    user_message_id = request.user_message_id
    encryption_type = request.encryption_type
    encryption_key = request.encryption_key

    async def generate():
        """Generator function that yields status updates in SSE format."""
        try:
            async for status in process_request(
                notebook_id,
                assistant_message_id,
                content,
                user_message_id,
                encryption_type,
                encryption_key,
            ):
                # Send status in SSE format: "data: status\n\n"
                yield f"data: {status}\n\n"
        except Exception as e:
            # Log error but don't send "error" as status - let exception propagate
            # The frontend will handle the error via onError callback
            print(f"Error in generate(): {e}")
            raise e

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
