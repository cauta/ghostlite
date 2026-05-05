// Renders wrangler.toml files from .template siblings by substituting ${VAR}
// tokens with values from process.env. Idempotent — safe to re-run.
//
// Required env: PROJECT_NAME, DB_NAME, R2_NAME, KV_NAME, D1_ID, KV_ID, SITE_NAME
import fs from "node:fs";
import path from "node:path";

const TEMPLATES = [
  "apps/web/wrangler.toml.template",
  "workers/cron/wrangler.toml.template",
];

const REQUIRED = ["PROJECT_NAME", "DB_NAME", "R2_NAME", "KV_NAME", "D1_ID", "KV_ID", "SITE_NAME"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`render-wrangler: missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

for (const tpl of TEMPLATES) {
  if (!fs.existsSync(tpl)) continue;
  const out = tpl.replace(/\.template$/, "");
  const src = fs.readFileSync(tpl, "utf8");
  const rendered = src.replace(/\$\{([A-Z0-9_]+)\}/g, (_m, k) => {
    if (process.env[k] === undefined) {
      throw new Error(`${tpl}: unknown variable \${${k}}`);
    }
    return process.env[k];
  });
  fs.writeFileSync(out, rendered);
  console.log(`  rendered ${out}`);
}
