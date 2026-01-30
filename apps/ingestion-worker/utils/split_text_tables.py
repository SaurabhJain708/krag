from types.index import SplitContent

from markdown_it import MarkdownIt


def extract_tables_and_text(text: str) -> list[SplitContent]:
    # Use CommonMark preset and explicitly enable table support
    md = MarkdownIt("commonmark").enable("table")
    tokens = md.parse(text)

    # 1. Extract and Sort Ranges
    # We filter for table_open and ensure the map exists.
    # We sort ASCENDING (top to bottom) to process the file linearly.
    ranges = [t.map for t in tokens if t.type == "table_open" and t.map]
    ranges.sort(key=lambda x: x[0])

    lines = text.split("\n")
    results: list[SplitContent] = []

    current_line_idx = 0

    for start, end in ranges:
        # --- Handle Text BEFORE Table ---
        # If there is a gap between the current pointer and the table start,
        # that gap is a text block.
        if start > current_line_idx:
            text_content = "\n".join(lines[current_line_idx:start])

            # Optional: removing empty strings if you don't want 'blank' text blocks
            if text_content.strip():
                results.append({"type": "text", "content": text_content})

        # --- Handle Table ---
        # Markdown-it 'end' is exclusive, so it works perfectly for slicing.
        table_content = "\n".join(lines[start:end])
        results.append({"type": "table", "content": table_content})

        # Move pointer to the end of this table
        current_line_idx = end

    # --- Handle Remaining Text ---
    # Capture any text after the last table
    if current_line_idx < len(lines):
        remaining_text = "\n".join(lines[current_line_idx:])
        if remaining_text.strip():
            results.append({"type": "text", "content": remaining_text})

    return results
