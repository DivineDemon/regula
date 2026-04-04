# Regula Landing Page: Final Order, Arrangement, and Content

This document defines the final landing page structure using the current code components, with revised messaging to emphasize Regula's moat: **regulatory operations intelligence**, not just AI document tracking.

## Goals

- Position Regula as a full compliance operations system.
- Show defensibility through workflow depth (discovery -> detection -> action -> governance).
- Keep existing component architecture and route anchors intact.
- Improve conversion clarity for FinTech teams in emerging markets.

## Current Component Stack (In Code)

The landing page currently renders this component order in `app/page.tsx`:

1. `Navbar`
2. `Hero`
3. `Features`
4. `Comparison`
5. `Pricing`
6. `CTA` (desktop-xl only)
7. `Contact`
8. `Footer`

This order is strong and should remain. The primary update is content strategy and section framing.

## Final Page Order and Purpose

### 1) `Navbar` (Top Navigation + Intent Capture)

**Component:** `components/landing/navbar.tsx`  
**Anchor links:** `#features`, `#comparison`, `#pricing`, `#contact`  
**Primary CTA:** `Get Started` -> `/register`

**Final role**
- Keep nav compact and conversion-focused.
- Preserve current structure and mobile sheet behavior.
- Keep "Sign In" for existing users and "Get Started" for new prospects.

**Copy guidance**
- Keep labels as-is for simplicity.
- Optional future update: rename `Comparison` -> `Why Regula` if desired (requires anchor updates).

---

### 2) `Hero` (Category Claim + ICP Specificity)

**Component:** `components/landing/hero.tsx`

**Final role**
- Establish category ownership in first viewport:
  - Not "document monitoring tool"
  - A "Regulatory Ops platform for emerging-market FinTechs"
- Pair value claim with immediate trial CTA.

**Recommended headline direction**
- `Regulatory Operations for Emerging-Market FinTech Teams`

**Recommended subheadline direction**
- `Discover targets, crawl on a schedule you choose, detect material changes, and route them into triage workflows with history you can export—then measure engagement and coverage in Analytics.`

**Recommended trust/value chips under CTA** (keep aligned with `lib/plans.ts` + shipped UI)
- `Free: 3 targets · daily crawls (see Pricing)`
- `Impact scoring, diffs & version compare`
- `Analytics, audit logs, CSV/PDF export`

**CTA buttons**
- Primary: `Start Free`
- Secondary: `Log in`

**Demo media**
- Keep `HeroVideoDialog`; ensure the demo narrative shows full flow:
  1. target discovery,
  2. change detection,
  3. impact scoring,
  4. assignment/comment,
  5. audit/history.

---

### 3) `Features` (Moat Proof Through System Capabilities)

**Component:** `components/landing/features.tsx`  
**Current layout:** 6-card interactive grid

**Final role**
- Present the product as a connected system, not isolated features.
- Keep grid layout, but align each card to a specific moat pillar.

**Final section heading**
- `A Regulatory Operations System, Not a Document Watcher`

**Final section subheading**
- `From coverage discovery to compliance execution, Regula connects detection, intelligence, and team action in one workflow.`

**Final card set (using existing card count of 6)**

1. **Adaptive Regulatory Monitoring**
   - Continuous crawling, discovery, and schedule optimization by change patterns.
   - Emphasize jurisdiction/source complexity handling.

2. **Context-Aware AI Analysis**
   - AI summaries, classification, impact scoring, and key-entity extraction.
   - Emphasize actionable signal over raw diff noise.

3. **Version Intelligence & Evidence**
   - Version history, side-by-side compare, related version navigation.
   - Emphasize traceability and defensibility.

4. **Multi-Channel Delivery**
   - In-app, digest/immediate email, Slack/Teams, webhooks.
   - Emphasize "alerts where teams already work."

5. **Compliance Team Workspace**
   - Assignments, comments, tags, snoozes, false-positive lifecycle, bulk actions.
   - Emphasize accountability and execution velocity.

6. **Governance and Trust Controls**
   - Audit logs, consent, GDPR export/deletion, retention controls, role-aware access.
   - Emphasize enterprise readiness for regulated operators.

**Important content note**
- Replace or soften aspirational language that implies certifications not yet completed.
- Keep claims strictly implementation-true and verifiable from product behavior.

---

### 4) `Comparison` (Competitive Framing + Market Positioning)

**Component:** `components/landing/comparison.tsx`  
**Data source:** `lib/constants.ts` -> `comparisons`

**Final role**
- Show why Regula wins for your ICP:
  - emerging-market focus,
  - implementation speed,
  - affordability,
  - practical intelligence.

**Final section heading**
- `Why FinTech Teams Choose Regula`

**Final section subheading**
- Lead with **what Regula ships**: published tiers, crawl schedules, in-app analytics, and exportable history.
- State clearly that **other vendors are “Varies”** unless you maintain a sourced matrix; **do not publish estimated competitor pricing** or unverified capability absolutes (e.g. “competitor X cannot do Y”).

**Row strategy**
- **Regula column**: only claims you can trace to `lib/plans.ts`, product UI, and services (crawl frequencies, free tier limits, analytics, audit logs, compare, assignments, LLM pipeline).
- **Competitor columns**: prefer `Varies`, `partial`, or `Contact vendor` over invented setup times or dollar ranges.
- Moat rows that remain useful: workflow depth, version compare, collaboration, governance, analytics, LLM-assisted scoring.

**Compliance/legal caution**
- Add a short **disclaimer** under the table: illustrative comparison, not legal advice, human review where required.
- **Platform admin** (`/admin/kpis`) holds **internal** cohort metrics (e.g. time-to-first-action, false-positive signals)—use those for **private** GTM or investor updates unless you have a separate public methodology; the **public site** should not quote live percentages without a defined, stable disclosure process.

