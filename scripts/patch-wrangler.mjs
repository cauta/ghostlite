// Replaces REPLACE_ME_* placeholders in wrangler.toml with real resource IDs.
// Idempotent: matches the placeholders, not the values.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    d1: { type: "string" },
    kv: { type: "string" },
  },
});

const files = ["wrangler.toml", "workers/cron/wrangler.toml"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let toml = fs.readFileSync(file, "utf8");
  let changed = false;

  if (values.d1 && toml.includes("REPLACE_ME_D1_ID")) {
    toml = toml.replace(/REPLACE_ME_D1_ID/g, values.d1);
    changed = true;
  }
  if (values.kv && toml.includes("REPLACE_ME_KV_ID")) {
    toml = toml.replace(/REPLACE_ME_KV_ID/g, values.kv);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, toml);
    console.log(`  patched ${file}`);
  }
}
