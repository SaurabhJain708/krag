from enum import Enum
from typing import Literal, TypedDict


class Parent_Chunks(TypedDict):
    content: str
    children_ids: list[int]
    id: str


class Child_Chunks(TypedDict):
    content: str
    parent_ids: list[int]
    id: str


class Chunk(TypedDict):
    type: Literal["text", "table"]
    content: str
    id: int


class SplitContent(TypedDict):
    type: Literal["text", "table"]
    content: str


class Finalised_chunk(TypedDict):
    type: Literal["text", "table"]
    content: str


class FileProcessingStatus(str, Enum):
    uploading = "uploading"
    queued = "queued"
    processing = "processing"
    starting = "starting"
    vision = "vision"
    extracting = "extracting"
    images = "images"
    chunking = "chunking"
    completed = "completed"
    failed = "failed"
