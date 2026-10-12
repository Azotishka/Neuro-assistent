# NeuroLinux OS: local AI and desktop

## What's included

The standalone Android app runs a rootless Linux userspace; it does not replace Android or provide a separate bootable OS. On first desktop launch, the app installs XFCE, Firefox ESR, a file manager, Mousepad, Python and common development tools into the selected Debian/Ubuntu filesystem.

## Optional offline AI

The script `enable-local-ai.sh` installs [llama.cpp](https://github.com/ggml-org/llama.cpp), builds its CPU server and downloads a quantized Qwen2.5 1.5B Instruct GGUF model. It is deliberately separate from the APK because model weights are large and users should choose whether to download them.

1. Install and launch Debian or Ubuntu in NeuroLinux.
2. Open the Linux terminal.
3. Download the script from this repository, then run it inside the Linux terminal:

   ```sh
   apt-get update
   apt-get install -y curl ca-certificates
   curl -fL https://raw.githubusercontent.com/Azotishka/Neuro-assistent/main/neurolinux/enable-local-ai.sh -o enable-local-ai.sh
   bash enable-local-ai.sh
   ```

   If the Linux session is not root and has no `sudo`, run the commands from a root Linux shell.

4. When setup finishes, start the model:

   ```sh
   ~/.local/bin/neuro-ai
   ```

5. In Firefox inside the same Linux desktop, open `http://127.0.0.1:8080`. The OpenAI-compatible endpoint is `http://127.0.0.1:8080/v1`.

The setup downloads roughly 1 GB of model weights, plus source/build files; allow several GB of free space and time for compilation. CPU inference may be slow on a tablet. The script limits context to 2048 tokens and uses two CPU threads to reduce memory/heat pressure. Stop the server with Ctrl+C.

## Important limitations

- The default model is a compact general-purpose instruct model, not guaranteed to be uncensored. Model behavior and license depend on the chosen model.
- This is local inference, not model self-training. Chat history, memory, document indexing and fine-tuning are not automatically created by this script.
- Internet is needed for initial package/model downloads. After setup, inference can run offline.
- The desktop + browser + model compete for the tablet's RAM. If the system closes apps or becomes unstable, stop the model or use a smaller GGUF.
- The desktop path uses VNC/noVNC embedded in a WebView. A successful CI build does not prove it works on every physical device; report any on-device error with a screenshot/log.
- Only use models whose license and distribution terms you accept. Review the upstream llama.cpp license and the model card before redistribution.

## Build

Pushing changes under `neurolinux/**` starts the GitHub Actions workflow `.github/workflows/neurolinux-apk.yml`. The workflow builds the ARM64 debug APK and publishes a tagged release if all steps pass.
