# Neuro Nova — Xiaomi Pad 7 Pro UI Redesign Specification

**Date:** 2026-10-05  
**Status:** Design approved in conversation; written-spec review required before implementation planning.  
**Target:** Xiaomi Pad 7 Pro 8/256, with graceful portrait/phone adaptation.

## 1. Product intent

Replace the current NeuroAssistant/Neuro Nova interface with a genuinely new visual system and application shell designed around a large Android tablet. The redesign must not be a cosmetic CSS layer over the existing shell. The old navigation, card language, legacy route presentation, and visual leftovers are to be removed or isolated so the new shell becomes the single source of truth.

The product should feel like a premium personal AI workspace rather than a conventional chat app: fast access to conversation, local models, memory/files, tools/WebMCP, automations, and Live Assistant without forcing the user through separate disconnected utilities.

### Success criteria

- Xiaomi Pad 7 Pro landscape is the primary composition.
- Portrait remains usable without horizontal overflow or broken hierarchy.
- One coherent visual language covers every screen, dialog, sheet, loading state, error state, overlay, and Live Assistant.
- The interface is recognizably original and does not copy Gemini or another product one-to-one.
- Existing AI/runtime capabilities remain available behind the new UI.
- Existing voice/background/overlay behavior is preserved.
- Local AI, RAG/memory, tools/WebMCP, and automation capabilities remain reachable from the new shell.
- UI remains responsive under the device's constrained memory/runtime conditions.

## 2. Visual direction

The visual identity is **premium AI workspace**.

### Principles

- Deep hierarchy instead of decorative cards everywhere.
- Generous tablet spacing and clear alignment.
- Strong typography with compact secondary metadata.
- Expressive AI accent used selectively for active intelligence, status, and focus.
- Light and dark themes share the same semantic tokens.
- Soft surfaces and restrained elevation; no fake 3D or excessive glass.
- Original iconography and controls.
- Motion is purposeful: navigation, model activity, streaming, tool execution, and Live Assistant state changes should communicate state rather than decorate it.
- No paper/newspaper styling.
- No reuse of the previous square-card visual language as the primary system.
- No old navigation retained merely for compatibility.

## 3. Information architecture

Primary destinations:

1. **Home** — intelligent dashboard with current conversation, model/runtime status, memory activity, recent files, tasks, and quick actions.
2. **Chat** — main AI workspace.
3. **Models** — local/API model center with model state, capabilities, context limits, memory pressure, and diagnostics.
4. **Memory & Files** — persistent memory, RAG sources, documents, indexing/search state.
5. **Tools** — registered tools, WebMCP, code/file operations, permissions, and tool execution history.
6. **Automations** — multi-step tasks and scheduled/conditional actions.
7. **Live Assistant** — voice/background assistant with a shared visual language.
8. **Settings** — device/performance, sound, voice, appearance, security, WebMCP, and advanced runtime controls.

The shell should support a persistent primary navigation rail on tablet landscape. Secondary navigation appears contextually inside each destination instead of creating a large number of top-level routes.

## 4. Xiaomi Pad 7 Pro layout system

Landscape is the reference composition.

### Wide landscape

- Primary navigation rail: compact and persistent.
- Main content: adaptive 2-column workspace.
- Chat: conversation list + conversation workspace.
- Context/tool rail appears at wide widths when useful.
- Minimum content width is protected; panels collapse rather than becoming unusably narrow.

### Medium landscape

- Primary navigation remains visible.
- Chat conversation list may collapse into a drawer.
- Context rail becomes an overlay/drawer or bottom sheet.

### Portrait

- Single-pane content.
- Primary navigation becomes a compact bottom/side navigation pattern.
- Secondary/context panels become sheets.
- Chat composer remains reachable without covering active content.
- No desktop-only three-column layout is squeezed into portrait.

### System behavior

Use adaptive width classes and capability-based device profiling rather than hard-coding a single model name into UI logic.

## 5. Screen designs

### Home

A focused dashboard, not a grid of unrelated cards.

Top area:
- greeting/status
- active model/runtime state
- global search/action entry

Main area:
- continue current conversation
- recent conversations
- memory/RAG activity
- recent files
- active automations
- quick actions

The hierarchy should make the next useful action obvious within one glance.

### Chat Workspace

Three conceptual zones on wide tablets:

- **Conversation navigation:** recent chats, search, pinned sessions.
- **AI workspace:** messages, streaming state, citations/context, tool activity.
- **Context rail:** model, memory sources, active tools, attachments, task state.

Composer:
- multiline input
- voice
- attachments
- model/mode selector
- tool permission/status
- send/stop
- compact contextual actions

Streaming, tool execution, errors, retries, and cancellation get explicit states.

### Models

Each model has:
- name/type
- local/API indicator
- loaded/unloaded state
- context capability
- memory pressure estimate
- performance state
- active/default marker
- diagnostics and actions

Local model controls must not expose misleading precision when runtime metrics are unavailable.

### Memory & Files

Unified information architecture for:
- saved memory
- documents
- RAG index
- sources
- search
- indexing status
- source permissions

