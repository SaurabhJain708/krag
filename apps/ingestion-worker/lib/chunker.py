from utils.create_db_chunks import create_db_chunks
from utils.parent_child_chunks import create_parent_child_chunks
from utils.split_text_tables import extract_tables_and_text


def process_chunks(text: str):
    text_split_by_tables = extract_tables_and_text(text)

    db_chunks = create_db_chunks(text_split_by_tables)

    parent_chunks, child_chunks = create_parent_child_chunks(db_chunks)

    return db_chunks, parent_chunks, child_chunks
