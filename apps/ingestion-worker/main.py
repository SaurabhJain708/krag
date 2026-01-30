import json
import os
import sys
import traceback
from pathlib import Path

import redis
from dotenv import load_dotenv
from lib.pdf_parser import parse_pdf
from modal_service import app


def main():
    # Load environment variables from .env in the same folder as this file
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)

    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL environment variable is not set")

    r = redis.from_url(redis_url, decode_responses=True)

    queue_name = "file_processing_queue"
    print(f"🐍 Python Worker connected. Listening on '{queue_name}'...", flush=True)

    try:
        while True:
            print(f"⏳ Waiting for tasks on '{queue_name}'...", flush=True)
            task = r.blpop(queue_name, timeout=0)

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
                    print(f"❌ Failed to parse message JSON: {e}", flush=True)
                    print(f"   Raw message: {raw_message[:200]}...", flush=True)
                except Exception as e:
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


if __name__ == "__main__":
    with app.run():
        main()