A source should clearly show whether it is merely stored, indexed, or currently contributing context.

### Tools

Tool catalog with:
- tool name
- capability
- permission requirement
- enabled/disabled state
- WebMCP indicator
- recent execution result

Tool execution UI must expose progress, cancellation, timeout, and error states without blocking normal chat.

### Automations

Task-centric layout:
- active/running
- scheduled
- completed
- failed
- paused

Each automation shows trigger, steps, last result, and controls. Avoid a complex workflow editor unless needed by the existing runtime.

### Live Assistant

A dedicated focused surface with:
- listening/speaking/processing state
- waveform/activity visualization
- current response
- stop/mute
- background mode status
- volume controls
- connection/model status

The same visual tokens and components are reused by overlay/background UI.

### Settings

Grouped sections rather than a long undifferentiated list:
- Appearance
- AI & Models
- Voice & Sound
- Performance
- Memory & Data
- Tools & WebMCP
- Security
- About/Diagnostics

## 6. Design system

Figma is the source of truth for the visual system.

Foundations:
- semantic color roles
- light/dark modes
- typography scale
- spacing scale
- corner radius scale
- elevation/surface hierarchy
- icon sizing
- motion/state conventions

Core components:
- navigation rail
- top bar
- section header
- buttons
- icon buttons
- segmented controls
- tabs
- chips
- search field
- composer
- conversation row
- message block
- streaming indicator
- model card
- source/RAG row
- tool row
- automation row
- status badge
- progress indicator
- dialog
- sheet/drawer
- toast
- empty state
- loading state
- error state
- confirmation state

Every interactive component must define default, hover/focus where applicable, pressed, disabled, loading, selected, and error states.

## 7. Brand and icon direction

Adobe Express is used as a visual-brand companion for exploration of the new identity and icon direction. The final application icon must be a new asset, not a recolor of the current Neuro Nova icon.

The visual mark should communicate:
- intelligence
- motion
- personal assistant
- modern Android/tablet product

The icon must remain legible at launcher and small notification sizes.

## 8. Runtime and architecture constraints

The UI is a presentation layer over the existing architecture:

UI -> Assistant Orchestrator -> AiProvider / MemoryStore / ToolRouter.

The redesign must not introduce direct UI dependencies on individual AI models.

Existing QwenLocalStudio-derived capabilities remain available:
- local persisted RAG/indexing
- lexical retrieval
- secure URL fetching
- document-context injection
- local model integration

WebMCP remains an explicitly registered tool provider. It must not receive arbitrary Android access.

DeviceProfile/capability logic determines memory and context behavior. On memory pressure, the runtime may enter degraded mode without crashing or trapping the user in the UI.

## 9. Data and state behavior

The new shell must restore the active session after orientation/process recreation where supported by the existing runtime.

Failure behavior:
- model failure -> clear actionable error + retry/change-model action
- tool timeout -> structured timeout state + cancel/retry
- WebMCP permission denial -> explicit permission state
- RAG/indexing failure -> preserve normal chat
- memory failure -> preserve normal chat
- network/API failure -> preserve local functionality where available

Loading and empty states are first-class designs, not placeholders.

## 10. Accessibility and interaction

- Touch targets must be tablet-friendly.
- Text must remain readable at the device's normal viewing distance.
- Focus/keyboard interaction must remain usable with physical keyboards where Android exposes them.
- Color is never the only state indicator.
- Motion must not prevent completing a task.
- Important actions remain reachable in portrait.

## 11. Figma deliverables

The Figma source of truth should contain:
- foundations and variables
- reusable component library
- Home
- Chat Workspace
- Models
- Memory & Files
- Tools
- Automations
- Live Assistant
- Settings
- representative dialog/sheet/toast states
- portrait adaptation
- loading/empty/error states

The primary reference frame is Xiaomi Pad 7 Pro landscape.

## 12. Implementation boundary

Implementation will replace the current visual shell rather than continue stacking CSS overrides.

Expected implementation work:
- replace legacy shell DOM where necessary
- consolidate visual tokens and component styles
- map existing runtime actions to new UI components
- preserve required JavaScript bridge/API contracts
- remove obsolete visual layers after migration
- update branding and icon
- update APK version and artifact identity

Every new APK build must use:
- a new application-facing name
- a new icon
- incremented versionCode/versionName
- a unique CI artifact name

## 13. Testing and acceptance

Before the redesigned APK is considered complete:

- unit tests pass
- lint passes
- debug APK assembles
- primary tablet routes render without legacy UI leakage
- landscape and portrait layouts are usable
- chat streaming/tool/error states render correctly
- Live Assistant remains functional
- model/memory/tools/settings navigation works
- process/orientation restoration is checked
- no horizontal overflow on portrait
- APK artifact is downloaded and verified as the build from the final commit

## 14. Explicit non-goals

- Do not copy Gemini's interface one-to-one.
- Do not retain the old UI merely by covering it with another CSS layer.
- Do not rewrite the AI runtime solely for visual reasons.
- Do not add a new backend, billing system, or cloud dependency for this redesign.
- Do not build a full autonomous browser as part of the UI redesign.
