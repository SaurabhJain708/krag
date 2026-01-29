import json
import os
from pathlib import Path

import redis
from dotenv import load_dotenv
from lib.pdf_parser import parse_pdf


def main():
    # Load environment variables from .env in the same folder as this file
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)

    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL environment variable is not set")

    r = redis.from_url(redis_url, decode_responses=True)

    queue_name = "file_processing_queue"
    print(f"🐍 Python Worker connected. Listening on '{queue_name}'...")

    try:
        while True:
            task = r.blpop(queue_name, timeout=0)

            if task:
                _, raw_message = task
                message = json.loads(raw_message)
                parse_pdf(message["base64"], message["id"], message["user_id"])

    except KeyboardInterrupt:
        print("Worker stopping...")


if __name__ == "__main__":
    main()
