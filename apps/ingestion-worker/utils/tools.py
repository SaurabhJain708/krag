import re


def extract_child_ids(content: str) -> list[int]:
    """
    Extract numeric IDs from markers of the form <<<123>>> or <<</123>>> in the content.
    Returns a sorted list of unique integer IDs.
    """
    ids = {int(m.group(1)) for m in re.finditer(r"<<</?(\d+)>>>", content)}
    return sorted(ids)


def extract_parent_ids(
    content: str, child_parent_mapping: dict[str, list[str]]
) -> list[str]:
    """
    Extract numeric child IDs from markers of the form <<<123>>> or <<</123>>> in the content.
    For each child ID found, look up which parent chunks contain it.
    Returns a flat list of unique parent chunk UUIDs (strings).
    """
    child_ids = {int(m.group(1)) for m in re.finditer(r"<<</?(\d+)>>>", content)}
    # Flatten: collect all parent IDs from all child IDs into a single flat list
    parent_ids = []
    for child_id in child_ids:
        parent_ids.extend(child_parent_mapping[str(child_id)])
    # Remove duplicates while preserving order
    return list(dict.fromkeys(parent_ids))
