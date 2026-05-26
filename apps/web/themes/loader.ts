import type { Theme, ThemeManifest } from "./theme.types";

// Static registry of built-in themes.
//
// To add a built-in theme: drop a folder under themes/<name>/ exporting a
// default Theme, and add an entry here keyed by its id.
//
// To support user-uploaded themes later: replace this map's body with a
// function that fetches the theme bundle from R2 and dynamically imports
// it. The call sites of loadTheme() don't change.
const REGISTRY: Record<string, () => Promise<{ default: Theme }>> = {
  default: () => import("./default"),
  editorial: () => import("./editorial"),
  solo: () => import("./solo"),
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

/**
 * Load every registered theme's manifest for the admin theme picker.
 *
 * This imports each theme module, which is cheap (a handful of small
 * components) and only ever runs on the settings page — never on a reader
 * request. The returned `name` is forced to the registry key so it always
 * matches what loadTheme() expects.
 */
export async function listThemeManifests(): Promise<ThemeManifest[]> {
  return Promise.all(
    Object.entries(REGISTRY).map(async ([id, importer]) => {
      const mod = await importer();
      return { ...mod.default.manifest, name: id };
    }),
  );
}
