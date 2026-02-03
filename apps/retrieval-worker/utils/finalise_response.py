import re
import uuid
from types import TextWithCitations


def renumber_citations(text: str) -> str:
    """Renumber citations based on their appearance order in the text."""
    uuid_pattern = r"<citation[^>]*>\[([a-f0-9-]{36})\]</citation>"
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

    for citation in citations:
        exact_text_escaped = citation.exact_text.replace('"', "&quot;").replace(
            "'", "&apos;"
        )
        summary_escaped = citation.brief_summary.replace('"', "&quot;").replace(
            "'", "&apos;"
        )

        pattern = rf"\[CITATION:\s*{re.escape(citation.citation)}\s*\]"

        def replace_with_citation(
            _match,
            exact_text=exact_text_escaped,
            source_id=citation.sourceId,
            chunk_id=citation.chunkId,
            summary=summary_escaped,
        ):
            citation_uuid = str(uuid.uuid4())
            return f'<citation exactText="{exact_text}" sourceId="{source_id}" chunkId="{chunk_id}" summary="{summary}">[{citation_uuid}]</citation>'

        final_response = re.sub(pattern, replace_with_citation, final_response)

    return final_response


def finalise_response(text_with_citations: TextWithCitations) -> str:
    final_response = replace_with_citation(text_with_citations)
    final_response = renumber_citations(final_response)
    return final_response
