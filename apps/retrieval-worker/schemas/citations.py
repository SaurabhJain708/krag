from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Represents a single citation reference with source and chunk information.

    This model stores the extracted text snippet along with metadata about where
    it originated from, including the source document ID and the specific chunk ID
    within that source. The citation number corresponds to the [CITATION: N] markers
    embedded in the main text.
    """

    citation: str = Field(
        ...,
        description="The citation number as a string (e.g., '1', '2', '3'). This "
        "corresponds to the [CITATION: N] marker in the main text where this citation "
        "is referenced.",
    )
    sourceId: str = Field(
        ...,
        description="Unique identifier for the source document where this citation "
        "originated. Typically a UUID that references the original document or data "
        "source in the system.",
    )
    chunkId: str = Field(
        ...,
        description="Unique identifier for the specific chunk within the source "
        "document. This allows precise tracking of which portion of the source "
        "document was used for this citation.",
    )
    exact_text: str = Field(
        ...,
        description="The exact text content from the source chunk as it appears "
        "in the original document. This is the verbatim text without any modifications, "
        "paraphrasing, or summarization.",
    )
    brief_summary: str = Field(
        ...,
        description="A concise summary of the citation content. This provides a "
        "brief overview of the key information or main point conveyed by the cited "
        "text, typically in one to two sentences.",
    )


class TextWithCitations(BaseModel):
    """Represents text content with embedded citations and their detailed references.

    This model is used to structure AI-generated responses that include citations.
    The main text contains [CITATION: N] markers that reference entries in the
    citations array, allowing for traceable and verifiable AI responses.
    """

    text: str = Field(
        ...,
        description="The main text content with embedded citation markers in the "
        "format [CITATION: N] where N is the citation number. These markers indicate "
        "where in the text a citation should be referenced.",
    )
    citations: list[Citation] = Field(
        ...,
        description="List of citation objects that correspond to the [CITATION: N] "
        "markers in the text. Each citation provides the source text, source ID, "
        "chunk ID, and citation number for traceability.",
    )
