/* NeuroAssistant WebMCP adapter: read-only, optional browser capability.
 * No chat history, memory, documents, credentials, or Android bridge access.
 */
(() => {
  let registered = false;
  const getContext = () => {
    const current = document.modelContext || navigator.modelContext;
    return current && typeof current.registerTool === 'function' ? current : null;
  };

  const status = () => {
    const core = window.NeuroQwenCore;
    if (!core) throw new Error('NeuroAssistant is not ready');
    const key = String(core.getSelectedKey());
    const state = window.QwenMobileBridge?.getState?.() || {};
    return {
      selectedModel: key,
      modelLoaded: state.loadedKey === key,
      generating: state.isGenerating === true,
    };
  };

  const models = () => {
    const core = window.NeuroQwenCore;
    if (!core) throw new Error('NeuroAssistant is not ready');
    return Object.entries(core.MODELS || {}).map(([id, model]) => ({
      id,
      label: String(model.label || id),
      cached: core.isModelCached(id) === true,
    }));
  };

  function register() {
    if (registered || !window.NeuroQwenCore) return false;
    const context = getContext();
    if (!context) return false;
    const common = { type: 'object', properties: {}, additionalProperties: false };
    try {
      context.registerTool({
        name: 'neuro_local_model_status',
        description: 'Read the selected local model and whether it is loaded or generating. No private chat data.',
        inputSchema: common,
        annotations: { readOnlyHint: true },
        execute: status,
      });
      context.registerTool({
        name: 'neuro_list_local_models',
        description: 'List built-in local model names and whether their weights are cached. No user content.',
        inputSchema: common,
        annotations: { readOnlyHint: true },
        execute: models,
      });
      registered = true;
      return true;
    } catch (error) {
      console.warn('NeuroAssistant WebMCP registration failed', error);
      return false;
    }
  }

  window.NeuroWebMCP = {
    get supported() { return Boolean(getContext()); },
    get registered() { return registered; },
    register,
  };
  window.addEventListener('qwen:app-ready', register);
})();
