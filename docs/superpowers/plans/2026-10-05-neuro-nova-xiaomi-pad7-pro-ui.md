# Neuro Nova Xiaomi Pad 7 Pro UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current layered Neuro Nova web UI with a Figma-driven tablet-first application shell for Xiaomi Pad 7 Pro while preserving the existing AI, RAG, tools/WebMCP, voice, overlay, and automation runtime.

**Architecture:** Keep the existing Android WebView/runtime boundary and the existing orchestrator/provider/memory/tool interfaces. Replace the legacy web shell with a new semantic DOM and component CSS/JS layer, then map existing runtime actions into the new routes and states. Figma becomes the visual source of truth; Android remains the packaging/runtime host.

**Tech Stack:** Android/Kotlin, WebView, HTML/CSS/JavaScript, existing local runtime modules, Gradle 8.13, Android SDK 36, Figma design system, Adobe Express brand exploration.

**Spec:** `docs/superpowers/specs/2026-10-05-neuro-nova-xiaomi-pad7-pro-ui-design.md`

## Global Constraints

- Primary device: Xiaomi Pad 7 Pro 8/256, landscape-first with portrait adaptation.
- The redesign must replace the current visual shell rather than stack another CSS override.
- UI -> Assistant Orchestrator -> AiProvider / MemoryStore / ToolRouter remains the runtime boundary.
- WebMCP remains explicitly registered and must not receive arbitrary Android access.
- Existing voice/background/overlay behavior remains intact.
- Local persisted RAG/indexing, lexical retrieval, secure URL fetching, and document-context injection remain available.
- Every new APK build uses a new application-facing name, new icon, incremented versionCode/versionName, and unique CI artifact name.
- No new backend, billing system, or cloud dependency is introduced for the redesign.
- Tests, lint, APK assembly, landscape/portrait checks, and legacy-UI leakage checks are required before completion.

## Review Focus

- Legacy DOM/CSS leakage: the old shell must not remain visually active underneath the new shell; covered by the shell migration and UI regression checks.
- Tablet width transitions: wide, medium, and portrait layouts must collapse/reflow without horizontal overflow; covered by responsive layout tests.
- Runtime failures: model/tool/WebMCP/RAG failures must become non-blocking structured UI states; covered by state-mapping tests.
- Process/orientation restoration: the active session and current route must survive supported recreation; covered by Android lifecycle tests.
- Branding drift: every APK must have a unique name/icon/version/artifact identity; covered by Gradle/manifest/workflow verification.

---

### Task 1: Create the Figma source of truth and Adobe Express brand direction

**Files:**
- Create/maintain: Figma design file for Neuro Nova tablet redesign.
- Create/maintain: Adobe Express visual exploration/brand assets.
- Reference: `docs/superpowers/specs/2026-10-05-neuro-nova-xiaomi-pad7-pro-ui-design.md`

**Interfaces:**
- Produces: approved visual tokens, component names, screen layouts, state variants, icon/brand direction, and portrait adaptation used by Tasks 2–7.

- [ ] **Step 1: Create the Figma file under the approved Ashot team plan.**
- [ ] **Step 2: Build foundations and variables for typography, semantic colors, spacing, radii, surfaces, elevation, icon sizes, and motion/state conventions.**
- [ ] **Step 3: Build reusable components for navigation, top bar, controls, composer, conversation rows, message blocks, model/source/tool/automation rows, status, progress, dialogs, sheets, toasts, and loading/empty/error states.**
- [ ] **Step 4: Design Xiaomi Pad 7 Pro landscape screens: Home, Chat, Models, Memory & Files, Tools, Automations, Live Assistant, Settings.**
- [ ] **Step 5: Add representative dialogs/sheets and portrait adaptations.**
- [ ] **Step 6: Create a new Neuro Nova visual mark/icon direction in Adobe Express and select the asset direction for the APK.**
- [ ] **Step 7: Capture/export the exact design references required by implementation and record component/screen naming in the plan branch.**
- [ ] **Step 8: Review the Figma source against the spec: every required destination and state must be represented before implementation begins.**

### Task 2: Establish the new web shell and responsive layout contract

**Files:**
- Modify: `app/src/main/assets/local/index.html`
- Create: `app/src/main/assets/local/neuro-nova-shell.css`
- Create: `app/src/main/assets/local/neuro-nova-tokens.css`
- Create: `app/src/main/assets/local/neuro-nova-shell.js`
- Modify/remove from active loading: `styles.css`, `features.css`, `gemini-ui.css`, `mobile-shell.css`, `neuro-ui-v7.css` as required by migration.

**Interfaces:**
- Consumes: existing runtime DOM/API hooks that remain required by `app.js`, `features.js`, `ui.js`, `tools.js`, and Android bridge code.
- Produces: one semantic shell with stable route containers and responsive layout state.

