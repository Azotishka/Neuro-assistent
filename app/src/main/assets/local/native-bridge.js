(() => {
  const explicitProfile = (() => {
    try { return new URLSearchParams(location.search).get("profile") || ""; } catch { return ""; }
  })();
  if (explicitProfile) window.__QWEN_DEVICE_PROFILE_OVERRIDE__ = explicitProfile;
  const pocoTwa = explicitProfile === "poco-x6-pro" && /Android/i.test(navigator.userAgent || "");
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
      localStorage.setItem("qwen:context", "auto");
      localStorage.setItem("qwen:thinking", "0");
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
  const ua = navigator.userAgent || "";
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
  const firstRun = !localStorage.getItem("qwen:selected");
  if (firstRun) {
    // Android hardware varies far more than iPhone. Start conservatively and let the user opt up.
    localStorage.setItem("qwen:selected", memoryGB > 0 && memoryGB <= 4 ? "lite" : "stable");
    localStorage.setItem("qwen:context", "1024");
    localStorage.setItem("qwen:thinking", "0");
  }

  window.__QWEN_ANDROID_CAPS__ = {
    native: true,
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
