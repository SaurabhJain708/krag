import re
import uuid

from schemas import TextWithCitations


def renumber_citations(text: str) -> str:
    """Renumber citations based on their appearance order in the text."""
    # Updated to match span elements with data-citation attribute
    uuid_pattern = r'<span[^>]*data-citation="true"[^>]*>\[([a-f0-9-]{36})\]</span>'
    uuid_to_order = {}
    order = 1

    for match in re.finditer(uuid_pattern, text):
        found_uuid = match.group(1)
        if found_uuid not in uuid_to_order:
            uuid_to_order[found_uuid] = order
            order += 1

    for found_uuid, citation_num in uuid_to_order.items():
        text = text.replace(f"[{found_uuid}]", f"[{citation_num}]")

    return text


def replace_with_citation(text_with_citations: TextWithCitations) -> str:
    citations = text_with_citations.citations
    final_response = text_with_citations.text

    # Only process citations that actually appear in the text
    for citation in citations:
        pattern = rf"\[CITATION:\s*{re.escape(citation.citation)}\s*\]"

        # Check if this citation marker exists in the text
        if not re.search(pattern, final_response):
            continue  # Skip citations that don't appear in the text

        summary_escaped = citation.brief_summary.replace('"', "&quot;").replace(
            "'", "&apos;"
        )

        def replace_with_citation(
            _match,
            source_id=citation.sourceId,
            chunk_id=citation.chunkId,
            summary=summary_escaped,
        ):
            citation_uuid = str(uuid.uuid4())
            # Use span with data attributes instead of custom citation tag
            # This works with Streamdown's rehype-sanitize which strips custom HTML tags
            return f'<span data-citation="true" data-source-id="{source_id}" data-chunk-id="{chunk_id}" data-summary="{summary}">[{citation_uuid}]</span>'

        final_response = re.sub(pattern, replace_with_citation, final_response)

    return final_response


def clean_response(text: str) -> str:
    """
    Remove backslashes and forward slashes that appear directly before span tags,
    e.g. '\\<span', '/<span', '\\</span', or '/</span', without touching other
    slashes or backslashes elsewhere.
    """
    # Remove any combination of backslashes and forward slashes before opening span tags
    text = re.sub(r"[\\/]+(<span\b)", r"\1", text)
    # Remove any combination of backslashes and forward slashes before closing span tags
    text = re.sub(r"[\\/]+(</span>)", r"\1", text)
    return text


def finalise_response(text_with_citations: TextWithCitations) -> str:
    final_response = replace_with_citation(text_with_citations)
    final_response = renumber_citations(final_response)
    final_response = clean_response(final_response)
    return final_response
