# Regula

> Real-time regulatory intelligence platform for emerging-market FinTechs

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
- **Webhook integration** for custom integrations (Slack, Teams, custom systems)
- **Customizable filters** by severity, jurisdiction, category, and target

### 👥 Compliance Workspace
- **Alert management** with status tracking (new → triaged → actioned → closed)
- **Team collaboration** with assignments, comments, and notes
- **Audit-ready history** with complete regulatory change timeline
- **Advanced search & filtering** across all alerts and versions
- **Export capabilities** (CSV, PDF) for compliance reporting and audits

### 🏢 Enterprise-Ready Architecture
- **Multi-tenant SaaS** with complete data isolation
- **Role-based access control** (Admin, Analyst, Viewer roles)
- **Organization management** with invitations and member administration
- **Usage tracking & quotas** with configurable limits per subscription tier
- **Audit logging** for all critical actions

### 💳 Subscription & Billing
- **Flexible pricing tiers** (Free, Starter, Growth, Enterprise)
- **Usage-based metering** with quota tracking and warnings
- **Stripe integration** for secure payments and invoicing
- **Plan management** with easy upgrades and downgrades

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** with App Router and React Server Components
- **TypeScript** for type safety
- **Tailwind CSS** with custom design system
- **shadcn/ui** components built on Radix UI
- **React Hook Form** with Zod validation
- **Recharts** for data visualization

### Backend
- **Next.js API Routes** and Server Actions
- **PostgreSQL** database with **Drizzle ORM**
- **NextAuth.js v5** for authentication and session management
- **Inngest** for background job processing and workflows

### External Services
- **Firecrawl** for web scraping and content extraction
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
FIRECRAWL_API_KEY=your-firecrawl-api-key
GEMINI_API_KEY=your-google-gemini-api-key

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

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web UI     │  │  API Routes  │  │ Server Actions│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼────────┐  ┌─────▼─────┐
│  PostgreSQL  │  │  Inngest Workers│  │   Redis   │
│   Database   │  │  (Background)   │  │   Cache   │
└──────────────┘  └─────────────────┘  └───────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼────────┐  ┌─────▼─────┐
│  Firecrawl   │  │  Google Gemini  │  │    S3     │
│   (Crawler)  │  │      (LLM)      │  │  Storage  │
└──────────────┘  └─────────────────┘  └───────────┘
```

### Data Flow

1. **Target Monitoring**: Users configure regulatory targets (URLs) to monitor
2. **Crawl Execution**: Inngest workers trigger scheduled crawls via Firecrawl
3. **Version Storage**: Fetched content stored as versions in database and S3
4. **Change Detection**: Diff engine compares new version with previous version
5. **AI Analysis**: LLM generates summaries, classifications, and impact scores
6. **Alert Generation**: Alerts created and filtered based on user preferences
7. **Notification Delivery**: Alerts sent via email, webhook, or shown in inbox

### Key Services

The application is organized into service modules in `lib/services/`:

- **`firecrawl.ts`** - Web scraping and content extraction
- **`versions.ts`** - Version history management
- **`diff.ts`** - Change detection and comparison engine
- **`llm.ts`** - AI-powered summarization and analysis
- **`impact-scoring.ts`** - Relevance and impact scoring
- **`alerts.ts`** - Alert creation and management
- **`notifications.ts`** - Multi-channel notification delivery
- **`email.ts`** - Email template and sending logic
- **`adaptive-crawl.ts`** - Intelligent crawl scheduling
- **`stripe.ts`** - Payment and subscription management
- **`quotas.ts`** - Usage tracking and quota enforcement
- **`audit.ts`** - Audit logging for compliance

## 📁 Project Structure

```
regula/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Dashboard routes (protected)
│   │   ├── alerts/              # Alert management
│   │   ├── targets/             # Target configuration
│   │   ├── dashboard/           # Dashboard & metrics
│   │   └── settings/            # Settings pages
│   ├── api/                     # API routes
│   │   ├── alerts/              # Alert endpoints
│   │   ├── targets/             # Target management
│   │   ├── auth/                # Authentication
│   │   ├── billing/             # Stripe webhooks & billing
│   │   └── inngest/             # Inngest webhook handler
│   └── onboarding/              # User onboarding flow
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   └── ...                      # Feature components
├── lib/
│   ├── db/
│   │   ├── schema/              # Drizzle ORM schemas
│   │   └── migrations/          # Database migrations
│   ├── services/                # Business logic services
│   ├── auth/                    # Auth configuration
│   ├── inngest/                 # Background job functions
│   └── utils/                   # Utility functions
├── docs/                        # Project documentation
└── hooks/                       # React hooks
```

## 🔐 Security & Multi-Tenancy

- **Data Isolation**: Row-level security ensures complete tenant data separation
- **Authentication**: NextAuth.js with secure session management
- **Authorization**: Role-based access control (RBAC) at organization level
- **Encryption**: Sensitive data encrypted at rest and in transit
- **Audit Logging**: Complete audit trail for compliance and security
- **Rate Limiting**: Redis-based rate limiting to prevent abuse

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
- **`targets`** - Regulatory sources to monitor
- **`versions`** - Content snapshots with metadata
- **`alerts`** - Generated alerts with summaries and scores
- **`alert_assignments`** - Team assignment tracking
- **`subscriptions`** - Billing and plan information
- **`audit_logs`** - Compliance audit trail

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
- **ESLint** rules via Biome

## 🧭 Key Workflows

### Adding a New Target

1. User navigates to Targets page
2. Clicks "Add Target" and provides URL
3. System validates URL accessibility
4. Target created and first crawl scheduled
5. Inngest worker executes crawl via Firecrawl
6. Version stored and compared with baseline
7. If changes detected, alert generated and user notified

### Alert Lifecycle

1. **Detection**: Change detected in monitored target
2. **Analysis**: AI generates summary, classification, and impact score
3. **Filtering**: Alert evaluated against user preferences and thresholds
4. **Creation**: Alert added to inbox and notification queued
5. **Delivery**: Email/webhook sent, alert visible in inbox
6. **Management**: User can assign, comment, and update status
7. **Archive**: Closed alerts retained for audit and export

## 📚 Documentation

Additional documentation is available in the `docs/` directory:

- **Project Spec** - Business overview and problem statement
- **Technical Architecture** - Detailed architecture documentation
- **Functional Requirements** - Feature specifications
- **Business Requirements** - Business and compliance requirements
- **Use Cases** - User stories and workflows
- **Roadmap** - Product roadmap and milestones

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