- [ ] **Step 1: Add a failing shell contract test that asserts the new root contains navigation, route outlet, contextual rail/drawer, and global composer/overlay mount points without legacy visual containers.**
- [ ] **Step 2: Run the existing local test suite and record the expected failure before the new shell exists.**
- [ ] **Step 3: Replace the old body-level shell in `index.html` with semantic regions: app shell, primary nav, top bar, route outlet, context surface, global overlays.**
- [ ] **Step 4: Implement semantic tokens and tablet breakpoints in `neuro-nova-tokens.css` and `neuro-nova-shell.css`; use width classes rather than device-name checks.**
- [ ] **Step 5: Implement shell navigation/state in `neuro-nova-shell.js`, exposing a small route contract for later screen modules.**
- [ ] **Step 6: Remove obsolete stylesheet precedence from the active HTML load order so the old UI cannot leak into the new shell.**
- [ ] **Step 7: Run the shell contract test and responsive UI tests; expected result: PASS with no legacy visual root active.**

### Task 3: Implement Home and global navigation

**Files:**
- Create: `app/src/main/assets/local/neuro-nova-home.js`
- Create: `app/src/main/assets/local/neuro-nova-home.css`
- Modify: `neuro-nova-shell.js`

**Interfaces:**
- Consumes: shell route contract and existing conversation/model/memory/automation status APIs.
- Produces: Home route with current conversation, recent activity, memory/RAG status, files, automations, and quick actions.

- [ ] **Step 1: Add tests for Home route selection and empty/loading states.**
- [ ] **Step 2: Implement the Home route using the Figma hierarchy, not a generic card grid.**
- [ ] **Step 3: Bind existing runtime data and quick actions without introducing direct model-specific calls.**
- [ ] **Step 4: Verify landscape and portrait rendering and run tests.**

### Task 4: Implement the Chat Workspace and composer

**Files:**
- Create: `app/src/main/assets/local/neuro-nova-chat.js`
- Create: `app/src/main/assets/local/neuro-nova-chat.css`
- Modify: `app/src/main/assets/local/app.js` only where existing event/data contracts must be adapted.
- Modify: `neuro-shell.js` only if the existing Android bridge requires an explicit compatibility mapping.

**Interfaces:**
- Consumes: existing conversation state, streaming/generation controls, attachments, voice, model selection, tool status, and RAG context.
- Produces: conversation list/workspace/context rail and composer actions with explicit streaming/tool/error/cancel states.

- [ ] **Step 1: Add tests for send, stop, streaming, empty conversation, model error, tool-running, tool-timeout, and cancellation states.**
- [ ] **Step 2: Implement the wide tablet three-zone Chat composition and medium/portrait collapse rules from Figma.**
- [ ] **Step 3: Implement composer controls for text, voice, attachments, model/mode, tool status, send/stop, and contextual actions.**
- [ ] **Step 4: Map existing `app.js` runtime actions into the new component event contract without changing provider interfaces.**
- [ ] **Step 5: Verify RAG context remains visible as source/context metadata and does not become executable instructions from documents.**
- [ ] **Step 6: Run unit/UI tests and verify no old Gemini/legacy chat DOM remains active.**

### Task 5: Implement Models, Memory & Files, and Tools

**Files:**
- Create: `app/src/main/assets/local/neuro-nova-models.js`
- Create: `app/src/main/assets/local/neuro-nova-models.css`
- Create: `app/src/main/assets/local/neuro-nova-memory.js`
- Create: `app/src/main/assets/local/neuro-nova-memory.css`
- Create: `app/src/main/assets/local/neuro-nova-tools.js`
- Create: `app/src/main/assets/local/neuro-nova-tools.css`
- Modify: `app/src/main/assets/local/tools.js` only for explicit UI contract adaptation.

**Interfaces:**
- Consumes: existing model capability/status data, Studio/RAG persistence, Tool Router/WebMCP registry and execution results.
- Produces: model center, memory/file source browser, tool catalog and structured execution state.

- [ ] **Step 1: Add tests for model loaded/unloaded/error, memory source stored/indexed/active, tool enabled/disabled, WebMCP permission denied, timeout, and successful execution.**
- [ ] **Step 2: Implement Models with honest capability/metric presentation and degraded-memory state.**
- [ ] **Step 3: Implement Memory & Files with source state, search, indexing state, and permission/status indicators.**
- [ ] **Step 4: Implement Tools with capability, permission, WebMCP, progress, cancellation, timeout, and result states.**
- [ ] **Step 5: Verify the UI does not bypass Tool Router or call arbitrary Android/WebMCP capabilities directly.**
- [ ] **Step 6: Run tests and responsive checks.**

### Task 6: Implement Automations, Live Assistant, and Settings

**Files:**
- Create: `app/src/main/assets/local/neuro-nova-automations.js`
- Create: `app/src/main/assets/local/neuro-nova-automations.css`
- Create: `app/src/main/assets/local/neuro-nova-live.js`
- Create: `app/src/main/assets/local/neuro-nova-live.css`
- Create: `app/src/main/assets/local/neuro-nova-settings.js`
- Create: `app/src/main/assets/local/neuro-nova-settings.css`
- Modify: `automation-engine.js` only where an explicit UI status adapter is needed.

**Interfaces:**
- Consumes: existing automation engine, voice/background/overlay runtime, volume controls, settings storage.
- Produces: task-centric automation screen, Live Assistant states, grouped settings.

