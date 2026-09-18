export function detectDeviceProfile() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const explicitProfile = (() => {
    try { return window.__QWEN_DEVICE_PROFILE_OVERRIDE__ || new URLSearchParams(location.search).get("profile") || ""; } catch { return ""; }
  })();
  const isPocoX6Pro = isAndroid && explicitProfile === "poco-x6-pro";
  const isNativeAndroid = isAndroid && window.__QWEN_NATIVE_ANDROID__ === true;
  const deviceMemoryGB = Number(navigator.deviceMemory || 0);
  const androidConstrained = isAndroid && deviceMemoryGB > 0 && deviceMemoryGB <= 4;
  const dpr = Number(window.devicePixelRatio || 1);
  const shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  const longSide = Math.max(screen.width || innerWidth, screen.height || innerHeight);
  // Safari intentionally does not expose the exact iPhone model. 393×852 @3x matches the
  // normal display-mode viewport family used by iPhone 14 Pro, so this is a tuning profile,
  // not a hardware identity claim.
  const matches14ProViewport = isIPhone && Math.abs(shortSide - 393) <= 4 && Math.abs(longSide - 852) <= 8 && dpr >= 2.8;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact = isIOS && Math.min(innerWidth, innerHeight) <= 430;
  return {
    isIOS,
    isIPhone,
    isAndroid,
    isPocoX6Pro,
    isNativeAndroid,
    deviceMemoryGB,
    androidConstrained,
    standalone,
    reducedMotion,
    compact,
    matches14ProViewport,
    id: matches14ProViewport ? "iphone14pro" : isIPhone ? "iphone" : isIOS ? "ios" : isPocoX6Pro ? "poco-x6-pro" : isNativeAndroid ? "android-native" : isAndroid ? "android" : "default",
    label: matches14ProViewport ? "iPhone 14 Pro · оптимизировано" : isIPhone ? "iPhone · мобильный профиль" : isIOS ? "iOS · мобильный профиль" : isPocoX6Pro ? "POCO X6 Pro · 12 ГБ · WebGPU" : isNativeAndroid ? `Android app${deviceMemoryGB ? ` · ~${deviceMemoryGB} ГБ RAM` : ""}` : isAndroid ? "Android · мобильный профиль" : "Стандартный профиль",
    autoContext: {
      mini: isPocoX6Pro ? 1536 : (isIOS || isAndroid) ? 1024 : 2048,
      lite: isPocoX6Pro ? 1536 : (isIOS || isAndroid) ? 1024 : 2048,
      stable: isPocoX6Pro ? 1536 : (isIOS || isAndroid) ? 1024 : 2048,
      fast: isPocoX6Pro ? 1536 : isIOS ? 1024 : (androidConstrained ? 1024 : isAndroid ? 1536 : 2048),
      max: isPocoX6Pro ? 1280 : 1024,
    },
    domMessageLimit: isPocoX6Pro ? 44 : isIOS ? 48 : isAndroid ? 64 : 90,
    typewriterFrameMs: isPocoX6Pro ? 32 : isIOS ? 34 : isAndroid ? 24 : 17,
    perfRefreshMs: isPocoX6Pro ? 500 : isIOS ? 360 : isAndroid ? 300 : 220,
    scrollThrottleMs: isPocoX6Pro ? 140 : isIOS ? 130 : isAndroid ? 100 : 70,
  };
}

export function effectiveMaxTokens(profile, key, requested, thinking = false) {
  if (profile?.isPocoX6Pro) {
    const cap = key === "mini" ? (thinking ? 180 : 260) : key === "lite" ? (thinking ? 220 : 320) : key === "max" ? (thinking ? 220 : 340) : key === "fast" ? (thinking ? 280 : 560) : (thinking ? 240 : 420);
    return Math.max(96, Math.min(Number(requested) || cap, cap));
  }
  if (!profile?.isIOS) return requested;
  const cap = key === "mini"
    ? (thinking ? 180 : 240)
    : key === "lite"
      ? (thinking ? 220 : 300)
    : key === "stable"
      ? (thinking ? 240 : 320)
    : key === "max"
      ? (thinking ? 260 : 340)
      : (thinking ? 320 : 420);
  return Math.max(128, Math.min(Number(requested) || cap, cap));
}

export function applyDeviceProfile(profile) {
  document.documentElement.dataset.deviceProfile = profile.id;
  document.documentElement.classList.toggle("is-ios", !!profile.isIOS);
  document.documentElement.classList.toggle("is-android", !!profile.isAndroid);
  document.documentElement.classList.toggle("is-native-android", !!profile.isNativeAndroid);
  document.documentElement.classList.toggle("is-poco-x6-pro", !!profile.isPocoX6Pro);
  document.documentElement.classList.toggle("is-standalone", !!profile.standalone);
  document.documentElement.style.setProperty("--ql-vh", `${window.innerHeight * 0.01}px`);
}
