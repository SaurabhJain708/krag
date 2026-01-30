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
) -> list[int]:
    """
    Extract numeric IDs from markers of the form <<<123>>> or <<</123>>> in the content.
    Returns a sorted list of unique integer IDs.
    """
    child_ids = {int(m.group(1)) for m in re.finditer(r"<<</?(\d+)>>>", content)}
    parent_ids = [child_parent_mapping[str(child_id)] for child_id in child_ids]
    return parent_ids
