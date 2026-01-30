import re
from uuid import uuid4

from schemas.index import Child_Chunks, Chunk, Finalised_chunk, Parent_Chunks
from utils.chunk_splitter import split_mixed_content
from utils.tools import extract_child_ids, extract_parent_ids


def create_parent_child_chunks(
    chunks: list[Chunk],
) -> list[Parent_Chunks, Child_Chunks]:
    combined_text_with_ids: list[Finalised_chunk] = []

    temp_text = ""

    # Combine the text into a single string with ids
    print(f"[LOG] Combining {len(chunks)} chunks with IDs...")
    for chunk in chunks:
        if chunk["type"] == "text":
            temp_text = (
                temp_text
                + f"<<<{chunk['id']}>>>"
                + chunk["content"]
                + f"<<</{chunk['id']}>>>"
            )
        if chunk["type"] == "table":
            if temp_text != "":
                combined_text_with_ids.append({"type": "text", "content": temp_text})
                temp_text = ""
            combined_text_with_ids.append(
                {
                    "type": "table",
                    "content": f"<<<{chunk['id']}>>>"
                    + chunk["content"]
                    + f"<<</{chunk['id']}>>>",
                }
            )

    # Handle remaining temp_text
    if temp_text != "":
        combined_text_with_ids.append({"type": "text", "content": temp_text})

    print(
        f"[LOG] Combined text with IDs: {len(combined_text_with_ids)} items (text: {sum(1 for c in combined_text_with_ids if c['type'] == 'text')}, table: {sum(1 for c in combined_text_with_ids if c['type'] == 'table')})"
    )

    parent_chunks: list[Parent_Chunks] = []
    child_chunks: list[Child_Chunks] = []

    # Split the text into parent chunks
    print(
        f"[LOG] Creating parent chunks from {len(combined_text_with_ids)} combined items..."
    )
    for chunk in combined_text_with_ids:
        if chunk["type"] == "text":
            content_array = split_mixed_content(
                chunk["content"], chunk_size=2000, chunk_overlap=200
            )
            print(f"[LOG] Text chunk split into {len(content_array)} parent chunks")
            for content in content_array:
                child_ids = extract_child_ids(content)
                parent_chunks.append(
                    {
                        "content": content,
                        "children_ids": child_ids,
                        "id": str(uuid4()),
                    }
                )
        else:
            child_ids = extract_child_ids(chunk["content"])
            print(
                f"[LOG] Table chunk has {len(child_ids)} child IDs: {child_ids[:5] if child_ids else 'none'}"
            )
            parent_chunks.append(
                {
                    "content": chunk["content"],
                    "children_ids": child_ids,
                    "id": str(uuid4()),
                }
            )

    print(f"[LOG] Total parent chunks created: {len(parent_chunks)}")

    child_parent_mapping: dict[str, list[str]] = {}

    # Create a mapping of child ids to parent ids
    print(
        f"[LOG] Building child_parent_mapping from {len(parent_chunks)} parent chunks..."
    )
    total_child_ids = 0
    for parent_chunk in parent_chunks:
        for child_id in parent_chunk["children_ids"]:
            total_child_ids += 1
            child_id_str = str(child_id)
            if child_id_str not in child_parent_mapping:
                child_parent_mapping[child_id_str] = []
            child_parent_mapping[child_id_str].append(parent_chunk["id"])

    print(
        f"[LOG] child_parent_mapping has {len(child_parent_mapping)} unique child IDs, {total_child_ids} total mappings"
    )

    # Split the text into child chunks
    print(
        f"[LOG] Creating child chunks from {len(combined_text_with_ids)} combined items..."
    )
    for chunk in combined_text_with_ids:
        if chunk["type"] == "text":
            content_array = split_mixed_content(
                chunk["content"], chunk_size=500, chunk_overlap=100
            )
            print(f"[LOG] Text chunk split into {len(content_array)} child chunks")
            for content in content_array:
                clean_content = re.sub(r"<<</?\d+>>>", "", content)
                parent_ids = extract_parent_ids(content, child_parent_mapping)
                child_chunks.append(
                    {
                        "content": clean_content,
                        "parent_ids": parent_ids,
                        "id": str(uuid4()),
                    }
                )
        else:
            clean_content = re.sub(r"<<</?\d+>>>", "", chunk["content"])
            parent_ids = extract_parent_ids(chunk["content"], child_parent_mapping)
            print(f"[LOG] Table chunk has {len(parent_ids)} parent IDs")
            child_chunks.append(
                {
                    "content": clean_content,
                    "parent_ids": parent_ids,
                    "id": str(uuid4()),
                }
            )

    print(f"[LOG] Total child chunks created: {len(child_chunks)}")

    return parent_chunks, child_chunks
