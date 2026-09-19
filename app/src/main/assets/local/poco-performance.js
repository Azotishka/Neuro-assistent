const POCO_UA = /(?:poco[\s_-]*x6[\s_-]*pro|2311drk48[a-z]?)/i;

export function isPocoX6ProUserAgent(userAgent = "") {
  return POCO_UA.test(String(userAgent));
}

export function getPocoDefaults() {
  return {
    modelKey: "fast",
    context: "1536",
    thinking: false,
    runtime: "worker",
    tuningPreset: "speed",
    autoRelease: false,
  };
}

export function pocoMaxTokens(key, thinking = false, requested = 0) {
  const caps = {
    mini: thinking ? 180 : 260,
    lite: thinking ? 220 : 320,
    stable: thinking ? 240 : 420,
    fast: thinking ? 280 : 560,
    max: thinking ? 220 : 340,
    deepseek: thinking ? 240 : 420,
  };
  const fallback = caps[key] || 420;
  const value = Number(requested);
  return Math.max(96, Math.min(Number.isFinite(value) && value > 0 ? value : fallback, fallback));
}

export const POCO_PROFILE_VERSION = "1";
