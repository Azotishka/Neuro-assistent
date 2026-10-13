# NeuroLinux OS: local AI and desktop

## What's included

The standalone Android app runs a rootless Linux userspace; it does not replace Android or provide a separate bootable OS. On first desktop launch, the app installs XFCE, Firefox ESR, a file manager, Mousepad, Python and common development tools into the selected Debian/Ubuntu filesystem.

## Optional offline AI: multiple models

The script `enable-local-ai.sh` installs [llama.cpp](https://github.com/ggml-org/llama.cpp), builds its CPU server and lets you choose among several quantized GGUF models. It is separate from the APK because model weights are large and users should choose what to download.

Available choices in the setup menu:

- **Qwen2.5 0.5B Instruct** — smallest option; best first try on a memory-constrained tablet.
- **Qwen3 0.6B** — newer compact model; may need a compatible current llama.cpp build.
- **Qwen2.5 1.5B Instruct** — balanced default.
- **SmolLM2 1.7B Instruct** — alternative general-purpose model; may be slower and use more memory.

All are quantized GGUF builds served locally by llama.cpp. Availability of a particular file at the upstream model repository can change; if a download returns 404, choose another option or check the repository's file list.

### Install

1. Install and launch Debian or Ubuntu in NeuroLinux.
2. Open the Linux terminal.
3. Download and run the installer inside the Linux terminal:

   ```sh
   apt-get update
   apt-get install -y curl ca-certificates
   curl -fL https://raw.githubusercontent.com/Azotishka/Neuro-assistent/main/neurolinux/enable-local-ai.sh -o enable-local-ai.sh
   bash enable-local-ai.sh
   ```

   Choose a model from the menu. To add another model later, run `bash enable-local-ai.sh` again and choose a different number. The script builds llama.cpp and downloads model weights; allow several GB of free space and time for compilation.

4. Start the model server:

   ```sh
   ~/.local/bin/neuro-ai
   ```

   If you downloaded several models, it displays a menu so you can choose which one to start. Keep this terminal open.

5. Open the chat interface file [`ai-chat.html`](https://github.com/Azotishka/Neuro-assistent/blob/main/neurolinux/ai-chat.html) in Firefox inside the Linux desktop. The OpenAI-compatible endpoint is `http://127.0.0.1:8080/v1`. Download the raw HTML file first rather than using GitHub's source preview.

## Notes and limits

- The setup script currently builds for CPU. On a tablet, generation speed depends on the model, thermal state and available RAM. Start with 0.5B or 0.6B if memory or speed is an issue.
- These are general-purpose instruction models; none is guaranteed to be uncensored. Follow each model's license and terms.
- This is local inference, not self-training. Browser memory and pasted notes can provide context but do not update model weights.
- Internet is needed for initial package/model downloads. After setup, inference can run offline.
- The desktop, browser and model compete for the tablet's RAM. If Android or the Linux session becomes unstable, stop the server or use a smaller model.
- The desktop uses VNC/noVNC embedded in a WebView. CI build success does not prove operation on every physical device.

## Build

Pushing changes under `neurolinux/**` starts `.github/workflows/neurolinux-apk.yml`. The workflow builds the ARM64 debug APK and publishes a tagged release if all steps pass.
