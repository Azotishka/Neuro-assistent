#!/usr/bin/env bash
# NeuroLinux OS: install a small local GGUF model using llama.cpp.
# Run inside Debian/Ubuntu terminal, not in Android shell.
set -euo pipefail

MODEL_DIR="$HOME/Models"
SRC_DIR="$HOME/src/llama.cpp"
mkdir -p "$MODEL_DIR" "$HOME/src"

echo "NeuroLinux local AI setup"
echo "This downloads source code and a ~1 GB model; allow several GB of free space."
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

MODEL="$MODEL_DIR/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf"
if [ ! -s "$MODEL" ]; then
  curl -fL --retry 3 --continue-at - \
    "https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf" \
    -o "$MODEL"
fi

mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/neuro-ai" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail
MODEL="$HOME/Models/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf"
SERVER="$HOME/src/llama.cpp/build/bin/llama-server"
if [ ! -s "$MODEL" ] || [ ! -x "$SERVER" ]; then
  echo "Model or llama-server missing. Re-run the setup script."
  exit 1
fi
exec "$SERVER" --model "$MODEL" --host 127.0.0.1 --port 8080 --ctx-size 2048 --threads 2
LAUNCHER
chmod +x "$HOME/.local/bin/neuro-ai"

echo
echo "Installation complete."
echo "Start the local model with: $HOME/.local/bin/neuro-ai"
echo "Keep this terminal open. In the browser, open http://127.0.0.1:8080"
echo "API endpoint for compatible clients: http://127.0.0.1:8080/v1"
echo "The server binds to localhost only; it is not exposed to your Wi-Fi."
