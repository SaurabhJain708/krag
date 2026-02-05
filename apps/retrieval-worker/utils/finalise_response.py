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

        exact_text_escaped = citation.exact_text.replace('"', "&quot;").replace(
            "'", "&apos;"
        )
        summary_escaped = citation.brief_summary.replace('"', "&quot;").replace(
            "'", "&apos;"
        )

        def replace_with_citation(
            _match,
            exact_text=exact_text_escaped,
            source_id=citation.sourceId,
            chunk_id=citation.chunkId,
            summary=summary_escaped,
        ):
            citation_uuid = str(uuid.uuid4())
            # Use span with data attributes instead of custom citation tag
            # This works with Streamdown's rehype-sanitize which strips custom HTML tags
            return f'<span data-citation="true" data-exact-text="{exact_text}" data-source-id="{source_id}" data-chunk-id="{chunk_id}" data-summary="{summary}">[{citation_uuid}]</span>'

        final_response = re.sub(pattern, replace_with_citation, final_response)

    return final_response


def finalise_response(text_with_citations: TextWithCitations) -> str:
    final_response = replace_with_citation(text_with_citations)
    final_response = renumber_citations(final_response)
    return final_response
