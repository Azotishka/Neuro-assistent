(() => {
  const $ = (id) => document.getElementById(id);
  const dialog = $("appPromptDialog");
  const title = $("appPromptTitle");
  const text = $("appPromptText");
  const fieldWrap = $("appPromptFieldWrap");
  const field = $("appPromptField");
  const cancelBtn = $("appPromptCancel");
  const okBtn = $("appPromptOk");
  if (!dialog) return;

  let pending = null;
  function settle(value) {
    if (!pending) return;
    const fn = pending; pending = null;
    try { dialog.close(); } catch {}
    fn(value);
  }
  cancelBtn?.addEventListener("click", () => settle(null));
  okBtn?.addEventListener("click", () => settle(fieldWrap?.classList.contains("hidden") ? true : field.value));
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); settle(null); });
  field?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); okBtn?.click(); }
  });

  function open({ heading = "Подтверждение", message = "", value = "", placeholder = "", confirmText = "Готово", cancelText = "Отмена", danger = false, input = false, multiline = false, showCancel = true } = {}) {
    if (pending) settle(null);
    title.textContent = heading;
    text.textContent = message;
    fieldWrap.classList.toggle("hidden", !input);
    field.classList.toggle("multiline", !!multiline);
    field.value = String(value ?? "");
    field.placeholder = placeholder;
    field.rows = multiline ? 5 : 1;
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    cancelBtn.classList.toggle("hidden", !showCancel);
    okBtn.classList.toggle("danger-btn", !!danger);
    try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
    if (input) setTimeout(() => { field.focus(); field.setSelectionRange(field.value.length, field.value.length); }, 40);
    else setTimeout(() => okBtn.focus(), 40);
    return new Promise((resolve) => { pending = resolve; });
  }

  window.QwenUI = {
    async confirm(message, options = {}) {
      const r = await open({ heading: options.title || "Подтверждение", message, confirmText: options.confirmText || "Продолжить", cancelText: options.cancelText || "Отмена", danger: !!options.danger });
      return r === true;
    },
    async prompt(message, value = "", options = {}) {
      const r = await open({ heading: options.title || "Введите значение", message, value, placeholder: options.placeholder || "", confirmText: options.confirmText || "Сохранить", cancelText: options.cancelText || "Отмена", input: true, multiline: !!options.multiline });
      return typeof r === "string" ? r : null;
    },
    async alert(message, options = {}) {
      await open({ heading: options.title || "Qwen Local", message, confirmText: options.confirmText || "Понятно", cancelText: "", danger: false, showCancel: false });
      return true;
    },
  };
})();
