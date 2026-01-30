import json
import sys
import traceback
from pathlib import Path

import redis
from dotenv import load_dotenv
from lib.pdf_parser import parse_pdf
from lib.redis_client import (
    close_redis_client,
    get_redis_client,
    redis_client,
    reset_redis_client,
    update_source_status,
)
from modal_service import app
from schemas.index import FileProcessingStatus


def main():
    # Load environment variables from .env in the same folder as this file
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)

    # Ensure Redis client is initialized
    get_redis_client()

    queue_name = "file_processing_queue"
    print(f"🐍 Python Worker connected. Listening on '{queue_name}'...", flush=True)

    try:
        while True:
            print(f"⏳ Waiting for tasks on '{queue_name}'...", flush=True)
            try:
                task = redis_client.blpop(queue_name, timeout=0)
            except redis.ConnectionError as e:
                print(f"❌ Redis connection error: {e}. Reconnecting...", flush=True)
                reset_redis_client()
                continue
            except redis.TimeoutError:
                continue

            if task:
                _, raw_message = task
                try:
                    message = json.loads(raw_message)
                    file_id = message.get("id", "unknown")
                    user_id = message.get("user_id", "unknown")

                    print(
                        f"📥 Task received: file_id={file_id}, user_id={user_id}",
                        flush=True,
                    )
                    print(
                        f"🚀 Starting PDF processing for file {file_id}...", flush=True
                    )

                    parse_pdf(message["base64"], message["id"], message["user_id"])

                    print(f"✅ Successfully processed file {file_id}", flush=True)
                except json.JSONDecodeError as e:
                    update_source_status(file_id, FileProcessingStatus.failed.value)
                    print(f"❌ Failed to parse message JSON: {e}", flush=True)
                    print(f"   Raw message: {raw_message[:200]}...", flush=True)
                except Exception as e:
                    update_source_status(file_id, FileProcessingStatus.failed.value)
                    print(f"❌ Error processing task: {e}", flush=True)
                    print("   Traceback:", flush=True)
                    traceback.print_exc(file=sys.stdout)
                    sys.stdout.flush()

    except KeyboardInterrupt:
        print("🛑 Worker stopping...", flush=True)
    except Exception as e:
        print(f"💥 Fatal error in worker: {e}", flush=True)
        traceback.print_exc(file=sys.stdout)
        sys.stdout.flush()
        raise
    finally:
        # Cleanup Redis connection
        close_redis_client()


if __name__ == "__main__":
    with app.run():
        main()
