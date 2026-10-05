(() => {
  const ua = navigator.userAgent || "";
  const pocoUserAgent = /(?:poco[\s_-]*x6[\s_-]*pro|2311drk48[a-z]?)/i.test(ua);
  const explicitProfile = (() => {
    try { return new URLSearchParams(location.search).get("profile") || ""; } catch { return ""; }
  })();
  if (explicitProfile) window.__QWEN_DEVICE_PROFILE_OVERRIDE__ = explicitProfile;
  else if (pocoUserAgent) window.__QWEN_DEVICE_PROFILE_OVERRIDE__ = "poco-x6-pro";
  const pocoTwa = (explicitProfile === "poco-x6-pro" || pocoUserAgent) && /Android/i.test(ua);
  if (pocoTwa) {
    window.__QWEN_ANDROID_TWA__ = true;
    window.__QWEN_ANDROID_CAPS__ = {
      native: false,
      twa: true,
      profile: "poco-x6-pro",
      memoryGB: Number(navigator.deviceMemory || 0),
      webgpu: !!navigator.gpu,
      secureContext: !!window.isSecureContext,
      userAgent: navigator.userAgent || "",
    };
    const firstRun = !localStorage.getItem("qwen:selected");
    if (firstRun) {
      localStorage.setItem("qwen:selected", "fast");
      localStorage.setItem("qwen:context", "1536");
      localStorage.setItem("qwen:thinking", "0");
      localStorage.setItem("qwen:modelTuningV1", JSON.stringify({
        "Qwen3-1.7B-q4f16_1-MLC": { preset: "speed", runtime: "worker", autoRelease: false },
      }));
    }
    document.addEventListener("DOMContentLoaded", () => {
      document.body.classList.add("twa-android-app");
      const install = document.getElementById("installBtn");
      if (install) install.hidden = true;
      const banner = document.getElementById("compatBanner");
      if (banner && !navigator.gpu) {
        banner.textContent = "Chrome не предоставляет WebGPU. Обнови Chrome и Android; локальные модели на этом устройстве не запустятся.";
        banner.classList.remove("hidden");
      }
    }, { once: true });
  }
  const capacitorPlatform = (() => {
    try { return window.Capacitor?.getPlatform?.() || ""; } catch { return ""; }
  })();
  const androidUA = /Android/i.test(ua);
  const webViewUA = /;\s*wv\)|\bwv\b/i.test(ua);
  const nativeMarker = /QwenLocalAndroid/i.test(ua);
  const nativeAndroid = nativeMarker || capacitorPlatform === "android" || (androidUA && webViewUA && ["localhost", "qwen.local"].includes(location.hostname));
  window.__QWEN_NATIVE_ANDROID__ = nativeAndroid;
  window.__QWEN_NATIVE_PLATFORM__ = nativeAndroid ? "android" : (capacitorPlatform || "web");
  if (!nativeAndroid) return;

  document.documentElement.dataset.nativeApp = "android";
  const memoryGB = Number(navigator.deviceMemory || 0);
  if (memoryGB > 0) window.__QWEN_DEVICE_MEMORY_GB__ = memoryGB;
  const firstRun = !localStorage.getItem("qwen:selected");
  if (firstRun) {
    // Tablet-first defaults: keep 8 GB-class tablets responsive while avoiding an oversized first load.
    const poco = window.__QWEN_DEVICE_PROFILE_OVERRIDE__ === "poco-x6-pro";
    const tablet = /Android/i.test(ua) && Math.min(screen.width || innerWidth, screen.height || innerHeight) >= 600 && (navigator.maxTouchPoints || 0) >= 2;
    const selected = poco ? "fast" : memoryGB > 0 && memoryGB <= 4 ? "lite" : "stable";
    localStorage.setItem("qwen:selected", selected);
    localStorage.setItem("qwen:context", poco ? "1536" : tablet ? "2048" : "1024");
    localStorage.setItem("qwen:thinking", "0");
    if (poco) localStorage.setItem("qwen:modelTuningV1", JSON.stringify({
      "Qwen3-1.7B-q4f16_1-MLC": { preset: "speed", runtime: "worker", autoRelease: false },
    }));
  }

  window.__QWEN_ANDROID_CAPS__ = {
    native: true,
    tablet: Math.min(screen.width || innerWidth, screen.height || innerHeight) >= 600 && (navigator.maxTouchPoints || 0) >= 2,
    memoryGB,
    webgpu: !!navigator.gpu,
    secureContext: !!window.isSecureContext,
    userAgent: ua,
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("native-android-app");
    const install = document.getElementById("installBtn");
    if (install) install.hidden = true;
    const banner = document.getElementById("compatBanner");
    if (banner && !navigator.gpu) {
      banner.textContent = "Android WebView не предоставляет WebGPU. Обнови Android System WebView/Chrome; локальные модели на этом устройстве не запустятся.";
      banner.classList.remove("hidden");
    }
  }, { once: true });
})();
