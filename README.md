<div align="center">
  <img src="./public/favicon.svg" alt="Regula Logo" width="120" height="120" />
  <h1>Regula</h1>
  <p>Regulatory monitoring and operations workflows for FinTech teams—scheduled crawls, optional real-time alerts on paid tiers, in-app analytics</p>
</div>

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://www.postgresql.org/)

**Regula** is a multi-tenant regulatory monitoring product for FinTech teams: configurable crawls (daily to hourly by plan), diff-based change detection, LLM-assisted summaries and impact scoring, and alert workflows with assignments, comments, exports, and audit logs. **Real-time notifications** are available on Growth and Enterprise; Free and Starter use digest-friendly schedules. **Analytics** surfaces operational metrics (for example engagement and crawl-health signals) so teams can review outcomes in data rather than marketing claims alone.

## 🎯 Problem Statement

Regulated businesses, especially FinTech startups in emerging markets, face critical challenges:

- **Constant regulatory changes** across fragmented sources (websites, PDFs, circulars, archives)
- **Heavy compliance burden** without dedicated legal teams
- **Enterprise RegTech** is often sold as long-cycle programs with opaque pricing—harder to trial quickly at SMB scale
- **High cost of non-compliance** including license risk, penalties, and service disruptions

Regula addresses this with **published self-serve tiers** (including a free tier), crawler-backed monitoring for **sources you configure**, and workflow tooling your team can measure in-product (Analytics, usage, audit history)—not a substitute for legal advice or your own compliance program.

## ✨ Key Features

### 🔍 Automated Regulatory Monitoring
- **Multi-jurisdiction support** for emerging markets (Pakistan, MENA, South Asia, Africa)
- **Continuous crawling** of regulator websites with configurable schedules
- **Smart content discovery** with PDF and attachment handling
- **Adaptive crawl strategies** that optimize frequency based on change patterns

### 🤖 AI-Powered Change Detection
- **Intelligent diff engine** that identifies meaningful changes (not just text differences)
- **Structural comparison** of documents, sections, and attachments
- **Version history** with complete audit trail of all regulatory changes
- **Content relevance scoring** to filter noise and focus on actionable updates

### 📊 Intelligent Analysis & Summarization
- **AI-generated summaries** using Google Gemini for concise, actionable insights
- **Automatic classification** by regulatory category (AML, KYC, licensing, fees, etc.)
- **Impact scoring** to prioritize high-relevance changes
- **Entity extraction** for dates, fines, statute IDs, and key regulatory terms

### 🔔 Multi-Channel Alerting
- **In-app alert inbox** with filtering, sorting, and search
- **Email notifications** with immediate alerts or digest modes (daily/weekly)
- **Slack integration** with rich formatted messages and impact-based color coding
- **Microsoft Teams integration** with card-based notifications
- **Webhook integration** for custom integrations (Slack, Teams, custom systems)
- **Customizable notification preferences** per organization
- **Alert threshold filtering** (all, low, medium, high)
- **Customizable filters** by severity, jurisdiction, category, and target
- **Alert snoozing** to temporarily hide alerts until a specified date
- **Alert tags** for flexible organization and categorization

### 👥 Compliance Workspace
- **Alert management** with status tracking (new → triaged → actioned → closed)
- **Team collaboration** with assignments, comments, and notes
- **Alert detail pages** with version comparison viewer and **Version history** (related versions per target with Compare links)
- **Version comparison** page to compare any two versions side-by-side
- **Audit-ready history** with complete regulatory change timeline via audit logs
- **Advanced search & filtering** across all alerts and versions
- **Export capabilities** (CSV, PDF) for compliance reporting and audits
- **Version comparison** with side-by-side diff viewing

### 🏢 Enterprise-Ready Architecture
- **Multi-tenant SaaS** with complete data isolation
- **Role-based access control** (Admin, Analyst, Viewer roles)
- **Organization management** with invitations and member administration
- **Full organization profile editor** in Settings → Organization (edit company info, services, geographic operations, compliance mapping, and partnerships by section)
- **Usage tracking & quotas** with configurable limits per subscription tier
- **Usage dashboard** with detailed metrics and quota monitoring
- **Audit logging** for all critical actions with filtering and export
- **GDPR compliance** with data export and deletion capabilities
- **Consent management** for data processing
- **Data privacy** controls and settings

