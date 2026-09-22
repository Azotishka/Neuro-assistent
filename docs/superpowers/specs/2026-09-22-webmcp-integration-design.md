# NeuroAssistant · WebMCP integration design (22 September 2026)

## Intent and current codebase

NeuroAssistant is an Android app whose main chat runs the local web UI from
`app/src/main/assets/local` inside Android WebView. `app.js` exposes a limited
`window.NeuroQwenCore` interface for WebLLM model selection and completion.
`LocalModelsActivity.kt` provides a native Android message listener only for
the trusted top-level `https://appassets.androidplatform.net` origin. The
school newspaper is another independent site in this repository.

Goal: a local-first assistant that can read website information, plan a
multi-step task, and propose project edits/publications, while requiring
explicit confirmation before changing remote content.

## Compatibility boundary

WebMCP is a page-side browser API for exposing that page's own tools to
browser agents, not a universal API for calling other websites from an
unrelated Android WebView. Prefer `document.modelContext`, optionally fall
back to `navigator.modelContext` for older previews, and feature-detect
`registerTool`. If neither exists, keep the existing chat functional.
WebMCP availability on the user's Android WebView must be tested on device.
Do not claim external web tools are available merely because the adapter
registered local page tools.

## Stage 1 — implemented in the feature branch

Load `webmcp.js` before the classic app bundle and register two **read-only**
tools after the existing `qwen:app-ready` event:

- `neuro_local_model_status`: selected model identifier and whether it is
  currently loaded/generating.
- `neuro_list_local_models`: built-in model IDs, labels and local cache flags.

Expose no chat text, files, project contents, memory, account info, API keys
or native commands. Do not register write tools. Registration is idempotent;
unsupported environments leave the existing UI untouched. Include the script
in the app-shell service-worker cache and add Node tests for unsupported
browser, legacy fallback, duplicate events, and data minimization.

## Stage 2 — local agent runtime (not yet implemented)

Introduce a deterministic task executor outside the model: the model suggests
an allowlisted tool name + validated JSON arguments; the executor imposes
per-task step limits, cancellation, per-tool timeouts, and serial execution.
Treat website content and model output as untrusted task data. The local model
does not receive Android native bridge access or credentials. Reuse
`NeuroQwenCore.runCompletion` only if loaded WebGPU/model constraints permit;
provide clear errors if local inference is unavailable. Native overlay should
use the same executor as the full web UI, not a second permissions model.

## Stage 3 — external sites, projects and publishing (not yet implemented)

Connect individual sites via explicit user authorization and
domain-specific adapters (WebMCP only where an actual compatible browser
agent host can reach the site's tools; otherwise a documented site API).
Read tools receive only the minimum content required for each user-requested
task. A remote project update is proposed as a diff or publication preview.
A user-initiated confirmation step must precede every publish, delete,
repository mutation or other externally visible write; re-check authorization
on the server. Secrets never enter publicly served JS, prompts, IndexedDB
exports, or logs. Do not implement arbitrary URL fetch without strict HTTPS,
redirect and private-network controls and a documented browser-CORS strategy.

## Verification and release gate

Run `npm run build`, `npm test`, `npm run test:android`, then Android
unit tests, Lint and `assembleDebug` through GitHub Actions. Manually check
one compatible WebMCP-enabled browser and one Android WebView lacking WebMCP.
A passing APK build does not establish WebGPU availability or end-to-end
browser-agent interoperability. Keep this work on a reviewable branch until
the on-device smoke test is complete.
