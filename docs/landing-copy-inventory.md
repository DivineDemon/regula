# Landing page indexable copy inventory

**Route:** `/` (`app/page.tsx`)  
**Purpose:** Track crawler-visible landing copy and verify every canonical marketing string is present in server-rendered HTML.

**Last reviewed:** 2026-04-05

## How to read this doc

| Tag | Meaning |
|-----|--------|
| **Server** | Component file has no `"use client"`; copy is in a Server Component subtree. |
| **Client shell** | File has `"use client"`. In Next.js App Router, this still **SSR** to HTML unless the component is loaded with `ssr: false` (not used on the landing page). Crawlers that execute no JS still receive this HTML on first response. |
| **State-gated (DOM)** | Text is **not** in the initial DOM, or only one variant is mounted at a time; other variants appear only after client state changes. |
| **Motion-hidden** | Copy is in the DOM but styled hidden on initial paint. This should be avoided for canonical marketing copy. |
| **Interactive-only** | Labels/placeholders for forms; useful for UX; lower SEO weight than body copy. |

---

## 1. Page shell

| Location | Copy | Notes |
|----------|------|--------|
| `app/page.tsx` | (none — layout only) | Composes sections; no headings or paragraphs. |

---

## 2. Navbar — `components/landing/navbar.tsx`

**Client shell** (`"use client"`).

| Element | Copy |
|---------|------|
| Nav links (from `lib/constants.ts` `navbarItems`) | Features, Comparison, Pricing, Contact |
| Auth CTAs | Sign In, Get Started |
| Mobile sheet | SheetTitle: "Navigation"; SheetDescription: "Navigate to the sections of the website." |
| Mobile menu | Same anchor labels as desktop |

**State / motion:** Sheet copy is **state-gated** to open mobile menu (hidden in closed sheet — implementation-dependent; often still in DOM but off-screen). Scroll-driven width/blur is not copy.

---

## 3. Hero — `components/landing/hero.tsx`

**Server** (no `"use client"`).

| Element | Copy |
|---------|------|
| Eyebrow | Regulatory change monitoring |
| `h1` | Regulatory Operations for Emerging-Market FinTech Teams |
| Lead paragraph | Discover targets, crawl on a schedule you choose… Analytics. |
| Primary CTA | Start Free |
| Secondary CTA | Log in |
| Trust chips (`HERO_TRUST_CHIPS`) | Free: 3 targets · daily crawls (see Pricing); Impact scoring, diffs & version compare; Analytics, audit logs, CSV/PDF export |
| Video area | `HeroVideoDialog` **thumbnailAlt**: "Regula product demo: target discovery, change detection, impact scoring, team assignment, and audit history" |

**Child:** `components/ui/hero-video-dialog.tsx` is **Client shell**; play UI and dialog chrome are interactive. Marketing **alt** text is passed from Server `Hero`.

---

## 4. Features — `components/landing/features.tsx`

**Server.** Section `id="features"`.

### Static indexable blocks (always in DOM with section)

| Element | Copy |
|---------|------|
| `h2` | A Regulatory Operations System, Not a Document Watcher |
| Supporting paragraph | From discovery to triage and export, Regula connects detection… |
| Six feature cards | Each **h3** `title` + `description` from `FEATURES` (Adaptive Regulatory Monitoring, Context-Aware AI Analysis, etc.) |

**Motion:** Intro and card wrappers animate in-view, but do not use hidden initial styles for canonical copy.

### Demo panels (inside each card — mixed)

| Subcomponent | Indexable strings | State-gated (DOM) | Motion / other |
|--------------|-------------------|-------------------|----------------|
| `RealTimeMonitoringDemo` | Adaptive coverage; `{n} sources`; SBP, SECP, CBN, BNM; "Change detected on SBP" | **No** (all canonical strings are rendered in initial HTML). | Ping animations only |
| `AIPoweredAnalysisDemo` | Analysis pipeline with all stages listed; Impact Score 8.5/10; Priority High; Category Data Privacy; quoted retention sentence | **No** | Decorative animation only |
| `MultiChannelAlertsDemo` | In-app, Email, Slack, Teams, Webhook; "New regulatory update" per row | **No** | Decorative animation only |
| `VersionIntelligence` | Version lineage; Compare; Current / Previous; Circular v4/v3; diff lines; closing sentence | **No** for main copy. Highlight ring moves by index — all diff lines stay in DOM. | |
| `TeamCollaborationDemo` | Chat names (Sarah, You, Priya, …) and message bodies | **No** | Decorative styling only |
| `ComplianceReadyDemo` | Intro line; governance controls bullets | **No** | Hover scale on rows |