### 💳 Subscription & Billing
- **Flexible pricing tiers** (Free, Starter, Growth, Enterprise)
- **Free tier**: 3 targets, daily crawls, 30-day data retention
- **Usage-based metering** with quota tracking and warnings (80% and 100% notifications)
- **Stripe integration** for secure payments and invoicing
- **Plan management** with easy upgrades and downgrades
- **Payment method management** via Stripe
- **Invoice history** and download
- **Billing dashboard** with subscription details

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** with App Router and React Server Components
- **TypeScript** for type safety
- **Tailwind CSS 4** with custom design system and oklch color space
- **shadcn/ui** components built on **Base UI** and Radix UI
- **React Hook Form** with Zod validation
- **Recharts** with **shadcn/ui Chart** components for data visualization
- **Sonner** for toast notifications
- **next-themes** for dark mode support
- **@react-pdf/renderer** for PDF export generation

### Backend
- **Next.js API Routes** and Server Actions
- **PostgreSQL** database with **Drizzle ORM**
- **NextAuth.js v5** for authentication and session management
- **Inngest** for background job processing and workflows

### External Services
- **Crawl4AI** for web scraping and content extraction
- **Google Gemini** (via Generative AI SDK) for LLM-powered analysis
- **Stripe** for payment processing and subscription management
- **Resend** for transactional emails
- **AWS S3** for document storage
- **Upstash QStash** for HTTP messaging and schedules; **PostgreSQL** stores application cache entries and rate-limit counters

