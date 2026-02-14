from __future__ import annotations

from typing import TYPE_CHECKING

import modal

if TYPE_CHECKING:
    import torch

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

# Marker Parser Image
pdf_parser_image = (
    modal.Image.debian_slim(python_version="3.10")
    .env({"DEBIAN_FRONTEND": "noninteractive", "TZ": "Etc/UTC"})
    .apt_install("libgl1", "libglib2.0-0", "git")
    .pip_install("marker-pdf==1.10.1")
    .env(
        {
            "HF_HUB_CACHE": "/root/.cache/huggingface",
            "TORCH_DEVICE": "cuda",
            "INFERENCE_RAM": "24",
        }
    )
    .run_commands(
        "TORCH_DEVICE=cpu python -c 'from marker.models import create_model_dict; create_model_dict()'"
    )
)

# Florence Summarizer Image
florence_image = (
    modal.Image.from_registry("nvidia/cuda:12.1.1-devel-ubuntu22.04", add_python="3.10")
    .env({"DEBIAN_FRONTEND": "noninteractive", "TZ": "Etc/UTC"})
    .pip_install(
        "torch==2.3.0",
        "torchvision==0.18.0",
        extra_index_url="https://download.pytorch.org/whl/cu121",
    )
    .pip_install(
        "https://github.com/Dao-AILab/flash-attention/releases/download/v2.5.8/flash_attn-2.5.8+cu122torch2.3cxx11abiFALSE-cp310-cp310-linux_x86_64.whl"
    )
    .pip_install(
        "transformers==4.41.2", "pillow", "einops", "timm", "packaging", "ninja"
    )
    .env({"HF_HUB_CACHE": "/root/.cache/huggingface"})
    .run_commands(
        "python -c 'from transformers import AutoModelForCausalLM, AutoProcessor; "
        'model_id="microsoft/Florence-2-large"; '
        "AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True); "
        "AutoProcessor.from_pretrained(model_id, trust_remote_code=True)'"
    )
)

# BGE-M3 Image
bge_m3_image = (
    modal.Image.debian_slim(python_version="3.10")
    .env({"DEBIAN_FRONTEND": "noninteractive", "TZ": "Etc/UTC"})
    .pip_install(
        "torch==2.3.0",
        "transformers==4.46.3",
        "FlagEmbedding",
        "numpy",
    )
    .env({"HF_HUB_CACHE": "/root/.cache/huggingface"})
    .run_commands(
        "python -c 'from FlagEmbedding import BGEM3FlagModel; BGEM3FlagModel(\"BAAI/bge-m3\", use_fp16=False)'"
    )
)

mxbai_v2_image = (
    modal.Image.from_registry("nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.10")
    .pip_install("ninja", "packaging", "wheel", "setuptools")
    .pip_install(
        "torch==2.4.0",
        "transformers==4.46.3",
        "sentence-transformers>=3.0.0",
        "numpy",
        "accelerate",
        "huggingface_hub",
    )
    .pip_install("flash-attn", extra_options="--no-build-isolation")
    .env({"HF_HUB_CACHE": "/root/.cache/huggingface"})
    .run_commands(
        "python -c 'from huggingface_hub import snapshot_download; "
        'snapshot_download("mixedbread-ai/mxbai-rerank-large-v2", '
        'ignore_patterns=["*.msgpack", "*.h5", "*.tflite"])\''
    )
)


qwen_14b_awq_image = (
    modal.Image.from_registry("nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.10")
    .apt_install("git")
    .pip_install(
        "huggingface_hub",
        "pycountry",
        "tqdm==4.66.5",
    )
    .pip_install(["vllm==0.7.3", "transformers==4.48.3"])
    .env({"HF_HUB_CACHE": "/root/.cache/huggingface"})
    .run_commands(
        "python -c 'from huggingface_hub import snapshot_download; "
        'snapshot_download("Qwen/Qwen2.5-14B-Instruct-AWQ")\''
    )
)

