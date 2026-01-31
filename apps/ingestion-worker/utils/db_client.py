from generated.db import Prisma  # Adjust import based on your folder structure

# 1. Create the global singleton instance
db = Prisma()


# 2. Connection management functions
async def init_db():
    """Connect to the database."""
    if not db.is_connected():
        await db.connect()
        print("🔌 Database connected", flush=True)


async def close_db():
    """Disconnect from the database."""
    if db.is_connected():
        await db.disconnect()
        print("🔌 Database disconnected", flush=True)


def get_db():
    """Return the singleton instance."""
    return db
