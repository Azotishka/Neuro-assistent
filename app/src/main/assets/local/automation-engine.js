export const AUTOMATION_TRIGGERS = Object.freeze({
  manual: "Вручную",
  startup: "При запуске",
  interval: "По интервалу",
});

export const AUTOMATION_STEP_TYPES = Object.freeze({
  prompt: "ИИ-запрос",
  model: "Сменить модель",
  memory: "Сохранить в память",
  delay: "Пауза",
});

export function normalizeAutomation(input = {}) {
  const now = Date.now();
  const steps = Array.isArray(input.steps) ? input.steps.slice(0, 24).map((step, index) => ({
    id: String(step?.id || `step-${index + 1}`),
    type: Object.hasOwn(AUTOMATION_STEP_TYPES, step?.type) ? step.type : "prompt",
    value: String(step?.value ?? "").slice(0, 12000),
    modelKey: String(step?.modelKey || ""),
    delayMs: Math.max(0, Math.min(300000, Number(step?.delayMs) || 0)),
  })) : [];
  const trigger = Object.hasOwn(AUTOMATION_TRIGGERS, input.trigger) ? input.trigger : "manual";
  const intervalMs = Math.max(60000, Math.min(86400000, Number(input.intervalMs) || 3600000));
  return {
    id: String(input.id || `automation-${now}-${Math.random().toString(36).slice(2, 8)}`),
    name: String(input.name || "Новая автоматизация").trim().slice(0, 80) || "Новая автоматизация",
    description: String(input.description || "").trim().slice(0, 240),
    enabled: input.enabled !== false,
    trigger,
    intervalMs,
    steps,
    createdAt: Number(input.createdAt) || now,
    updatedAt: now,
    lastRunAt: Number(input.lastRunAt) || 0,
    lastResult: String(input.lastResult || "").slice(0, 500),
  };
}

export function validateAutomation(automation) {
  if (!automation || !automation.name?.trim()) return { valid: false, error: "Укажи название." };
  if (!Array.isArray(automation.steps) || automation.steps.length === 0) return { valid: false, error: "Добавь хотя бы один шаг." };
  if (automation.steps.length > 24) return { valid: false, error: "Максимум 24 шага." };
  for (const [index, step] of automation.steps.entries()) {
    if (!AUTOMATION_STEP_TYPES[step.type]) return { valid: false, error: `Шаг ${index + 1}: неизвестный тип.` };
    if (step.type === "prompt" && !String(step.value || "").trim()) return { valid: false, error: `Шаг ${index + 1}: нужен ИИ-запрос.` };
    if (step.type === "memory" && !String(step.value || "").trim()) return { valid: false, error: `Шаг ${index + 1}: нужен текст памяти.` };
    if (step.type === "model" && !String(step.modelKey || "").trim()) return { valid: false, error: `Шаг ${index + 1}: выбери модель.` };
    if (step.type === "delay" && (!Number.isFinite(step.delayMs) || step.delayMs < 0)) return { valid: false, error: `Шаг ${index + 1}: неверная пауза.` };
  }
  return { valid: true };
}

export function interpolate(text, context = {}) {
  return String(text || "")
    .replace(/\{\{\s*input\s*\}\}/gi, String(context.input || ""))
    .replace(/\{\{\s*last\s*\}\}/gi, String(context.last || ""))
    .replace(/\{\{\s*model\s*\}\}/gi, String(context.model || ""));
}

export async function runAutomation(automation, handlers = {}, input = "") {
  const check = validateAutomation(automation);
  if (!check.valid) throw new Error(check.error);
  const ctx = { input: String(input || ""), last: "", model: "" };
  const outputs = [];
  for (const [index, step] of automation.steps.entries()) {
    if (handlers.onProgress) await handlers.onProgress(index, automation.steps.length, step);
    if (handlers.isCancelled?.()) throw new Error("AUTOMATION_CANCELLED");
    if (step.type === "prompt") {
      const result = await handlers.prompt?.(interpolate(step.value, ctx), ctx);
      ctx.last = String(result ?? "");
      outputs.push({ index, type: step.type, output: ctx.last });
    } else if (step.type === "model") {
      await handlers.model?.(step.modelKey, ctx);
      ctx.model = step.modelKey;
      outputs.push({ index, type: step.type, output: step.modelKey });
    } else if (step.type === "memory") {
      const value = interpolate(step.value, ctx);
      await handlers.memory?.(value, ctx);
      outputs.push({ index, type: step.type, output: value });
    } else if (step.type === "delay") {
      await new Promise(resolve => setTimeout(resolve, step.delayMs));
      outputs.push({ index, type: step.type, output: `${step.delayMs}ms` });
    }
  }
  return { text: ctx.last, outputs };
}
