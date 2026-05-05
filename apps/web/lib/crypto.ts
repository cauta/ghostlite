// AES-GCM encryption for secrets stored in D1.
//
// We keep email provider API keys and other small secrets out of plaintext
// D1 storage. The KEK (Key Encryption Key) lives in Wrangler secrets, so a
// D1 dump alone is useless.
//
// Format: base64(iv[12] || ciphertext || tag)

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKek(kek: string): Promise<CryptoKey> {
  // KEK is base64-encoded 32 bytes
  const raw = b64decode(kek);
  if (raw.length !== 32) {
    throw new Error("EMAIL_KEK must be 32 bytes (256 bits) base64-encoded");
  }
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(plaintext: string, kek: string): Promise<string> {
  const key = await importKek(kek);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return b64encode(out);
}

export async function decryptSecret(envelope: string, kek: string): Promise<string> {
  const key = await importKek(kek);
  const buf = b64decode(envelope);
  const iv = buf.slice(0, 12);
  const ct = buf.slice(12);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ct as BufferSource,
  );
  return new TextDecoder().decode(pt);
}