### DevOps & Infrastructure
- **Vercel** for deployment and hosting
- **Drizzle Kit** for database migrations
- **Biome** for code formatting and linting
- **TypeScript** for type checking

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ or **Bun** (recommended)
- **PostgreSQL** database (local or managed like Neon, Supabase, or Vercel Postgres)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/regula.git
   cd regula
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in the required environment variables (see [Environment Variables](#-environment-variables) section).

4. **Set up the database**
   ```bash
   # Generate migration files (if needed)
   bun run db:generate
   
   # Run migrations
   bun run db:migrate
   
   # Or push schema directly (development only)
   bun run db:push
   ```

5. **Start the development server**
   ```bash
   bun dev
   # or
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Database Setup

The project uses Drizzle ORM with PostgreSQL. Schema files are located in `lib/db/schema/`.

- **View schema in browser**: `bun run db:studio`
- **Generate migrations**: `bun run db:generate`
- **Apply migrations**: `bun run db:migrate`

## 📋 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/regula

# Authentication
AUTH_SECRET=your-auth-secret-here
NEXTAUTH_URL=http://localhost:3000

# External Services
CRAWL4AI_API_URL=https://your-crawl4ai-instance.com
GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL_NAME=gemini-2.5-flash

# Stripe (Billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_GROWTH=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# QStash (HTTP messaging / schedules — optional base URL for local dev)
QSTASH_URL=
QSTASH_TOKEN=
# Signing keys for verifying inbound QStash callbacks (receiver routes only)
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# AWS S3 (Document Storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=regula-documents

# Inngest (Background Jobs)
INNGEST_SIGNING_KEY=signkey-...
INNGEST_EVENT_KEY=eventkey-...
```

## 🏗️ Architecture Overview

### System Components

![Architecture Diagram](./public/architecture.png)

### Data Flow

1. **Target Monitoring**: Users configure regulatory targets (URLs) to monitor
2. **Crawl Execution**: Inngest workers trigger scheduled crawls via Crawl4AI
3. **Version Storage**: Fetched content stored as versions in database and S3
4. **Change Detection**: Diff engine compares new version with previous version
5. **AI Analysis**: LLM generates summaries, classifications, and impact scores
6. **Alert Generation**: Alerts created and filtered based on user preferences
7. **Notification Delivery**: Alerts sent via email, webhook, or shown in inbox

### Key Services

The application is organized into service modules in `lib/services/`:

- **`crawler.ts`** - Web scraping and content extraction (Crawl4AI)
- **`versions.ts`** - Version history management
- **`diff.ts`** - Change detection and comparison engine
- **`llm.ts`** - AI-powered summarization and analysis
- **`impact-scoring.ts`** - Relevance and impact scoring
- **`alerts.ts`** - Alert creation and management
- **`alert-snoozing.ts`** - Alert snoozing functionality
- **`alert-tags.ts`** - Tag-based alert organization
- **`alert-templates.ts`** - Alert template management
- **`alert-relationships.ts`** - Alert relationship tracking
- **`notifications.ts`** - Multi-channel notification delivery
- **`slack-integration.ts`** - Slack webhook integration
- **`teams-integration.ts`** - Microsoft Teams webhook integration
- **`webhook.ts`** - Generic webhook handler
- **`webhook-configs.ts`** - Webhook configuration management
- **`email.ts`** - Email template and sending logic
- **`adaptive-crawl.ts`** - Intelligent crawl scheduling
- **`stripe.ts`** - Payment and subscription management
- **`subscriptions.ts`** - Subscription plan management
- **`quotas.ts`** - Usage tracking and quota enforcement
- **`usage.ts`** - Usage metrics and reporting
- **`usage-warnings.ts`** - Quota warning notifications
- **`audit.ts`** - Audit logging for compliance
- **`dashboard.ts`** - Dashboard metrics aggregation
- **`analytics.ts`** - Analytics and reporting
- **`kpi.ts`** - Platform KPIs and North Star metrics (founder dashboard)
- **`api-keys.ts`** - API key management
- **`compliance-health.ts`** - Compliance health scoring
- **`custom-alert-rules.ts`** - Custom alert rule engine
- **`content-discovery.ts`** - Content discovery and sitemap parsing
- **`content-graph.ts`** - Content graph and version family ranking for adaptive crawl
- **`content-relevance.ts`** - Content relevance scoring
- **`customer-health.ts`** - Organization health scoring and low-engagement detection
- **`pattern-detection.ts`** - Pattern detection in regulatory content
- **`sitemap-discovery.ts`** - Sitemap discovery and parsing
- **`s3.ts`** - Document storage on AWS S3
- **`qstash.ts`** - QStash client for reliable HTTP delivery and schedules
- **`cache-store.ts`** - Postgres-backed application cache (used by `cache-helpers`)
- **`cache-helpers.ts`** - Cache utility functions
- **`gdpr.ts`** - GDPR compliance (data export/deletion)
- **`consent.ts`** - Consent management
- **`data-retention.ts`** - Data retention policies
- **`organization-profile.ts`** - Organization profile management (save, get, update, validate)

### UI Components

The application uses a comprehensive set of shadcn/ui components:

- **Layout**: `sidebar`, `card`, `separator`, `sheet`
- **Forms**: `form`, `field`, `input`, `textarea`, `select`, `combobox`, `label`, `input-group`
- **Buttons & Actions**: `button`, `dropdown-menu`, `alert-dialog`
- **Data Display**: `table`, `badge`, `empty`, `skeleton`, `progress`, `tooltip`
- **Charts**: `chart` (ChartContainer, ChartTooltip, ChartTooltipContent) with Recharts integration
- **Notifications**: `sonner` (toast notifications)
- **Theme**: Dark mode support via `next-themes` with system preference detection

## 📁 Project Structure

```
regula/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Dashboard routes (protected)
│   │   ├── alerts/              # Alert management, detail pages & version compare
│   │   ├── targets/             # Target configuration
│   │   ├── dashboard/           # Dashboard with chart components
│   │   └── settings/            # Settings pages
│   │       ├── profile/         # User profile settings
│   │       ├── organization/    # Org settings, profile editor & member management
│   │       ├── billing/         # Subscription & billing
│   │       ├── notifications/   # Notification preferences
│   │       ├── usage/           # Usage dashboard
│   │       ├── audit-logs/      # Audit log viewer
│   │       ├── data-privacy/    # Data privacy settings
│   │       └── consent/         # Consent management
│   ├── api/                     # API routes
│   │   ├── alerts/              # Alert endpoints (CRUD, export, bulk)
│   │   ├── targets/             # Target management & version history API
│   │   ├── versions/            # Version comparison & documents
│   │   ├── auth/                # Authentication & registration
│   │   ├── billing/             # Stripe webhooks & billing
│   │   ├── dashboard/           # Dashboard metrics
│   │   ├── gdpr/                # GDPR data export/deletion
│   │   ├── consent/             # Consent management API
│   │   ├── organizations/       # Org & member management
│   │   ├── notification-preferences/  # Notification settings
│   │   └── inngest/             # Inngest webhook handler
│   ├── onboarding/              # User onboarding wizard
│   ├── legal/                   # Legal pages (terms, privacy, etc.)
│   └── accept-invitation/       # Organization invitation acceptance
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components (Base UI & Radix)
│   └── ...                      # Feature components (dashboard-nav, etc.)
├── lib/
│   ├── db/
│   │   ├── schema/              # Drizzle ORM schemas (16 tables)
│   │   └── migrations/          # Database migrations
│   ├── services/                # Business logic services (30+ services)
│   ├── auth/                    # Auth configuration & roles
│   ├── inngest/                 # Background job functions
│   ├── utils/                   # Utility functions
│   └── constants.ts             # Application constants
├── docs/                        # Project documentation
└── hooks/                       # React hooks (use-mobile, etc.)
```

## 🔐 Security & Multi-Tenancy

- **Data Isolation**: Row-level security ensures complete tenant data separation
- **Authentication**: NextAuth.js v5 with secure session management
- **Authorization**: Role-based access control (RBAC) at organization level
- **Encryption**: Sensitive data encrypted at rest and in transit
- **Audit Logging**: Complete audit trail for compliance and security
- **Rate Limiting**: Postgres-backed fixed-window rate limiting to prevent abuse
- **Legal Pages**: Terms of Service, Privacy Policy, Disclaimer, Data Processing Agreement, Acceptable Use Policy, Cookie Policy, Security Policy, Subprocessors, Support SLA
- **GDPR Compliance**: Data export, deletion, and consent management capabilities
- **Security runbook**: [docs/security-runbook.md](docs/security-runbook.md) for dependency scanning, patching cadence, and penetration testing
- **Dependency audit**: Run `bun run audit` to check for known vulnerabilities in dependencies

## 🔄 Background Processing

The application uses **Inngest** for background job processing:

- **Crawl Jobs**: Scheduled crawls for all active targets
- **Diff Processing**: Change detection after new version capture
- **AI Analysis**: LLM-powered summarization and scoring
- **Notification Delivery**: Email and webhook delivery
- **Digest Generation**: Daily/weekly digest compilation

Inngest functions are defined in `lib/inngest/functions/`:
- `crawl.ts` - Target crawling workflow
- `adaptive-crawl.ts` - Intelligent crawl scheduling
- `digest.ts` - Alert digest generation (daily/weekly)
- `customer-success.ts` - 24h and 7-day onboarding check-in emails, low-engagement outreach
- `data-retention.ts` - Periodic data retention cleanup per plan

## 📊 Database Schema

Key database tables:

- **`organizations`** - Tenant/company information
- **`users`** - User accounts with authentication
- **`members`** - Organization membership and roles
- **`invitations`** - Organization invitation management
- **`targets`** - Regulatory sources to monitor
- **`versions`** - Content snapshots with metadata
- **`content_graphs`** - Content relationship graphs
- **`alerts`** - Generated alerts with summaries and scores
- **`alert_assignments`** - Team assignment tracking
- **`alert_comments`** - Alert comments and collaboration
- **`subscriptions`** - Billing and plan information
- **`usage_metrics`** - Usage tracking and quota monitoring
- **`audit_logs`** - Compliance audit trail
- **`notification_preferences`** - User notification settings

See `lib/db/schema/` for complete schema definitions.

## 🧪 Development

### Available Scripts

```bash
# Development
bun dev              # Start development server

# Building
bun run build        # Build for production
bun run start        # Start production server

# Code Quality
bun run lint         # Run Biome linter
bun run format       # Format code with Biome
bun run typecheck    # Type check with TypeScript

# Database
bun run db:generate  # Generate migration files
bun run db:migrate   # Run migrations
bun run db:push      # Push schema (dev only)
bun run db:studio    # Open Drizzle Studio

# Security
bun run audit        # Audit dependencies for known vulnerabilities
```

### Code Style

This project uses:
- **Biome** for linting and formatting (configured in `biome.json`)
- **TypeScript** strict mode for type safety
- **React Compiler** (Babel plugin) for automatic optimizations
- Component-based architecture with separated chart components
- Theme-aware design using CSS variables and oklch color space

## 🧭 Key Workflows

### User Onboarding

The enhanced onboarding system captures comprehensive fintech company information and uses AI to automatically discover relevant regulatory targets.

**Onboarding Flow:**

1. **User Registration**: User registers with email and creates organization
2. **Email Verification**: Verification email sent to confirm account
3. **8-Step Onboarding Wizard**:
   - **Step 1: Company Profile** - Legal entity name, registration details, fintech category, business model, company size
   - **Step 2: Services & Products** - Multi-select services offered (money transfer, payment processing, card issuance, etc.)
   - **Step 3: Geographic Operations** - Countries of operation with operation types, services per country, and regulatory license status
   - **Step 4: Compliance Mapping** - Service-country-compliance matrix and compliance frameworks (AML, KYC, GDPR, etc.)
   - **Step 5: Partnerships** - Banking partners, payment networks, remittance partners, technology partners
   - **Step 6: Review & Submit** - Summary review of all collected information
   - **Step 7: Target Discovery** - AI-powered discovery of relevant regulatory targets using LLM analysis
   - **Step 8: Target Selection** - Review and select discovered targets, with option to add manually

**Features:**
- **Auto-save**: Progress saved to localStorage for resume capability
- **Print Summary**: Print or save the review summary before submitting (Step 6)
- **Manual target add**: Add targets manually in Step 8 alongside AI-discovered ones
- **Reset onboarding**: Clear saved progress and restart the wizard if needed
- **AI Target Discovery**: LLM analyzes company profile to suggest relevant regulatory monitoring targets
- **Bulk Target Creation**: Selected targets automatically created in bulk
- **Profile Persistence**: Complete organization profile stored in database for future reference
- **Post-onboarding editing**: Full organization profile can be edited anytime in **Settings → Organization** (section-by-section: company, services, geographic operations, compliance mapping, partnerships)

### Adding a New Target

1. User navigates to Targets page
2. Clicks "Add Target" and provides URL, label, jurisdiction, category
3. System validates URL accessibility
4. Target created and first crawl scheduled
5. Inngest worker executes crawl via Crawl4AI
6. Version stored and compared with baseline
7. If changes detected, alert generated and user notified

### Alert Lifecycle

1. **Detection**: Change detected in monitored target
2. **Analysis**: AI generates summary, classification, and impact score
3. **Filtering**: Alert evaluated against user preferences and thresholds
4. **Creation**: Alert added to inbox and notification queued
5. **Delivery**: Email/webhook sent, alert visible in inbox
6. **Management**: User can assign, comment, and update status
7. **Comparison**: User can compare versions side-by-side (from alert detail or via Version history for the target)
8. **Version history**: Alert detail sidebar shows related versions for the same target with links to compare any two versions
9. **Archive**: Closed alerts retained for audit and export

### Dashboard Metrics

The dashboard provides real-time metrics including:
- **Key Metrics Cards**: Active alerts, targets, high-impact alerts, new alerts
- **Alerts Over Time**: Area chart showing alert trends
- **Alerts by Status**: Bar chart showing distribution across statuses
- **Alerts by Severity**: Bar chart showing high/medium/low distribution
- **Recent Alerts**: Latest alerts with quick access
- All charts use theme-aware colors (chart-1 through chart-5) and responsive design

## 📚 Documentation

Additional documentation is available in the `docs/` directory:

- **Project Spec** - Business overview and problem statement
- **Technical Architecture** - Detailed architecture documentation
- **Functional Requirements** - Feature specifications
- **Business Requirements** - Business and compliance requirements
- **Use Cases** - User stories and workflows
- **Roadmap** - Product roadmap and milestones
- **API Documentation** - Complete API reference (`docs/api.md`)
- **Onboarding Guide** - Step-by-step onboarding guide (`docs/onboarding-guide.md`)
- **Security Runbook** - Dependency scanning, patching cadence, and penetration testing (`docs/security-runbook.md`)
- **Security Implementation** - Implemented security features (`docs/security-implementation.md`)

## 📋 Documentation alignment & implementation inventory

This section maps `docs/` claims to the codebase and lists what is implemented in **app routes**, **API routes**, **components**, and **lib** services. It is a static audit (not load testing or SLA verification).

### Documentation vs codebase

#### `docs/functional-requirements.md` (FRD)

| Area | Status |
|------|--------|
| Registration, email verify, login | Implemented: auth pages + `app/api/auth/*` |
| Organizations, tenant isolation | Implemented: org APIs, member APIs, scoped queries |
| Targets (add/remove, metadata, history) | Implemented: targets UI + APIs + services |
| Crawl, attachments, async pipeline | Implemented: Inngest crawl, adaptive crawl, Crawl4AI, PDF paths, QStash |
| Diff / versions | Implemented: `lib/services/diff`, `versions`, compare APIs, viewers |
| LLM summary, classification, impact scoring | Implemented: `llm`, `impact-scoring`, `pattern-detection`, alerts pipeline |
| Notifications, digest, webhooks | Implemented: email, digest Inngest, webhook configs, Slack/Teams URL detection on webhooks |
| Search, export, retention | **Partial**: filters + CSV/PDF export APIs; retention services exist; NFR performance targets not proven from code alone |
| Billing, quotas, usage warnings | Implemented: Stripe, `lib/plans.ts`, usage, quotas, billing APIs |
| Security, RBAC, audit | Implemented: roles, audit service + UI, `proxy.ts` rate limits; **2FA not implemented** (FRD lists as future) |

#### `docs/project-spec.md`

Product positioning is marketing copy. Technical claims (crawling, AI diff, summaries, alerts, email, Slack/webhook, audit history, triage) match implemented services and UI.

#### `docs/api.md`

Documented endpoints align with `app/api/**` (e.g. organization profile, target discovery, bulk targets). Additional routes exist beyond the written API doc; see **Implemented surface** below and `app/api/docs/route.ts` where applicable.

#### `docs/onboarding-guide.md`

The 8-step wizard, profile fields, services, geography, compliance mapping, partnerships, AI discovery, and target selection match `components/onboarding/*` and organization profile APIs.

#### `docs/technical-architecture.md`

The file is largely a **structure/plan** (outline and todos), not a finished as-built spec. The repo is a **single Next.js app**, not a multi-package monorepo as some outlines suggest.

#### `docs/security-implementation.md`

| Topic | Note |
|-------|------|
| `middleware.ts` | **Outdated name**: request interception lives in **`proxy.ts`** (Next.js 16). |
| “No server actions” | **Partially outdated**: `app/actions.ts` exposes **`sendContactEmail`** for the landing contact form. |
| RLS pattern, bcrypt, rate limits, API helpers | Matches current patterns. |

#### `docs/non-functional-requirements.md` (NFR)

Throughput, SLA percentages, backup guarantees, and export latency targets are **operational/infra**; they are **not** verifiable from application source alone.

#### `docs/operational-model.md`

| Claim | Code |
|-------|------|
| Crawlers, queue, diff, LLM, notifications | Implemented |
| In-app LLM **support chatbot** | **Not implemented** (no chatbot routes/components) |
| Customer health / success | Partial: `customer-health`, `customer-success` Inngest, KPI services |
| Weekly digest | Implemented: `lib/inngest/functions/digest.ts` |

#### Legal / compliance docs (`docs/legal-requirements.md`, `app/legal/*`)

Legal routes exist (terms, privacy, disclaimer, DPA, cookies, AUP, security, support, subprocessors). Full copy audit across every email template is out of scope for this inventory.

#### Strategy / non-product docs

Files such as `business-model.md`, `competitive-analysis.md`, `gtm-playbook.md`, `roadmap.md`, `risk-plan.md`, `use-cases.md`, `docs/potential-leads/*.csv` describe **business or sales context**, not shipped product features.

#### `docs/adaptive-crawling-generated-sitemap.md`

Aligns with `lib/crawl/*`, `lib/services/content-graph.ts`, `lib/services/adaptive-crawl.ts`, and Inngest adaptive crawl.

---

### Implemented surface (inventory)

#### App Router — pages

- **Marketing**: `/` — landing (hero, features, pricing, contact + server action, CTA, footer, etc.).
- **Auth**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/check-email`, `/accept-invitation`.
- **Dashboard**: `/dashboard`, `/analytics`, `/targets`, `/alerts`, `/alerts/[id]`, `/alerts/compare`, `/onboarding`.
- **Settings**: profile, organization (incl. org profile editor), organization members, billing, notifications, consent, data privacy, audit logs, incidents.
- **Admin**: `/admin/kpis` (platform admin).
- **Legal**: terms, privacy, cookies, AUP, disclaimer, DPA, support, security, subprocessors.

#### API routes (`app/api/**`)

Auth & users; organizations (CRUD, switch, profile, members, invitations); targets (CRUD, validate, discover, bulk, trigger crawl, versions); alerts (CRUD, filters, bulk, **CSV/PDF export**, categories, jurisdictions, comments, tags, relationships, snooze, false-positive); versions (compare, document, **proxy-document**); analytics + analytics export; dashboard metrics; billing (Stripe, checkout, subscription, payment methods, invoices, sync, webhook); settings (profile, organization, usage); consent; GDPR export/deletion; API keys; webhook configs; `webhooks/notify`; custom alert rules; alert templates; alert-tags; notification-preferences; audit logs; incidents; admin KPIs; Inngest; API docs route.

#### Components (`components/**`)

Dashboard, landing, full onboarding stack, targets, alerts (list, detail, viewers, compare, version history, assign), analytics charts, settings (billing, notifications, consent, data privacy, audit, members, org profile, incidents), organizations (switcher, create), auth flows, invitation/check-email, profile form, usage client, shared nav/cookie/error utilities, shadcn UI primitives.

#### `lib/` services & jobs (representative)

Alerts, analytics, audit, adaptive crawl, API keys, cache, consent, content discovery/graph/relevance, crawler stack, customer health, custom alert rules, dashboard, data retention, diff, email, GDPR, impact scoring, KPI, LLM, notifications (+ Slack/Teams helpers), organization profile, pattern detection, quotas, QStash, S3, Stripe, subscriptions, usage, usage warnings, versions, webhooks, compliance-health, alert templates/tags/relationships/snoozing, crawl modules under `lib/crawl/`.

#### Background jobs (`lib/inngest/functions/`)

`crawl`, `adaptive-crawl`, `digest`, `data-retention`, `customer-success`.

#### Cross-cutting

- **`proxy.ts`**: session checks for protected routes, API rate limiting (replaces legacy `middleware.ts` naming in older docs).
- **`lib/auth`**: NextAuth, roles, platform admin.

#### API-only (no dedicated settings UI found)

**API keys**, **webhook configuration**, **custom alert rules**, and **alert templates** have REST APIs and services; there are no dedicated dashboard components for managing them (integrations may use the API or future UI).

### Known gaps & doc drift

- **Support chatbot** (`docs/operational-model.md`): not in repo.
- **2FA / enterprise SSO**: not implemented in code (FRD allows “future”).
- **NFR** numeric targets: require ops/load testing, not code review alone.
- **`docs/security-implementation.md`**: should reference **`proxy.ts`** and the contact **server action** in `app/actions.ts` when updating that doc.

### Deep codebase inventory (complete analysis snapshot)

This section captures a full codebase pass across `app/**`, `components/**`, `lib/**`, `docs/**`, and project config.

#### 1) Product surfaces and implemented features

- **Public marketing**: `/` with landing sections (`Navbar`, `Hero`, `Features`, `Comparison`, `Pricing`, `CTA`, `Contact`, `Footer`).
- **Legal pages**: `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/aup`, `/legal/disclaimer`, `/legal/dpa`, `/legal/security`, `/legal/subprocessors`, `/legal/support`.
- **Auth lifecycle**: `/login`, `/register`, `/verify-email`, `/check-email`, `/forgot-password`, `/reset-password`, `/accept-invitation`.
- **Onboarding**: `/onboarding` multi-step flow (profile capture -> review -> AI discovery -> target selection).
- **Core app**: `/dashboard`, `/targets`, `/alerts`, `/alerts/[id]`, `/alerts/compare`, `/analytics`.
- **Settings/governance**: profile, organization, members, billing, notifications, consent, data privacy, audit logs, incidents.
- **Platform admin**: `/admin/kpis`.

#### 2) API surface (major groups)

- **Auth**: register, invitation register, verify email, forgot/reset password, token validation, resend verification, NextAuth handlers.
- **Organizations**: create/switch org, org profile CRUD-ish endpoints, members/invitations management.
- **Targets**: list/create/update/delete, validate URL, discover targets from org profile, bulk create, trigger crawl, version history.
- **Alerts**: list/filter/detail/update, comments, assignments, snooze, tags, relationships, false-positive, bulk actions, categories, jurisdictions, CSV/PDF export.
- **Versions/documents**: version read/compare/document endpoints and `proxy-document`.
- **Analytics/dashboard**: analytics queries and exports, dashboard metrics.
- **Billing**: checkout, sync, subscription read/update, payment methods, invoices, Stripe webhook.
- **Compliance/privacy**: consent APIs, GDPR export/deletion, audit log APIs.
- **Additional APIs**: API keys, webhook configs, custom alert rules, alert templates, alert tags, notification preferences, admin KPIs, Inngest route, OpenAPI docs route.

#### 3) Background processing and automation

- **Inngest functions registered**: crawl, schedule crawls, adaptive crawl, daily digest, weekly digest, data retention cleanup, customer-success outreach functions.
- **Pipeline**: target crawl -> version store -> diff detection -> AI summarization/classification/impact -> alert generation -> notifications -> usage/quota checks.
- **Scheduling**: hourly crawl scheduling, daily/weekly digest cadences, nightly retention cleanup.

#### 4) Data model inventory (stored entities)

- **Auth/identity**: `users`, `accounts`, `sessions`, `verificationTokens`.
- **Tenancy/access**: `organizations`, `organization_members`, `invitations`.
- **Monitoring domain**: `targets`, `versions`, `alerts`, `alert_assignments`, `alert_comments`, `alert_feedback`.
- **Alert extensions**: `alert_tags`, `alert_tag_assignments`, `alert_relationships`, `alert_templates`, `custom_alert_rules`.
- **Governance/ops**: `audit_logs`, `notification_preferences`, `gdpr_requests`, `user_consents`, `incidents`, `feedback`.
- **Billing/usage**: `subscriptions`, `usage_metrics`, `api_keys`, `webhook_configs`.
- **Infra/meta**: `content_graphs`, `content_nodes`, `content_edges`, `kv_cache`, `rate_limit_entries`.

#### 5) Core service map (`lib/services/**`)

- **Crawl/intelligence**: `crawler`, `adaptive-crawl`, `content-discovery`, `content-graph`, `pattern-detection`, `content-relevance`, `sitemap-discovery`.
- **Versioning/diffs/alerts**: `versions`, `diff`, `alerts`, `impact-scoring`, `llm`, plus alert rule/template/tag/relationship/snooze services.
- **Notifications/delivery**: `notifications`, `email`, `webhook`, `webhook-configs`, Slack/Teams integrations.
- **SaaS operations**: `analytics`, `dashboard`, `kpi`, `customer-health`, `quotas`, `usage`, `usage-warnings`, `subscriptions`, `stripe`, `plans`.
- **Privacy/compliance**: `audit`, `consent`, `gdpr`, `data-retention`, organization profile persistence/validation.
- **Infrastructure**: `cache-store`, `cache-helpers`, `qstash`, `s3`.

#### 6) UI/component inventory (`components/**`)

- **Landing**: marketing section components including pricing/contact.
- **Dashboard/analytics**: KPI widgets, charts, founder KPI admin client.
- **Alerts**: list/detail clients, document viewer, version compare/history, assignment dialog.
- **Onboarding**: wizard orchestration, step components (1-8), profile summary/export, manual target add.
- **Settings**: billing, notifications, consent, data privacy, members/invites, audit logs, org profile settings.
- **Incidents/targets/organizations**: dedicated management clients/dialogs/tables.
- **Shared/providers/ui**: nav user + org switching, cookie consent banner, theme/session/toaster providers, shadcn-style primitives and utility components.

#### 7) Integrations and external systems

- **Core**: PostgreSQL (Drizzle), NextAuth, Inngest, Stripe, Resend, AWS S3, Gemini (`@google/generative-ai`), Crawl4AI API.
- **Additional**: Slack/Teams webhooks, generic webhook delivery, Upstash QStash client.

#### 8) Auth, authorization, and data boundaries

- **AuthN**: NextAuth Credentials with JWT sessions; session context read via `auth()`.
- **Tenant scoping**: org membership checks (`organization_members`) through helpers like `requireOrgAccess` / tenant utilities.
- **Role checks**: org admin checks for privileged settings/billing/incidents paths; platform admin checks for founder KPIs.
- **Protection layer**: `proxy.ts` handles route protection and API rate limiting with DB-backed fixed windows.
- **Compliance controls**: consent management, GDPR export/deletion flows, audit logging, plan-driven retention cleanup.

#### 9) Gaps and risk signals (implementation-level)

- OpenAPI docs include API key auth semantics, but most route enforcement is session-based in current handlers.
- Some endpoints are intentionally public and require abuse-hardening review (`/api/users/check`, `/api/targets/validate`, webhook notify receiver).
- `proxy-document` performs authenticated server-side URL fetching and should continue to be tightly constrained.
- Multi-org context selection is inconsistent in parts of settings/dashboard logic (cookie-selected org vs first-org patterns).
- Migration metadata snapshots appear behind latest journal entries in `lib/db/migrations/meta/`.
- A few unused/deprecated component paths exist (for example, orphaned or superseded UI helpers).

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@regula.mushoodhanif.com or open an issue in the repository.

## 🗺️ Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the product roadmap and upcoming features.

---

**Built with ❤️ for FinTech teams in emerging markets**
