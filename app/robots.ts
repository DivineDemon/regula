import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Prefixes crawlers should not fetch (API, app shell, auth flows).
 * Public marketing stays allowed: `/`, `/legal/*`.
 */
const DISALLOW_PREFIXES = [
  "/accept-invitation",
  "/admin",
  "/alerts",
  "/analytics",
  "/api/",
  "/check-email",
  "/dashboard",
  "/forgot-password",
  "/login",
  "/onboarding",
  "/register",
  "/reset-password",
  "/settings",
  "/targets",
  "/verify-email",
] as const;

/** Same entries as `disallow` in `robots()` — used by SEO regression tests. */
export const SEO_ROBOTS_DISALLOW_PREFIXES: readonly string[] =
  DISALLOW_PREFIXES;

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      disallow: [...DISALLOW_PREFIXES],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