- [ ] **Step 1: Add tests for automation running/scheduled/completed/failed/paused states and Live Assistant listening/processing/speaking/stopped/background states.**
- [ ] **Step 2: Implement Automations without introducing a new workflow backend/editor.**
- [ ] **Step 3: Implement Live Assistant using the shared design tokens and preserve existing voice/background/overlay actions.**
- [ ] **Step 4: Implement grouped Settings and route existing settings controls through the new UI.**
- [ ] **Step 5: Verify volume, mute/stop, background status, model status, and connection status remain actionable.**
- [ ] **Step 6: Run tests and lifecycle/orientation checks.**

### Task 7: Integrate the new brand and APK identity

**Files:**
- Modify: `app/build.gradle.kts`
- Modify: `app/src/main/AndroidManifest.xml`
- Modify: `app/src/main/res/values/strings.xml`
- Create: new Android launcher icon resource(s), replacing the current Neuro Nova icon.
- Modify: `.github/workflows/build-apk.yml`
- Modify: web manifest/icon assets where needed.

**Interfaces:**
- Consumes: selected Adobe Express/Figma brand asset.
- Produces: unique application name, icon, incremented version, and unique CI artifact.

- [ ] **Step 1: Add a build identity test/check for versionCode/versionName, manifest label/icon, and CI artifact name.**
- [ ] **Step 2: Set a new application-facing name and increment versionCode from 17 to 18 with versionName `0.18.0`, unless the implementation cycle requires another monotonic version selected during execution.**
- [ ] **Step 3: Replace `neuro_nova_icon.xml` with the new icon asset and update Android manifest/resources.**
- [ ] **Step 4: Update CI artifact name to a unique Xiaomi Pad 7 Pro redesign identifier.**
- [ ] **Step 5: Run the identity check and Gradle configuration validation.**

### Task 8: Remove obsolete UI layers and harden compatibility

**Files:**
- Modify/delete obsolete active UI assets identified during Tasks 2–6.
- Modify: `app-compat.js`, `ui.js`, and related adapters only when needed to preserve runtime contracts.
- Modify: existing UI tests.

**Interfaces:**
- Consumes: completed new shell and route contracts.
- Produces: single-source-of-truth UI with no legacy visual route leakage.

- [ ] **Step 1: Add a regression test that fails when obsolete Gemini/legacy shell selectors become visible on any primary route.**
- [ ] **Step 2: Remove or quarantine obsolete CSS/DOM paths that are no longer referenced by runtime code.**
- [ ] **Step 3: Keep compatibility adapters only for non-visual runtime contracts that are still consumed.**
- [ ] **Step 4: Run the full web test suite and confirm the new shell is the only active visual layer.**

### Task 9: Android lifecycle, performance, and responsive verification

**Files:**
- Modify: relevant Android activity/lifecycle code only where route/session restoration requires it.
- Modify: relevant tests under `app/src/test`.
- Add: focused lifecycle/responsive regression tests where the existing test structure supports them.

**Interfaces:**
- Consumes: completed shell and route state contract.
- Produces: stable tablet/portrait lifecycle behavior.

- [ ] **Step 1: Add a test for route/session restoration after recreation where supported by the current host.**
- [ ] **Step 2: Add a test/check for portrait no-horizontal-overflow and wide-tablet panel collapse rules.**
- [ ] **Step 3: Verify memory-pressure/degraded-mode indicators do not block ordinary chat.
- [ ] **Step 4: Run `gradle :app:testDebugUnitTest` and `gradle :app:lintDebug`.**
- [ ] **Step 5: Run `gradle :app:assembleDebug`.**

### Task 10: Final Figma-to-code verification and release artifact

**Files:**
- No new source-of-truth files unless fixes are required by verification.
- Modify: final implementation files only for discovered mismatches.

**Interfaces:**
- Consumes: Figma source of truth and completed Android/web implementation.
- Produces: verified debug APK and final branch state.

- [ ] **Step 1: Load Figma design context for the primary tablet screens and compare implementation against the approved frames.**
- [ ] **Step 2: Check Home, Chat, Models, Memory & Files, Tools, Automations, Live Assistant, Settings, dialogs, and portrait adaptation for hierarchy and state parity.**
- [ ] **Step 3: Fix only verified visual/interaction mismatches and rerun focused tests.**
- [ ] **Step 4: Run the full CI-equivalent test, lint, and APK build sequence.**
- [ ] **Step 5: Verify the generated APK corresponds to the final commit and that the CI artifact has the new unique identity.**
- [ ] **Step 6: Commit the completed redesign in logical commits and leave the branch ready for review; do not merge into `main` without explicit instruction.**

## Dependency order

Task 1 -> Task 2 -> Tasks 3–6 -> Task 7 -> Task 8 -> Task 9 -> Task 10.

Tasks 3–6 can be implemented independently after the shell contract exists, but their visual implementation must follow Task 1's Figma component names and tokens.

## Acceptance gate

The redesign is complete only when the final APK passes unit tests, lint, assembly, responsive/lifecycle checks, and visual verification against the Figma source of truth, with no active legacy UI leakage and with the required new APK identity.
