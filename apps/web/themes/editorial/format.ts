// Shared date helpers for the Editorial theme's components.
// Kept here so PostCard, FeaturePost, and PostPage format dates identically.

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isoDate(unix: number): string {
  return new Date(unix * 1000).toISOString();
}