# App
app = modal.App("ingestion-worker")


# Marker Parser
@app.cls(
    gpu="L4",
    image=pdf_parser_image,
    max_containers=6,
    cpu=8.0,
    scaledown_window=60,
    retries=3,
    secrets=[modal.Secret.from_dotenv()],
)
@modal.concurrent(max_inputs=4)
class MarkerParser:
    @modal.enter()
    def setup(self):
        """
        Runs ONCE when the container starts.
        Loads the huge models into GPU memory so they are ready for all 4 workers.
        """
        from marker.converters.pdf import PdfConverter  # type: ignore
        from marker.models import create_model_dict  # type: ignore

        # Initialize the converter once
        self.converter = PdfConverter(
            artifact_dict=create_model_dict(),
        )

    @modal.method()
    def parse_secure_pdf(
        self, pdf_data: bytes
    ) -> tuple[str, dict[str, bytes], list[str]]:
        """
        Runs for every request.
        """
        import os
        import re
        import tempfile
        import uuid

        from marker.output import text_from_rendered  # type: ignore

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as temp_pdf:
            temp_pdf.write(pdf_data)
            temp_pdf.flush()
            os.fsync(temp_pdf.file.fileno())

            rendered = self.converter(temp_pdf.name)

            text, _, images = text_from_rendered(rendered)

            new_images = {}
            name_mapping = {}  # old_name -> new_uuid

            for old_name, image_data in images.items():
                image_uuid = str(uuid.uuid4())

                if hasattr(image_data, "save"):
                    import io

                    img_bytes = io.BytesIO()
                    image_data.save(img_bytes, format="PNG")
                    image_data = img_bytes.getvalue()

                new_images[image_uuid] = image_data
                name_mapping[old_name] = image_uuid

            def replace_image_ref(match):
                alt_text = match.group(1) if match.group(1) else ""
                old_filename = match.group(2)

                if old_filename in name_mapping:
                    new_uuid = name_mapping[old_filename]
                    return f"![{alt_text}]({new_uuid})"
                return match.group(0)

            image_pattern = r"!\[([^\]]*)\]\(([^\)]+)\)"
            modified_text = re.sub(image_pattern, replace_image_ref, text)

            return modified_text, new_images


# Florence Summarizer
@app.cls(
    gpu="L4",
    image=florence_image,
    max_containers=3,
    retries=3,
    cpu=4,
    scaledown_window=60,
    secrets=[modal.Secret.from_dotenv()],
)
@modal.concurrent(max_inputs=6)
class FlorenceSummarizer:
    @modal.enter()
    def setup(self):
        import torch  # type: ignore
        from transformers import AutoModelForCausalLM, AutoProcessor  # type: ignore

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32

        model_id = "microsoft/Florence-2-large"

        # Load Model & Processor Once
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id, trust_remote_code=True, torch_dtype=self.torch_dtype
        ).to(self.device)

        self.processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)

    @modal.method()
    def summarize_image(self, image_bytes: bytes) -> str:
        import io

        from PIL import Image  # type: ignore

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        prompt = "<MORE_DETAILED_CAPTION>"
        inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(
            self.device, self.torch_dtype
        )

        generated_ids = self.model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=1024,
            do_sample=False,
            num_beams=3,
        )

        generated_text = self.processor.batch_decode(
            generated_ids, skip_special_tokens=False
        )[0]
        parsed_answer = self.processor.post_process_generation(
            generated_text, task=prompt, image_size=(image.width, image.height)
        )

        return parsed_answer["<MORE_DETAILED_CAPTION>"]


