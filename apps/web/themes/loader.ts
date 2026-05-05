import type { Theme } from "./theme.types";

// Static registry. v1 ships only "default".
//
// To add a built-in theme: drop a folder under themes/<name>/ exporting a
// default Theme, and add an entry here.
//
// To support user-uploaded themes later: replace this map's body with a
// function that fetches the theme bundle from R2 and dynamically imports
// it. The call sites of loadTheme() don't change.
const REGISTRY: Record<string, () => Promise<{ default: Theme }>> = {
  default: () => import("./default"),
};

export async function loadTheme(name: string): Promise<Theme> {
  const importer = REGISTRY[name] ?? REGISTRY.default;
  const mod = await importer();
  if (mod.default.manifest.apiVersion !== 1) {
    throw new Error(`Theme "${name}" uses unsupported apiVersion`);
  }
  return mod.default;
}

export function listAvailableThemes(): string[] {
  return Object.keys(REGISTRY);
}