---

## 5. Comparison — `components/landing/comparison.tsx`

**Server.** Section `id="comparison"`.

| Element | Copy |
|---------|------|
| `h2` | Why FinTech Teams Choose Regula |
| Intro paragraph | The Regula column reflects what the product does today… |
| Table | Column headers: Feature, Regula, Regology, Corlytics, Gnowit |
| Body | All rows from `lib/constants.ts` `comparisons` (`feature` text + Regula/vendor cells as check/partial/text) |

**Motion:** None required for canonical copy.

---

## 6. Pricing — `components/landing/pricing.tsx`

**Server.** Section `id="pricing"`. Plan copy from `lib/plans.ts` `PLAN_CONFIGS` (names, `whoItsFor`, `features` bullets, prices).

| Element | Copy |
|---------|------|
| `h2` | Pricing That Scales With Compliance Maturity |
| Intro | Limits and quotas match what you see at checkout… |
| Per plan | `config.name`, `config.whoItsFor`, price + "/month", each `config.features` line |
| Badge | Popular (Starter) |
| Buttons | Get started free; Start free, upgrade anytime |
| Footnote | No separate setup fee… contact us (link to `#contact`) |

**Motion:** None required for canonical copy.

---

## 7. CTA — `components/landing/cta.tsx`

**Server.**

| Element | Copy |
|---------|------|
| `h2` (mobile + desktop) | Automate. / Simplify. Thrive |
| Primary button | Start free — monitor 3 targets today (`primaryCta`) |
| Support line | No credit card required |
| Desktop image | `alt`: Regula regulatory operations platform — start free |

**Motion:** None required for canonical copy. Two responsive variants (compact vs `xl` image block) both include the same headline/CTA strings.

---

## 8. Contact — `components/landing/contact.tsx`

**Server.** Section `id="contact"`.

| Element | Copy |
|---------|------|
| `h2` | Need help scoping coverage? |
| Body | Talk to us about target lists… 24 hours. Prefer email? + mailto link text (`SUPPORT.email` from env/constants) |
| Pilot card title | Pilot and enterprise assist |
| Pilot card body | We're onboarding teams that need more targets… |
| Pilot CTA | Request a pilot |
| Form | Labels: Name, Email, Message; placeholders: John Doe, john@example.com, Tell us how we can help… |
| Submit | Send Message / Sending… (submit state) |

**State:** "Sending..." is **state-gated** in `ContactForm`, but core section copy is server-rendered.

**Motion:** None required for canonical section copy.

---

## 9. Footer — `components/landing/footer.tsx`

**Server.**

| Element | Copy |
|---------|------|
| Brand | Regula (with logo) |
| Blurb | Crawler-backed monitoring, triage workflows, and exports… |
| Product links | Features, Comparison, Pricing, Contact (`#` anchors) |
| Legal links | Privacy Policy, Terms of Service, Security Policy, Cookies (`/legal/*`) |
| Copyright | © `{year}` Regula. All rights reserved. |

**Motion:** None required for canonical copy. **Note:** `new Date().getFullYear()` is rendered in HTML during SSR.

---

## 10. Related copy not on `/`

| Source | Status |
|--------|--------|
| `lib/constants.ts` → `testimonials` | **Not rendered** on the landing page (unused on `/`). |
| `components/landing/stats.tsx` | **Not imported** by `app/page.tsx`. If added later: stat **values** use `NumberTicker` (**Client shell**, animated numbers); **labels** (Continuous Monitoring, Uptime Guarantee, etc.) are static strings in that component. |

---

## 11. Current strict SEO status

1. Landing copy sections are now server-rendered (`Hero`, `Features`, `Comparison`, `Pricing`, `CTA`, `Contact`, `Footer`).
2. Canonical marketing strings used for SEO are present in initial HTML on `/` (validated by `tests/seo/release-gate.test.ts` HTTP checks).
3. Features motion wrappers avoid hidden initial states (`initial={false}`), removing first-paint ambiguity for crawler-visible text.
4. Pricing and JSON-LD stay synchronized through shared sources (`lib/plans.ts`, hero copy exports).
