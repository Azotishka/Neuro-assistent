let modulePromise = null;
async function loadTesseract() {
  if (!modulePromise) {
    modulePromise = import("https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js")
      .catch(() => import("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js"))
      .catch((err) => {
        // Allow a later retry after a temporary CDN/network failure.
        modulePromise = null;
        throw err;
      });
  }
  return modulePromise;
}

const STATUS_RU = {
  "loading tesseract core": "Загружаю ядро распознавания",
  "initializing tesseract": "Инициализирую распознавание",
  "loading language traineddata": "Загружаю языковые данные",
  "initializing api": "Готовлю распознавание",
  "recognizing text": "Распознаю текст",
};

async function prepareImage(file, maxSide = 2200) {
  if (!file || !String(file.type || "").startsWith("image/")) return file;
  let bitmap = null;
  try {
    if (typeof createImageBitmap !== "function") return file;
    bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (!longest || longest <= maxSide) return file;
    const scale = maxSide / longest;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .9));
    canvas.width = 1; canvas.height = 1;
    return blob || file;
  } catch {
    return file;
  } finally {
    try { bitmap?.close?.(); } catch {}
  }
}

export async function recognizeImage(file, { lang = "rus+eng", maxSide = 2200, onProgress } = {}) {
  onProgress?.({ status: "Оптимизирую изображение", progress: 0 });
  const prepared = await prepareImage(file, maxSide);
  const mod = await loadTesseract();
  const createWorker = mod.createWorker || mod.default?.createWorker;
  if (!createWorker) throw new Error("OCR-модуль не загрузился");
  const languages = String(lang).includes("+") ? String(lang).split("+").filter(Boolean) : lang;
  const worker = await createWorker(languages, 1, {
    logger: (m) => onProgress?.({ ...m, status: STATUS_RU[m?.status] || m?.status || "Распознаю текст" }),
  });
  try {
    const result = await worker.recognize(prepared);
    return result?.data?.text || "";
  } finally {
    await worker.terminate().catch(() => {});
  }
}