@app.cls(
    gpu="T4",
    image=bge_m3_image,
    max_containers=4,
    cpu=4.0,
    scaledown_window=60,
    secrets=[modal.Secret.from_dotenv()],
)
@modal.concurrent(max_inputs=32)
class BGEM3Embedder:
    @modal.enter()
    def setup(self):
        """
        Loads the BGE-M3 model into GPU memory once per container start.
        """
        from FlagEmbedding import BGEM3FlagModel  # type: ignore

        # Load model in FP16 for speed and lower VRAM usage
        self.model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True, device="cuda")

    @modal.method()
    def generate_embeddings(
        self, texts: list[str], batch_size: int = 12
    ) -> list[list[float]]:
        """
        Generates dense embeddings for a list of text strings.
        Returns a list of list of floats.
        """
        # BGE-M3 can output Dense, Sparse, and ColBERT vectors.
        # For standard ingestion, we typically only need the Dense vector.
        output = self.model.encode(
            texts,
            batch_size=batch_size,
            max_length=8192,
            return_dense=True,
        )

        # Output['dense_vecs'] is a numpy array, convert to list for serialization
        return output["dense_vecs"].tolist()


@app.cls(
    gpu=None,
    image=bge_m3_image,
    max_containers=4,
    cpu=1,
    scaledown_window=5,
    secrets=[modal.Secret.from_dotenv()],
)
@modal.concurrent(max_inputs=2)
class BGEM3EmbedderCPU:
    @modal.enter()
    def setup(self):
        """
        Loads the BGE-M3 model into GPU memory once per container start.
        """
        from FlagEmbedding import BGEM3FlagModel  # type: ignore

        # Load model in FP16 for speed and lower VRAM usage
        self.model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=False, device="cpu")

    @modal.method()
    def generate_embeddings(
        self, texts: list[str], batch_size: int = 12
    ) -> list[list[float]]:
        """
        Generates dense embeddings for a list of text strings.
        Returns a list of list of floats.
        """
        # BGE-M3 can output Dense, Sparse, and ColBERT vectors.
        # For standard ingestion, we typically only need the Dense vector.
        output = self.model.encode(
            texts,
            batch_size=batch_size,
            max_length=8192,
            return_dense=True,
        )

        # Output['dense_vecs'] is a numpy array, convert to list for serialization
        return output["dense_vecs"].tolist()


@app.cls(
    gpu="L4",
    image=mxbai_v2_image,
    max_containers=1,
    scaledown_window=60,
    secrets=[modal.Secret.from_dotenv()],
)
@modal.concurrent(max_inputs=10)
class MXBAIRerankerV2:
    @modal.enter()
    def setup(self):
        import torch  # type: ignore
        from sentence_transformers import CrossEncoder  # type: ignore

        # Load mxbai-rerank-large-v2
        # This uses the weights baked into the image.
        # Transformers 4.46.3 (pinned in image) ensures Qwen weights load correctly.
        self.model = CrossEncoder(
            "mixedbread-ai/mxbai-rerank-large-v2",
            device="cuda",
            trust_remote_code=True,
            automodel_args={
                "torch_dtype": torch.float16,
                "attn_implementation": "flash_attention_2",
            },
        )

    @modal.method()
    def rerank(
        self, query: str, documents: list[dict[str, str]], top_k: int = 10
    ) -> list[dict[str, str]]:
        """
        Reranks a list of documents (up to 8k tokens each).
        Accepts documents in format: [{"content": str, "id": str}, ...]
        Returns documents in the same format, sorted by relevance score.
        """
        if not documents:
            return []

        # Extract content strings for model prediction
        doc_contents = [doc["content"] for doc in documents]
        pairs = [[query, doc_content] for doc_content in doc_contents]

        # Batch size 4 is safe for 1.5B model with long context on L4
        scores = self.model.predict(pairs, batch_size=4, show_progress_bar=False)

        # Combine documents with their scores
        results = []
        for doc, score in zip(documents, scores, strict=True):
            results.append(
                {
                    "content": doc["content"],
                    "id": doc["id"],
                    "score": float(score),
                }
            )

        # Sort by score (descending) and return top_k
        results.sort(key=lambda x: x["score"], reverse=True)
        top_results = results[:top_k]

        # Return in the same format as input (without score)
        return [{"content": r["content"], "id": r["id"]} for r in top_results]


