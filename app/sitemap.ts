import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

const PUBLIC_ROUTES: Array<{
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/legal/aup", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/cookies", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/disclaimer", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/dpa", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/privacy", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/security", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/subprocessors", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/support", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/terms", changeFrequency: "monthly", priority: 0.6 },
];

/** Paths emitted by `sitemap()` — used by SEO regression tests. */
export const SEO_SITEMAP_PATHS: readonly string[] = PUBLIC_ROUTES.map(
  (r) => r.path,
);

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, base).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
