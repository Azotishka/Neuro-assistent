# NeuroAssistant Tablet AI Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать утверждённый гибридный Tablet AI Hub + Agent/WebMCP foundation для Xiaomi Pad 7 Pro 8/256.

**Architecture:** UI зависит от Assistant Orchestrator, а не от конкретного AI runtime. Orchestrator использует AiProvider, MemoryStore и ToolRouter. DeviceProfile предоставляет capability/budget, ToolRouter изолирует Android/WebMCP tools.

**Tech Stack:** Android/Kotlin/Jetpack Compose, существующий local WebView/WebLLM runtime, GitHub Actions, unit tests.

**Spec:** docs/superpowers/specs/2026-10-04-neuroassistant-tablet-ai-hub-design.md

## Global Constraints
- Планшетный breakpoint: >= 840dp.
- Chat list width: 280-340dp.
- Third tool rail: >= 1200dp; otherwise bottom sheet.
- Xiaomi Pad 7 Pro: 8GB memory class.
- WebMCP has only explicitly registered tools.
- Existing voice/overlay behavior remains intact.
- No new backend/cloud/payment.

## Review Focus
- Rotation/process recreation restores the active session.
- 8GB memory pressure enters degraded mode instead of crashing.
- Tool timeout/cancel/error returns structured results.
- Portrait uses single-pane navigation.
- Unregistered WebMCP/Android capabilities are rejected.

### Task 1: DeviceProfile capability model
**Files:** existing device profile/runtime files; tests for profile selection.
**Interfaces:** Produces stable memory class, tablet flag, context budget and feature capabilities.

- [ ] Write failing tests for Pad 7 Pro, generic tablet and phone profiles.
- [ ] Run profile tests and verify failure.
- [ ] Implement capability-based profile selection without removing existing phone profiles.
- [ ] Run tests and verify all profiles pass.
- [ ] Commit: `feat: formalize tablet device capabilities`.

### Task 2: AiProvider boundary
**Files:** new focused Kotlin provider interface/implementation adapters; tests.
**Interfaces:** `generate(request)`, `stream(request, onChunk)`, `cancel(requestId)`, capability metadata.
- [ ] Write failing contract tests for local/API providers.
- [ ] Verify failure.
- [ ] Implement adapters around existing runtime without changing model selection UI.
- [ ] Verify tests.
- [ ] Commit: `refactor: isolate AI providers`.

### Task 3: ToolRouter foundation
**Files:** new ToolRequest/ToolResult/ToolDefinition/ToolRouter files; tests.
**Interfaces:** `register(definition, handler)`, `execute(request)`, `cancel(requestId)`.
- [ ] Test registered, missing-capability, invalid-input, timeout and cancellation paths.
- [ ] Verify failures.
- [ ] Implement structured routing and permission/capability checks.
- [ ] Verify tests.
- [ ] Commit: `feat: add tool router foundation`.

### Task 4: MemoryStore
**Files:** focused session/persistent memory classes; tests.
**Interfaces:** `appendMessage`, `saveFact`, `buildContext(budget)`, `clearSession`.
- [ ] Test context budgeting and persistence failure isolation.
- [ ] Verify failures.
- [ ] Implement bounded context assembly using DeviceProfile.
- [ ] Verify tests.
- [ ] Commit: `feat: add bounded assistant memory`.

### Task 5: Assistant Orchestrator
**Files:** orchestrator/state model; tests.
**Interfaces:** user input -> provider/tool/memory flow; structured UI state.
- [ ] Test normal chat, tool call, cancellation and provider failure.
- [ ] Verify failures.
- [ ] Implement orchestration with step limit and cancellation.
- [ ] Verify tests.
- [ ] Commit: `feat: add assistant orchestrator`.

### Task 6: Tablet AI Hub UI
**Files:** existing Compose screens plus focused tablet layout components; UI tests.
- [ ] Test >=840dp two-pane and >=1200dp tool rail; portrait single-pane.
- [ ] Verify failures.
- [ ] Implement adaptive layout while preserving existing phone UI.
- [ ] Verify UI tests.
- [ ] Commit: `feat: add tablet AI hub layout`.

### Task 7: Live Assistant integration
**Files:** existing overlay/voice UI; tests.
- [ ] Test shared state/theme and lifecycle restoration.
- [ ] Verify failures.
- [ ] Reuse Orchestrator/Provider state without duplicating model logic.
- [ ] Verify tests and manual overlay checks.
- [ ] Commit: `feat: unify live assistant flow`.

### Task 8: WebMCP adapter
**Files:** WebMCP tool adapter/registry; tests.
- [ ] Test registration, schema validation, capability checks, timeout and cancellation.
- [ ] Verify failures.
- [ ] Implement WebMCP as a ToolRouter provider only; no unrestricted Android access.
- [ ] Verify tests.
- [ ] Commit: `feat: add WebMCP tool adapter`.

### Task 9: Persistence and lifecycle hardening
**Files:** saved-state/session persistence and memory lifecycle; tests.
- [ ] Test rotation, process recreation and degraded-memory behavior.
- [ ] Verify failures.
- [ ] Implement restoration and graceful resource release.
- [ ] Verify tests.
- [ ] Commit: `fix: harden tablet lifecycle and memory`.

### Task 10: Full verification
- [ ] Run unit/UI tests, lint and release/debug build.
- [ ] Verify overlay/voice manually on Xiaomi Pad 7 Pro.
- [ ] Verify portrait/landscape and memory-pressure paths.
- [ ] Inspect APK artifact and GitHub Actions result.
- [ ] Commit only fixes required by verification.
