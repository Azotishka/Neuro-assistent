#!/usr/bin/env bash
# NeuroLinux OS: install llama.cpp and select from several local GGUF models.
# Run inside Debian/Ubuntu terminal, not in Android shell.
set -euo pipefail

MODEL_DIR="$HOME/Models"
SRC_DIR="$HOME/src/llama.cpp"
mkdir -p "$MODEL_DIR" "$HOME/src"

echo "NeuroLinux local AI setup"
echo "Choose one model to download (you can rerun this script to add another):"
echo "  1) Qwen2.5 0.5B Instruct  — smallest, quickest, basic tasks"
echo "  2) Qwen3 0.6B             — newer compact reasoning model"
echo "  3) Qwen2.5 1.5B Instruct  — balanced default (~1 GB)"
echo "  4) SmolLM2 1.7B Instruct  — alternative general assistant"
read -r -p "Model [1-4, default 3]: " choice
choice="${choice:-3}"
case "$choice" in
  1) MODEL_FILE="Qwen2.5-0.5B-Instruct-Q4_K_M.gguf"; MODEL_REPO="bartowski/Qwen2.5-0.5B-Instruct-GGUF" ;;
  2) MODEL_FILE="Qwen3-0.6B-Q4_K_M.gguf"; MODEL_REPO="bartowski/Qwen3-0.6B-GGUF" ;;
  3) MODEL_FILE="Qwen2.5-1.5B-Instruct-Q4_K_M.gguf"; MODEL_REPO="bartowski/Qwen2.5-1.5B-Instruct-GGUF" ;;
  4) MODEL_FILE="SmolLM2-1.7B-Instruct-Q4_K_M.gguf"; MODEL_REPO="bartowski/SmolLM2-1.7B-Instruct-GGUF" ;;
  *) echo "Invalid choice."; exit 2 ;;
esac
MODEL="$MODEL_DIR/$MODEL_FILE"
echo "Selected: $MODEL_FILE"
echo "Model files are typically hundreds of MB to around 1.2 GB; build files need additional space."
read -r -p "Continue? [y/N] " answer
case "$answer" in y|Y|yes|YES) ;; *) echo "Cancelled."; exit 0 ;; esac

sudo_cmd=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then sudo_cmd=sudo
  else echo "Run as root or install sudo first."; exit 1
  fi
fi

$sudo_cmd apt-get update
$sudo_cmd apt-get install -y git cmake build-essential pkg-config libopenblas-dev curl ca-certificates

if [ ! -d "$SRC_DIR/.git" ]; then
  git clone --depth 1 https://github.com/ggml-org/llama.cpp.git "$SRC_DIR"
else
  git -C "$SRC_DIR" pull --ff-only
fi

cmake -S "$SRC_DIR" -B "$SRC_DIR/build" -DCMAKE_BUILD_TYPE=Release -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS
cmake --build "$SRC_DIR/build" --config Release -j2 --target llama-server

if [ ! -s "$MODEL" ]; then
  curl -fL --retry 3 --continue-at - \
    "https://huggingface.co/$MODEL_REPO/resolve/main/$MODEL_FILE" \
    -o "$MODEL"
fi

mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/neuro-ai" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail
MODEL_DIR="$HOME/Models"
SERVER="$HOME/src/llama.cpp/build/bin/llama-server"
if [ ! -x "$SERVER" ]; then
  echo "llama-server missing. Re-run the setup script."
  exit 1
fi
mapfile -t MODELS < <(find "$MODEL_DIR" -maxdepth 1 -type f -name '*.gguf' -printf '%f\n' | sort)
if [ "${#MODELS[@]}" -eq 0 ]; then
  echo "No GGUF models found in $MODEL_DIR. Run enable-local-ai.sh first."
  exit 1
fi
if [ -n "${1:-}" ]; then
  MODEL="$MODEL_DIR/$1"
else
  echo "Available local models:"
  select name in "${MODELS[@]}"; do
    if [ -n "${name:-}" ]; then MODEL="$MODEL_DIR/$name"; break; fi
    echo "Choose a number from the list."
  done
fi
if [ ! -s "$MODEL" ]; then echo "Model not found: $MODEL"; exit 1; fi
echo "Starting $MODEL"
exec "$SERVER" --model "$MODEL" --host 127.0.0.1 --port 8080 --ctx-size 2048 --threads 2
LAUNCHER
chmod +x "$HOME/.local/bin/neuro-ai"

echo
echo "Installation complete."
echo "Start and choose a downloaded model with: $HOME/.local/bin/neuro-ai"
echo "To add another model, rerun this script and select a different number."
echo "API endpoint: http://127.0.0.1:8080/v1"
echo "The server binds to localhost only; it is not exposed to your Wi-Fi."
