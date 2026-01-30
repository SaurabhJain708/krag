from langchain_text_splitters import RecursiveCharacterTextSplitter


def split_mixed_content(text: str, chunk_size: int = 300, chunk_overlap: int = 0):
    # We define a list of separators. The splitter checks them in order.
    # If a chunk is too big, it moves to the next separator.
    # We prioritize Markdown breaks (\n\n) and HTML tag boundaries (>).
    separators = [
        "\n\n",  # 1. Try to split by paragraph
        "\n",  # 2. Try to split by line
        r"<img[^>]*/>",  # 3. Match complete img tags to avoid splitting them mid-tag (regex)
        "<<<",  # 4. SAFETY NET: Split BEFORE a tag starts (pushes tag to next chunk)
        ">>>",  # 5. Split AFTER a tag ends
        " ",  # 6. Split by words
        "",  # 7. Last resort: split characters
    ]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=separators,
        is_separator_regex=True,  # Enable regex to match complete img tags
        keep_separator=True,  # IMPORTANT: Keeps the "<<<" in the text
    )

    return splitter.split_text(text)
