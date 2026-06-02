import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { loadTheme } from "@/themes/loader";
import { getEnv, getOrigin } from "@/lib/cf";
import {
  getActiveThemeName,
  getPublishedPostBySlug,
  getSiteSettings,
  rowToPostFull,
} from "@/lib/db";
import { readPostBody } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { JsonLd } from "@/components/JsonLd";
import { getCanonicalUrl } from "@/lib/seo";
import { incrementPageView } from "@/lib/analytics";

export const runtime = "edge";

const getPublishedPostBySlugCached = cache(getPublishedPostBySlug);
const getSiteSettingsCached = cache(getSiteSettings);

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const env = getEnv();
  const [result, site] = await Promise.all([
    getPublishedPostBySlugCached(env.DB, params.slug),
    getSiteSettingsCached(env.DB),
  ]);
  if (!result) return {};

  const origin = getOrigin();
  const url = `${origin}/${result.row.slug}/`;
  const coverUrl = result.row.cover_key
    ? `${origin}/api/media/${result.row.cover_key}`
    : site.logo_key
      ? `${origin}/api/media/${site.logo_key}`
      : undefined;

  const metaTitle = result.row.seo_title || result.row.title;
  const description = (
    result.row.seo_description ||
    result.row.excerpt ||
    site.description ||
    ""
  ).slice(0, 160) || undefined;

  const publishedAt = result.row.published_at
    ? new Date(result.row.published_at * 1000).toISOString()
    : undefined;

  const firstTag = result.tags[0]?.name;

  return {
    title: metaTitle,
    description,
    alternates: {
      canonical: getCanonicalUrl(origin, `/${result.row.slug}/`),
    },
    openGraph: {
      type: "article",
      title: metaTitle,
      description,
      url,
      siteName: site.title,
      images: coverUrl ? [{ url: coverUrl }] : undefined,
      publishedTime: publishedAt,
      tags: firstTag ? [firstTag] : undefined,
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title: metaTitle,
      description,
      images: coverUrl ? [coverUrl] : undefined,
    },
  };
}

export default async function PostBySlug({ params }: { params: { slug: string } }) {
  const env = getEnv();
  const result = await getPublishedPostBySlugCached(env.DB, params.slug);
  if (!result) notFound();

  const [themeName, site, body, user] = await Promise.all([
    getActiveThemeName(env.DB),
    getSiteSettingsCached(env.DB),
    readPostBody(env.R2, result.row.body_key),
    getCurrentUser(),
  ]);
  const theme = await loadTheme(themeName);

  // Cache the body HTML in KV. Key includes published_at so an edit busts cache.
  const cacheKey = `post-html:${result.row.id}:${result.row.published_at}`;
  let bodyHtml = await env.KV.get(cacheKey);
  if (!bodyHtml) {
    bodyHtml = body;
    // Fire and forget; don't block render on cache write
    env.KV.put(cacheKey, bodyHtml, { expirationTtl: 3600 }).catch(() => {});
  }

  // Increment view counter server-side, skip for logged-in users (admin previews)
  if (!user) {
    const kvPromise = incrementPageView(env.KV, result.row.slug);
    const waitUntil = getRequestContext().ctx?.waitUntil?.bind(getRequestContext().ctx);
    if (waitUntil) {
      waitUntil(kvPromise);
    } else {
      kvPromise.catch(() => {});
    }
  }

  const post = rowToPostFull(result.row, bodyHtml, result.tags);
  const ctx = {
    site: {
      title: site.title,
      description: site.description,
      logoUrl: site.logo_key ? `/api/media/${site.logo_key}` : null,
    },
    theme: { config: {} },
    user: user ? { name: user.name, role: user.role } : null,
  };

  const origin = getOrigin();
  const postUrl = `${origin}/${result.row.slug}/`;
  const coverUrl = result.row.cover_key
    ? `${origin}/api/media/${result.row.cover_key}`
    : undefined;
  const logoUrl = site.logo_key ? `${origin}/api/media/${site.logo_key}` : undefined;
  const datePublished = new Date(result.row.published_at * 1000).toISOString();
  const dateModified = new Date(result.row.updated_at * 1000).toISOString();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: result.row.title.slice(0, 110),
    description: result.row.excerpt ?? undefined,
    ...(coverUrl ? { image: coverUrl } : {}),
    datePublished,
    dateModified,
    author: { "@type": "Person", name: result.row.author_name },
    publisher: {
      "@type": "Organization",
      name: site.title,
      ...(logoUrl ? { logo: { "@type": "ImageObject", url: logoUrl } } : {}),
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: result.row.title, item: postUrl },
    ],
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <theme.pages.Post {...ctx} post={post} pageType={result.row.type} />
    </>
  );
}
