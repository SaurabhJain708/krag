import modal

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


import os
import subprocess

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
    # 1. Use NVIDIA Devel Base (contains nvcc compiler)
    modal.Image.from_registry("nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.10")
    # 2. Install build tools first
    .pip_install("ninja", "packaging", "wheel", "setuptools")
    # 3. Install Core Libs (WITH PINNED TRANSFORMERS)
    .pip_install(
        "torch==2.4.0",
        "transformers==4.46.3",  # <--- CRITICAL FIX: Pinned stable version
        "sentence-transformers>=3.0.0",
        "numpy",
        "accelerate",
        "huggingface_hub",
    )
    # 4. Compile Flash Attention
    .pip_install("flash-attn", extra_options="--no-build-isolation").env(
        {"HF_HUB_CACHE": "/root/.cache/huggingface"}
    )
    # 5. Bake in model weights
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
    # vLLM 0.7.3 + Transformers 4.48.3 is stable for Qwen 2.5
    .pip_install(["vllm==0.7.3", "transformers==4.48.3"])
    .env({"HF_HUB_CACHE": "/root/.cache/huggingface"})
    .run_commands(
        "python -c 'from huggingface_hub import snapshot_download; "
        'snapshot_download("Qwen/Qwen2.5-14B-Instruct-AWQ")\''
    )
)

# App
app = modal.App("freeze-deps")


def get_freeze_cmd():
    # Filters out clutter
    return "pip freeze | grep -v 'pkg_resources'"


@app.function(image=pdf_parser_image)
def freeze_marker():
    return subprocess.check_output(get_freeze_cmd(), shell=True).decode("utf-8")


@app.function(image=florence_image)
def freeze_florence():
    return subprocess.check_output(get_freeze_cmd(), shell=True).decode("utf-8")


@app.function(image=bge_m3_image)
def freeze_bge():
    return subprocess.check_output(get_freeze_cmd(), shell=True).decode("utf-8")


@app.function(image=mxbai_v2_image)
def freeze_mxbai():
    return subprocess.check_output(get_freeze_cmd(), shell=True).decode("utf-8")


@app.function(image=qwen_14b_awq_image)
def freeze_qwen():
    return subprocess.check_output(get_freeze_cmd(), shell=True).decode("utf-8")


@app.local_entrypoint()
def main():
    os.makedirs("requirements", exist_ok=True)

    print("❄️  Freezing Marker PDF...")
    with open("requirements/marker.txt", "w") as f:
        f.write(freeze_marker.remote())

    print("❄️  Freezing Florence-2...")
    with open("requirements/florence.txt", "w") as f:
        f.write(freeze_florence.remote())

    print("❄️  Freezing BGE-M3...")
    with open("requirements/bge_m3.txt", "w") as f:
        f.write(freeze_bge.remote())

    print("❄️  Freezing MXBAI...")
    with open("requirements/mxbai.txt", "w") as f:
        f.write(freeze_mxbai.remote())

    print("❄️  Freezing Qwen...")
    with open("requirements/qwen.txt", "w") as f:
        f.write(freeze_qwen.remote())

    print("\n✅ Done! Files saved in ./requirements/")
