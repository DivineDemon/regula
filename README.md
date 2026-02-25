<div align="center">
  <img src="./public/favicon.svg" alt="Regula Logo" width="120" height="120" />
  <h1>Regula</h1>
  <p>Real-time regulatory intelligence platform for emerging-market FinTechs</p>
</div>

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://www.postgresql.org/)

**Regula** is an automated regulatory monitoring and intelligence platform built specifically for FinTech startups and SMBs operating in emerging markets. It provides real-time tracking of regulatory changes, AI-powered impact analysis, and actionable alerts—enabling compliance teams to stay ahead of regulatory updates without the overhead of manual monitoring.

## 🎯 Problem Statement

Regulated businesses, especially FinTech startups in emerging markets, face critical challenges:

- **Constant regulatory changes** across fragmented sources (websites, PDFs, circulars, archives)
- **Heavy compliance burden** without dedicated legal teams
- **Existing RegTech solutions** exclude emerging markets (focus on US/EU/UK only)
- **High cost of non-compliance** including license risk, penalties, and service disruptions

Regula solves these by providing automated, real-time regulatory intelligence at an affordable price point.

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
- **Alert detail pages** with version comparison viewer
- **Audit-ready history** with complete regulatory change timeline via audit logs
- **Advanced search & filtering** across all alerts and versions
- **Export capabilities** (CSV, PDF) for compliance reporting and audits
- **Version comparison** with side-by-side diff viewing

### 🏢 Enterprise-Ready Architecture
- **Multi-tenant SaaS** with complete data isolation
- **Role-based access control** (Admin, Analyst, Viewer roles)
- **Organization management** with invitations and member administration
- **Usage tracking & quotas** with configurable limits per subscription tier
- **Usage dashboard** with detailed metrics and quota monitoring
- **Audit logging** for all critical actions with filtering and export
- **GDPR compliance** with data export and deletion capabilities
- **Consent management** for data processing
- **Data privacy** controls and settings

### 💳 Subscription & Billing
- **Flexible pricing tiers** (Free, Starter, Growth, Enterprise)
- **Usage-based metering** with quota tracking and warnings
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
- **Upstash Redis** for caching and rate limiting

### DevOps & Infrastructure
- **Vercel** for deployment and hosting
- **Drizzle Kit** for database migrations
- **Biome** for code formatting and linting
- **TypeScript** for type checking

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ or **Bun** (recommended)
- **PostgreSQL** database (local or managed like Neon, Supabase, or Vercel Postgres)
- **Redis** instance (local or Upstash)

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

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

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
- **`api-keys.ts`** - API key management
- **`compliance-health.ts`** - Compliance health scoring
- **`custom-alert-rules.ts`** - Custom alert rule engine
- **`content-discovery.ts`** - Content discovery and sitemap parsing
- **`content-relevance.ts`** - Content relevance scoring
- **`pattern-detection.ts`** - Pattern detection in regulatory content
- **`sitemap-discovery.ts`** - Sitemap discovery and parsing
- **`s3.ts`** - Document storage on AWS S3
- **`redis.ts`** - Redis caching and rate limiting
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
│   │   ├── alerts/              # Alert management & detail pages
│   │   ├── targets/             # Target configuration
│   │   ├── dashboard/           # Dashboard with chart components
│   │   └── settings/            # Settings pages
│   │       ├── profile/         # User profile settings
│   │       ├── organization/    # Org settings & member management
│   │       ├── billing/         # Subscription & billing
│   │       ├── notifications/   # Notification preferences
│   │       ├── usage/           # Usage dashboard
│   │       ├── audit-logs/      # Audit log viewer
│   │       ├── data-privacy/    # Data privacy settings
│   │       └── consent/         # Consent management
│   ├── api/                     # API routes
│   │   ├── alerts/              # Alert endpoints (CRUD, export, bulk)
│   │   ├── targets/             # Target management
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
- **Rate Limiting**: Redis-based rate limiting to prevent abuse
- **Legal Pages**: Terms of Service, Privacy Policy, Disclaimer, Data Processing Agreement, Acceptable Use Policy, Cookie Policy
- **GDPR Compliance**: Data export, deletion, and consent management capabilities

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
- `digest.ts` - Alert digest generation

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
- **AI Target Discovery**: LLM analyzes company profile to suggest relevant regulatory monitoring targets
- **Bulk Target Creation**: Selected targets automatically created in bulk
- **Profile Persistence**: Complete organization profile stored in database for future reference

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
7. **Comparison**: User can compare versions side-by-side
8. **Archive**: Closed alerts retained for audit and export

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

For support, email support@regula.com or open an issue in the repository.

## 🗺️ Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the product roadmap and upcoming features.

---

**Built with ❤️ for FinTech teams in emerging markets**
