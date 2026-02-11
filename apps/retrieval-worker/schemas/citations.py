from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Represents a single citation reference with source and chunk information.

    This model stores metadata about where a citation originated from, including
    the source document ID and the specific chunk ID within that source. The citation
    number corresponds to the [CITATION: N] markers embedded in the main text.

    The `chunkId` field must be the exact CHUNK_ID value from the chunk data provided
    in the prompt. This CHUNK_ID corresponds to the block ID in the source document
    and is used to highlight the correct chunk when the citation is clicked.
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
        description=(
            "The ID from the `<<<id>>>` markers in the chunk content.\n\n"
            "Extract the ID from patterns like `<<<123>>>content<<</123>>>` in the chunk content. "
            'Use the ID value (e.g., `"123"`) as a string. This ID corresponds to the block ID '
            "in the source document and is used to highlight the correct chunk when the citation is clicked.\n\n"
            'Example: If the chunk content contains `<<<456>>>some text<<</456>>>`, then chunkId should be `"456"`.'
        ),
    )
    brief_summary: str = Field(
        ...,
        description="A concise summary of the citation content. This provides a "
        "brief overview of the key information or main point conveyed by the cited "
        "text, typically in one to two sentences. "
        r"CRITICAL: Do NOT use backslashes (\) or LaTeX syntax. Use plain text only.",
    )


class TextWithCitations(BaseModel):
    r"""Represents text content with embedded citations and their detailed references.

    This model is used to structure AI-generated responses that include citations.
    The main text contains [CITATION: N] markers that reference entries in the
    citations array, allowing for traceable and verifiable AI responses.

    IMPORTANT: All text fields must NOT contain backslashes (\) or LaTeX syntax.
    Use plain text or simple markdown formatting only.
    """

    # Reasoning is optional and ignored by downstream logic; the core
    # pipeline only relies on `text` and `citations`. We keep this field
    # for backwards compatibility but do not require the model to output it.
    reasoning: str | None = Field(
        default=None,
        alias="_reasoning",
        description="Explain why you are using the citations in the text.",
    )
    text: str = Field(
        ...,
        description="The main text content with embedded citation markers in the "
        "format [CITATION: N] where N is the citation number. These markers indicate "
        "where in the text a citation should be referenced. "
        r"CRITICAL: Do NOT use backslashes (\) or LaTeX syntax. Use plain text or simple markdown only.",
    )
    citations: list[Citation] = Field(
        ...,
        description="List of citation objects that correspond to the [CITATION: N] "
        "markers in the text. Each citation provides the source text, source ID, "
        "chunk ID, and citation number for traceability.",
    )
