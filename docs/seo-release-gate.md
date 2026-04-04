# SEO verification and release gate

This runbook defines how we verify technical SEO before shipping changes that affect public marketing routes, metadata, or crawler-facing output.

## Automated checks

### Always-on (no running server)

From the repo root:

```bash
bun run test:seo
```

This exercises `app/robots.ts` and `app/sitemap.ts` in-process: disallow list parity, sitemap URL, and one row per public path with `changeFrequency`, `priority`, and `lastModified`.

These tests run on every push and pull request via `.github/workflows/seo-check.yml` without `SEO_CHECK_BASE_URL` (HTTP cases are skipped there).

### Optional HTTP regression (local or preview URL)

With the app reachable at a base URL (dev, preview, or production):

```bash
SEO_CHECK_BASE_URL=https://your-host.example bun run test:seo
```

Checks:

- First ~512 KiB of `/` includes canonical hero copy (same strings as `components/landing/hero.tsx`), `application/ld+json`, `Organization` and `SoftwareApplication` types, and a `rel="canonical"` link. Only a prefix of the body is read so the suite stays fast even when the HTML payload is large.
- `/login` HTML includes a `noindex` signal.
- `/sitemap.xml` parses and pathnames match `SEO_SITEMAP_PATHS` from `app/sitemap.ts`.
- `/robots.txt` references a sitemap and contains `Disallow: /login`.

## Manual QA checklist

Run before a release that touches landing, legal, or metadata:

1. **View source** on `/` (not only the Elements panel): confirm the hero headline and supporting paragraph appear as plain text in the initial HTML.
2. **Canonical**: on `/` and a sample legal page (for example `/legal/privacy`), confirm exactly one canonical URL and that it matches the true public origin (scheme + host + path).
3. **Robots meta**: confirm transactional routes (`/login`, `/register`, `/verify-email`, etc.) request `noindex` (and that public pages do not).
4. **Robots.txt**: open `/robots.txt` — allowed paths include `/` and `/legal/*`; disallowed prefixes include `/api/`, `/dashboard`, and auth routes; `Sitemap:` points at the production sitemap URL.
5. **Sitemap**: open `/sitemap.xml` — entries match the public marketing surface; no private or app-shell URLs.
6. **JSON-LD**: in view source, confirm the homepage `application/ld+json` block; spot-check that `name` / `description` align with visible copy (especially hero and product description).
7. **Internal links**: footer and nav link to all important public pages with descriptive anchor text.
8. **Rich results / audits** (periodic): run Search Console URL inspection or an external validator on the homepage JSON-LD; run Lighthouse or an equivalent technical SEO pass and note scores in the release notes when materially changed.

## Release gate criteria

A change may ship to production only if all of the following hold:

| Gate | Requirement |
|------|----------------|
| G1 — Automated static SEO | `bun run test:seo` passes in CI (robots + sitemap contract). |
| G2 — HTTP SEO (release candidate) | For the exact deployment candidate, `SEO_CHECK_BASE_URL` pointed at that host passes the full `test:seo` suite (no skipped HTTP tests). |
| G3 — No accidental index competition | No new public route that should stay private is missing from `robots` disallow or transactional `noindex` metadata without an explicit product decision. |
| G4 — Canonical discipline | Homepage and legal pages keep explicit canonicals; `metadataBase` / site URL env matches the deployed origin. |
| G5 — Structured data honesty | JSON-LD fields that duplicate visible copy stay in sync when marketing copy changes (hero exports in `hero.tsx` feed JSON-LD). |

**Waivers:** If G2 cannot run against preview (for example, no stable URL), run G2 manually against production immediately after deploy and file a follow-up to automate preview checks.

## Maintenance

- When adding a public marketing URL, extend `PUBLIC_ROUTES` in `app/sitemap.ts` (and confirm robots still allow it).
- When adding a private or auth surface, extend disallow prefixes in `app/robots.ts` and use `transactionalMetadata` (or equivalent) for `noindex`.
- When changing hero copy, update `components/landing/hero.tsx` exports used by `HomeJsonLd` so automated and manual checks stay aligned.