---

### 5) `Pricing` (Commercial Clarity + Upgrade Story)

**Component:** `components/landing/pricing.tsx`  
**Data source:** `lib/plans.ts`

**Final role**
- Translate product depth into clear, confidence-building pricing.
- Reinforce land-and-expand path:
  - Start free,
  - operationalize quickly,
  - upgrade for real-time scale.

**Final section heading**
- `Pricing That Scales With Compliance Maturity`

**Final section subheading**
- Tie copy to **verifiable plan limits** (targets, crawl cadence, retention, real-time vs digest) as implemented in `lib/plans.ts` and checkout—not vague “intelligence” superlatives.

**Plan communication guidance**
- **Free:** prove value with daily monitoring.
- **Starter ($39):** ideal first paid plan for early teams.
- **Growth:** real-time alerting and broader operational scale.
- **Enterprise:** unlimited + dedicated support + customization.

**Microcopy ideas**
- Keep "Start free. Upgrade when you need more coverage."
- Add concise reassurance line:
  - `No setup fees. No long-term lock-in.`

---

### 6) `CTA` (High-Intent Conversion Accelerator)

**Component:** `components/landing/cta.tsx`  
**Visibility:** currently hidden below `xl`

**Final role**
- Capture decision-ready visitors after pricing.
- Reframe from generic slogan to outcome promise tied to moat.

**Recommended headline**
- `Move From Regulatory Noise to Operational Clarity` (outcome-led; avoids unsubstantiated “AI” slogans)

**Recommended button copy**
- `Start free — monitor 3 targets today` (matches free-plan `targets: 3` in `lib/plans.ts`)

**Support text**
- `No credit card required`

**Responsive recommendation**
- Current desktop-only rendering is acceptable short term.
- Medium priority: make a mobile/tablet variant so all traffic sees this conversion moment.

---

### 7) `Contact` (Sales Assist + Pilot Funnel)

**Component:** `components/landing/contact.tsx`  
**Anchor:** `#contact`

**Final role**
- Convert high-intent buyers not ready for self-serve.
- Keep private beta/pilot language if still accurate.

**Final messaging focus**
- `Need jurisdiction-specific coverage or enterprise workflows? Talk to us.`
- Keep response-time expectation and support email.

**Form intent categories to consider later**
- `Pilot request`
- `Enterprise pricing`
- `Integration/API question`
- `Coverage request (country/regulator)`

---

### 8) `Footer` (Trust, Navigation, and Legal Completeness)

**Component:** `components/landing/footer.tsx`

**Final role**
- Reinforce trust and legal maturity.
- Preserve full legal route coverage (privacy, terms, security, cookies, DPA, AUP, disclaimer, subprocessors, support).

**Copy refinement**
- Keep concise brand statement.
- Optional update:
  - `Regulatory intelligence and compliance operations for emerging-market FinTechs.`

## Final Narrative Flow (How a Visitor Should Think)

1. **Hero:** "This is built for my exact regulatory context."
2. **Features:** "This is a full operating system, not a crawler."
3. **Comparison:** "This is a better fit than generic alternatives."
4. **Pricing:** "I can start now without procurement friction."
5. **CTA:** "I should try this immediately."
6. **Contact:** "If I need help, there is a direct path."
7. **Footer:** "This is credible and governance-ready."

## Messaging Pillars to Keep Consistent Across Sections

- **Coverage intelligence:** discovery + adaptive monitoring.
- **Actionable analysis:** summaries, classification, impact scoring.
- **Operational workflow:** assignment, triage, comments, lifecycle.
- **Evidence and trust:** version lineage, compare, audit readiness.
- **Emerging-market specialization:** explicit regional and regulator fit.
- **Accessible economics:** clear, SMB-friendly starting point.

## Suggested Content Blocks By Component (Ready for Copywriting)

### Hero
- Headline: category + ICP
- Subheadline: end-to-end value chain
- CTA: start free
- Proof points: 3 short moat chips

### Features
- 6 moat-aligned cards (see above)
- Each card: one promise line + one "why it matters" line

### Comparison
- Existing table + added workflow/governance rows
- Keep table scannable and non-hyperbolic

### Pricing
- Current plan cards from `PLAN_CONFIGS`
- Add short line clarifying who each tier is for

### CTA
- Outcome-focused one-liner
- Single clear action

### Contact
- "Talk to us" framing for complex implementations
- Keep low-friction form

## Implementation Notes (No Structural Rewrite Needed)

- Keep `app/page.tsx` order unchanged.
- Update section copy in-place in each landing component.
- Optional improvement: add mobile-visible variant of `CTA`.
- Validate all claims against implemented behavior before publishing.

## Success Criteria for This Landing Version

- A prospect can explain Regula as a **regulatory operations platform** in one sentence.
- The page clearly differentiates Regula from generic compliance trackers **using shipped behaviors** (crawl schedules, alerts, compare, exports, analytics)—not competitor teardowns or guessed pricing.
- Free-to-paid progression is obvious and **numerically aligned** with plan config.
- Governance and trust signals are visible without implying certifications or legal outcomes the product does not provide.
- Messaging stays accurate to shipped product capabilities; **testimonials** avoid “never miss / first to know” absolutes unless tied to real, attributable customers.

## Measured proof (where it lives)

- **Per-organization**: `/analytics` and dashboard metrics for operational review.
- **Platform-internal**: `/api/admin/kpis` and `FounderKpisClient` for cohort-style quality and engagement signals—treat as **internal instrumentation** until you publish a methodology for external claims.
