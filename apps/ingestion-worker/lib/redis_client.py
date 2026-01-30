import os

import redis


def _create_redis_client():
    """Create a Redis client with connection pooling."""
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL environment variable is not set")

    return redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_keepalive=True,
        health_check_interval=30,
        retry_on_timeout=True,
    )


# Singleton Redis client instance - can be imported directly
# Usage: from lib.redis_client import redis_client
redis_client = None


def _initialize_client():
    """Initialize the Redis client if not already initialized."""
    global redis_client
    if redis_client is None:
        redis_client = _create_redis_client()
        print("🔌 Redis client initialized", flush=True)
    return redis_client


def close_redis_client():
    """Close the Redis connection and reset the singleton."""
    global redis_client
    if redis_client:
        try:
            redis_client.close()
            print("🔌 Redis connection closed", flush=True)
        except Exception:
            pass  # Ignore errors during cleanup
        redis_client = None


def reset_redis_client():
    """Reset the Redis client (useful for reconnection)."""
    close_redis_client()
    _initialize_client()


def get_redis_client():
    """Get the Redis client instance (lazy initialization)."""
    return _initialize_client()


# Allowed FileProcessingStatus values (from Prisma schema)
ALLOWED_STATUSES = {
    "uploading",
    "queued",
    "processing",
    "starting",
    "vision",
    "extracting",
    "images",
    "chunking",
    "completed",
    "failed",
}


def update_source_status(source_id: str, status: str) -> bool:
    """
    Update the processing status of a source in Redis.

    Args:
        source_id: The ID of the source
        status: One of the allowed FileProcessingStatus values

    Returns:
        True if successful, False otherwise

    Raises:
        ValueError: If status is not in the allowed values
    """
    if status not in ALLOWED_STATUSES:
        raise ValueError(
            f"Invalid status '{status}'. Allowed values: {', '.join(sorted(ALLOWED_STATUSES))}"
        )

    client = get_redis_client()
    key = f"source:{source_id}"

    try:
        client.set(key, status)
        print(f"📝 Updated source {source_id} status to '{status}'", flush=True)
        return True
    except Exception as e:
        print(f"❌ Failed to update source status: {e}", flush=True)
        return False
