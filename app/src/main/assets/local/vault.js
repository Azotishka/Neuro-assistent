const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes) {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary);
}
function unb64(text) {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function deriveVaultKey(pin, saltB64 = null) {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto недоступен");
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey("raw", enc.encode(String(pin)), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return { key, salt: b64(salt) };
}

export async function encryptValue(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = enc.encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
  return { iv: b64(iv), data: b64(cipher) };
}

export async function decryptValue(key, encrypted) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(encrypted.iv) }, key, unb64(encrypted.data));
  return JSON.parse(dec.decode(plain));
}

export async function createVault(pin) {
  if (!pin || String(pin).length < 4) throw new Error("PIN должен быть не короче 4 символов");
  const { key, salt } = await deriveVaultKey(pin);
  const verifier = await encryptValue(key, { magic: "QWEN_LOCAL_VAULT_V1" });
  return { key, meta: { id: "__meta", salt, verifier, updatedAt: Date.now() } };
}

export async function unlockVault(pin, meta) {
  if (!meta?.salt || !meta?.verifier) throw new Error("Vault не настроен");
  const { key } = await deriveVaultKey(pin, meta.salt);
  const value = await decryptValue(key, meta.verifier);
  if (value?.magic !== "QWEN_LOCAL_VAULT_V1") throw new Error("Неверный PIN");
  return key;
}