class GeneralizedLoopBreaker:
    def __init__(self, min_pattern_len: int = 1, max_pattern_len: int = 5):
        """
        Detects and breaks strictly immediate repetition loops.

        Args:
            min_pattern_len: Smallest loop to detect (1 = stutter).
            max_pattern_len: Largest loop to detect (5 = repeating a 5-token phrase).
                             Larger numbers are safer but slightly slower (micro-seconds).
        """
        self.min_n = min_pattern_len
        self.max_n = max_pattern_len

    def __call__(self, input_ids: list[int], scores: torch.Tensor) -> torch.Tensor:
        # We need at least enough tokens to form a repetition pattern
        # Max check is 2 * max_n (e.g., A B C D E A B C D E needs 10 tokens)
        history_len = len(input_ids)

        # Optimization: Only check pattern lengths that are physically possible
        # given the current history length.
        actual_max_n = min(self.max_n, history_len // 2)

        # Iterate through pattern lengths (e.g., 1, 2, 3, 4, 5)
        for n in range(self.min_n, actual_max_n + 1):

            # 1. Get the pattern we just completed (the last n tokens)
            # Example (n=3): [... A B C]
            current_pattern = input_ids[-n:]

            # 2. Get the sequence immediately before it
            # Example (n=3): [... A B C] [A B C]
            #                    ^prev^   ^curr^
            previous_pattern = input_ids[-2 * n : -n]

            # 3. Check for exact match
            if current_pattern == previous_pattern:
                # We have found a loop!
                # The model has generated [Pattern] [Pattern].
                # If we do nothing, it will generate the first token of [Pattern] again.
                # Example: ... A B C A B C [Next expected is A]

                # The token to ban is the first token of the repeated pattern
                token_to_ban = current_pattern[0]

                # Set probability to 0 (score to -infinity)
                scores[token_to_ban] = -float("inf")

                # Optimization: If we find a loop, we break it and stop checking other lengths.
                # Breaking the smallest loop usually breaks the larger structure too.
                break

        return scores


@app.cls(
    gpu="L4",
    image=qwen_14b_awq_image,
    max_containers=1,
    timeout=600,
    scaledown_window=60,
    secrets=[modal.Secret.from_dotenv()],
)
@modal.concurrent(max_inputs=10)
class Qwen2_5_14BAWQ:
    @modal.enter()
    def setup(self):
        from vllm.engine.arg_utils import AsyncEngineArgs  # type: ignore
        from vllm.engine.async_llm_engine import AsyncLLMEngine  # type: ignore

        model_name = "Qwen/Qwen2.5-14B-Instruct-AWQ"

        engine_args = AsyncEngineArgs(
            model=model_name,
            quantization="awq",
            dtype="half",
            gpu_memory_utilization=0.90,
            max_model_len=16384,
            enforce_eager=True,
            trust_remote_code=True,  # Qwen often needs this for the tokenizer
        )

        self.engine = AsyncLLMEngine.from_engine_args(engine_args)

    @modal.method()
    async def generate(
        self,
        prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.1,
        json_schema: str | dict | None = None,
    ) -> str:
        import uuid

        from vllm import SamplingParams  # type: ignore
        from vllm.sampling_params import GuidedDecodingParams  # type: ignore

        guided_options = None
        if json_schema:
            guided_options = GuidedDecodingParams(json=json_schema)

        loop_breaker = GeneralizedLoopBreaker(min_pattern_len=1, max_pattern_len=8)

        sampling_params = SamplingParams(
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=0.95,
            repetition_penalty=1.1,
            guided_decoding=guided_options,
            logits_processors=[loop_breaker],
        )

        request_id = str(uuid.uuid4())

        results_generator = self.engine.generate(prompt, sampling_params, request_id)

        final_output = None
        async for request_output in results_generator:
            final_output = request_output

        return final_output.outputs[0].text.strip()
