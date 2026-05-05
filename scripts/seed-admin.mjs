// Seeds an admin user into D1.
//
// Uses Node's webcrypto.subtle so the hash format matches what the Workers
// runtime produces in apps/web/lib/password.ts. This is the critical detail:
// hash format must be identical on both sides for verifyPassword() to work.
import { execSync } from "node:child_process";
import { webcrypto } from "node:crypto";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    db:       { type: "string" },
    email:    { type: "string" },
    password: { type: "string" },
  },
});

if (!values.db || !values.email || !values.password) {
  console.error("usage: seed-admin.mjs --db <name> --email <email> --password <pwd>");
  process.exit(1);
}

const ITERATIONS = 100_000;
const KEYLEN = 32;
const SALT_LEN = 16;

function b64encode(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function pbkdf2(password, salt, iterations, keylen) {
  const passwordKey = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    passwordKey,
    keylen * 8,
  );
  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LEN));
  const hash = await pbkdf2(password, salt, ITERATIONS, KEYLEN);
  return `pbkdf2$${ITERATIONS}$${b64encode(salt)}$${b64encode(hash)}`;
}

const id = webcrypto.randomUUID();
const hash = await hashPassword(values.password);
const now = Math.floor(Date.now() / 1000);
const email = values.email.replace(/'/g, "''");

const sql = `INSERT INTO users (id, email, name, password_hash, role, created_at)
             VALUES ('${id}', '${email}', 'Admin', '${hash}', 'admin', ${now})
             ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin'`;

execSync(`wrangler d1 execute ${values.db} --remote --command "${sql.replace(/\n/g, " ")}"`, {
  stdio: "inherit",
});

console.log(`  → admin user upserted: ${values.email}`);
