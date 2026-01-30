import modal

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    # This suppresses the error inside the container where
    # python-dotenv is not installed, preventing the crash.
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
            # We set the DEFAULT to cuda, so your running app finds the GPU
            "TORCH_DEVICE": "cuda",
            "INFERENCE_RAM": "24",
        }
    )
    .run_commands(
        # We prepend TORCH_DEVICE=cpu to override the global setting
        # just for this specific download command.
        "TORCH_DEVICE=cpu python -c 'from marker.models import create_model_dict; create_model_dict()'"
    )
)

# Florence Summarizer Image
florence_image = (
    modal.Image.from_registry("nvidia/cuda:12.1.1-devel-ubuntu22.04", add_python="3.10")
    .env({"DEBIAN_FRONTEND": "noninteractive", "TZ": "Etc/UTC"})
    # 1. Force Install Specific Torch 2.3.0 (The most stable recent version)
    # We use --index-url to STOP pip from looking at your local mirror (which has the weird 2.10 version)
    .pip_install(
        "torch==2.3.0",
        "torchvision==0.18.0",
        extra_index_url="https://download.pytorch.org/whl/cu121",
    )
    # 2. Install Flash Attention from a known-good pre-built wheel
    # This URL is the "Standard" one for Torch 2.3.0 + CUDA 12.1 + Python 3.10
    .pip_install(
        "https://github.com/Dao-AILab/flash-attention/releases/download/v2.5.8/flash_attn-2.5.8+cu122torch2.3cxx11abiFALSE-cp310-cp310-linux_x86_64.whl"
    )
    # 3. Install the rest of the stack
    # We pin transformers to a version known to work well with Florence-2
    .pip_install(
        "transformers==4.41.2", "pillow", "einops", "timm", "packaging", "ninja"
    )
    .env({"HF_HUB_CACHE": "/root/.cache/huggingface"})
    # 4. Download Model
    .run_commands(
        "python -c 'from transformers import AutoModelForCausalLM, AutoProcessor; "
        'model_id="microsoft/Florence-2-large"; '
        "AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True); "
        "AutoProcessor.from_pretrained(model_id, trust_remote_code=True)'"
    )
)

# App
app = modal.App("ingestion-worker")


# Marker Parser
@app.cls(
    gpu="L4",  # 24GB VRAM
    image=pdf_parser_image,
    max_containers=6,  # Total Pool: Max 6 GPUs allowed
    cpu=8.0,  # Feeder: 2 vCPUs per worker to prevent bottlenecks
    scaledown_window=60,  # Keep warm for 60s
    retries=3,
    secrets=[modal.Secret.from_dotenv()],
)
@modal.concurrent(max_inputs=4)  # Density: 4 requests running per GPU
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

        import torch  # type: ignore
        from marker.output import text_from_rendered  # type: ignore

        # 1. Use tempfile for thread safety!
        # If 4 workers save to "/root/doc.pdf" at the same time, they will corrupt data.
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as temp_pdf:
            temp_pdf.write(pdf_data)
            temp_pdf.flush()  # Flush Python buffer
            os.fsync(temp_pdf.file.fileno())  # Force OS to write to disk

            print(f"Processing size: {len(pdf_data)/1024:.1f} KB")

            # 2. Run Inference
            # batch_multiplier=1 ensures we don't hog VRAM, leaving room for other workers
            rendered = self.converter(temp_pdf.name)

            # 3. Extract Output
            text, _, images = text_from_rendered(rendered)

            # 4. Replace image names with UUIDs and convert PIL Images to bytes
            # images is a dict: {old_filename: image_data, ...}
            # image_data can be PIL Image objects or bytes
            new_images = {}
            name_mapping = {}  # old_name -> new_uuid

            for old_name, image_data in images.items():
                # Generate UUIDv4 for each image
                image_uuid = str(uuid.uuid4())

                # Convert PIL Image to bytes if needed (for Modal serialization)
                if hasattr(image_data, "save"):  # Check if it's a PIL Image
                    import io


                    # Convert PIL Image to bytes (PNG format)
                    img_bytes = io.BytesIO()
                    image_data.save(img_bytes, format="PNG")
                    image_data = img_bytes.getvalue()

                new_images[image_uuid] = image_data
                name_mapping[old_name] = image_uuid

            # 5. Replace image references in text
            # Marker uses markdown image syntax: ![](filename) or ![alt](filename)
            # Pattern matches: ![optional alt text](filename)
            def replace_image_ref(match):
                alt_text = match.group(1) if match.group(1) else ""
                old_filename = match.group(2)

                # Check if this filename exists in our mapping
                if old_filename in name_mapping:
                    new_uuid = name_mapping[old_filename]
                    return f"![{alt_text}]({new_uuid})"
                # If not found, return original (shouldn't happen, but safe fallback)
                return match.group(0)

            # Match markdown image syntax: ![alt](filename) or ![](filename)
            image_pattern = r"!\[([^\]]*)\]\(([^\)]+)\)"
            modified_text = re.sub(image_pattern, replace_image_ref, text)

            # 6. Optional: Log VRAM usage for debugging
            if torch.cuda.is_available():
                peak_mb = torch.cuda.max_memory_allocated() / (1024**2)
                print(f"[VRAM] Peak: {peak_mb:.1f} MB")

            return modified_text, new_images


# Florence Summarizer
@app.cls(
    gpu="L4",
    image=florence_image,
    max_containers=1,
    retries=3,
    cpu=4,
    scaledown_window=60,
    secrets=[modal.Secret.from_dotenv()],
)
@modal.concurrent(max_inputs=8)  # 8 concurrent requests per container
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

        # 1. Load Image (CPU work)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 2. Prepare Inputs (CPU work)
        # We ask for a detailed caption
        prompt = "<MORE_DETAILED_CAPTION>"
        inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(
            self.device, self.torch_dtype
        )

        # 3. Generate (GPU work)
        generated_ids = self.model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=1024,
            do_sample=False,
            num_beams=3,
        )

        # 4. Decode (CPU work)
        generated_text = self.processor.batch_decode(
            generated_ids, skip_special_tokens=False
        )[0]
        parsed_answer = self.processor.post_process_generation(
            generated_text, task=prompt, image_size=(image.width, image.height)
        )

        # Return the clean string
        return parsed_answer["<MORE_DETAILED_CAPTION>"]
