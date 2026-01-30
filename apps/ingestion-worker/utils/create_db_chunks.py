from types.index import Chunk, SplitContent

from utils.chunk_splitter import split_mixed_content


def create_db_chunks(split_content: list[SplitContent]) -> list[Chunk]:
    chunks: list[Chunk] = []
    chunk_id = 0

    # Split the text into chunks
    print(f"[LOG] Processing {len(split_content)} split_content items into chunks...")
    for content in split_content:
        if content["type"] == "text":
            chunked_texts = split_mixed_content(content["content"])
            print(f"[LOG] Text content split into {len(chunked_texts)} chunks")
            for chunk in chunked_texts:
                chunks.append({"type": "text", "content": chunk, "id": chunk_id})
                chunk_id += 1
        else:
            chunks.append(
                {"type": "table", "content": content["content"], "id": chunk_id}
            )
            chunk_id += 1

    return chunks
