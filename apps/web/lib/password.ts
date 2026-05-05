// Password hashing for the Workers runtime.
//
// We use PBKDF2-SHA256 via Web Crypto. It's available everywhere Workers run,
// has no native dependencies, and is conservative.
//
// Format: pbkdf2$<iterations>$<salt-b64>$<hash-b64>
//
// We accept seed-script hashes prefixed `scrypt$...` (produced by Node's
// scryptSync in seed-admin.mjs) and verify them using a small re-implementation
// path... but actually doing scrypt in Workers is not supported, so the seed
// script also produces a PBKDF2 hash. Keep both formats here for defense.

const ITERATIONS = 100_000; // Reasonable for edge; tune if you measure latency.
const KEYLEN = 32;
const SALT_LEN = 16;

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64decode(s: string): Uint8Array {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keylen: number,
): Promise<Uint8Array> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    passwordKey,
    keylen * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const hash = await pbkdf2(password, salt, ITERATIONS, KEYLEN);
  return `pbkdf2$${ITERATIONS}$${b64encode(salt)}$${b64encode(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = parseInt(parts[1], 10);
  if (!iterations || iterations < 1000) return false;

  const salt = b64decode(parts[2]);
  const expected = b64decode(parts[3]);
  const actual = await pbkdf2(password, salt, iterations, expected.length);

  // Constant-time compare
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
