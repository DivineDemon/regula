# Page 1

🛠️
Regula - Roadmap & Milestones 
Plan
🎯 Goals of the Roadmap
Build the core product fast and lean (MVP)
Validate real usage & value with pilot customers
Build stable foundation and scale up features post-MVP
Grow traction, upgrade to paid, expand regionally, expand feature set
📆 Phases & Milestones (Month-by-Month / Quarter)
Phase 0 — Setup & Planning (Weeks −2 to 0)
Finalize architecture & technology stack (backend, crawler, DB, infra)
Set up basic CI/CD, dev environment, staging + production environments
Define minimal viable jurisdiction list for launch (e.g. Pakistan, MENA 
regulators)
Prepare legal/terms/disclaimer draft (preliminary)
Regula - Roadmap & Milestones Plan
1


---
# Page 2

Milestone 0.1 — Code repo + infra baseline, environments ready
Milestone 0.2 — Jurisdiction list & target regulator inventory compiled
Phase 1 — MVP Development (Months 1–2)
Deliver the minimal set of features to enable real regulatory monitoring + alerting.
Sprint
Features / Goals
Output / Milestone
1
User signup + org/tenant
setup + basic UI skeleton
Org creation flow, user roles, basic UI
2
Target configuration
(add/remove), scheduling,
basic crawler + HTML fetch
Ability to add regulator targets, trigger
first crawl
3
Change detection (diff engine)
+ version storage
Snapshot + diff detection works across
sample regulators
4
Summarization + impact
scoring (basic) + alert
generation + alert inbox
Basic alert generation with summaries &
UI display
5
Email notifications + basic
alert preferences (frequency,
severity) + simple dashboard
Alerts delivered; first-value delivery;
basic UX
6
Data isolation/multi-tenant
support + minimal security
(login, data separation)
MVP supports multiple orgs securely
Milestone 1.0 (MVP Launch) — After month 2: first usable build; ability to deliver 
alerts for at least a small set of regulators; usable by early adopter.
Phase 2 — Private Beta & Pilot Onboarding (Months 3–4)
Invite 5–10 initial pilot FinTech SMBs to test product
Add PDF/attachment fetching + parsing for regulator documents (not just 
HTML)
Build feedback loop: alert review, false-positive marking, user feedback flow
UI improvements: alert detail view, diff viewer, better readability
Regula - Roadmap & Milestones Plan
2


---
# Page 3

Milestone 2.0 — Beta Launch with pilot customers — collect feedback, usage 
data, iterate; prepare case studies/testimonials
Phase 3 — Public Launch & Core Feature Set Completion (Months 
5–7)
Build subscription & billing engine: free tier + Starter + Growth plans + 
payment integration
Add usage metering, quota tracking, plan upgrade/downgrade flows
Implement search/archive + export functionality (CSV / PDF) for alert history 
and evidence
Improve alert filtering & alert preferences (jurisdiction filters, severity 
thresholds)
Build retention & data lifecycle management (per plan retention policy)
Add webhooks / external integrations (Slack / Teams / Webhook) for 
notifications
Milestone 3.0 — Public Launch (v1.0) — After month 7: fully functional SaaS 
product, self-serve onboarding, payment enabled, alerting + export + basic 
integrations
Phase 4 — Growth & Feature Expansion (Months 8–12)
Harden infrastructure for scalability & reliability (horizontal scaling, backup, 
monitoring, alerting)
Enhance security → full audit logging, data encryption, compliance basics
Add advanced UI & UX: roles & permissions, team collaboration, comment 
threads, alert assignment, audit trails
Internationalization / localization support (if needed for non-English 
jurisdictions)
Build analytics & usage dashboards (for admin & org) — usage metrics, alert 
volumes, user activity, compliance health
Regula - Roadmap & Milestones Plan
3


---
# Page 4

Improve summarization & impact scoring with feedback-driven model (learn 
from false-positive flags)
Milestone 4.0 — v1.5 Release — Scalable release ready for growth; stable for 
small/mid-sized customers
Phase 5 — Enterprise Features & Market Expansion (Months 12–
18+)
Add enterprise-level features: SSO/SSAML, custom domain, SLA uptime 
guarantee, dedicated crawl pool (if needed), longer retention tiers
Expand jurisdiction/regulator coverage — new regions (MENA, South Asia, 
Africa), broader regulator list
Build compliance-workflow templates, policy mapping modules (optional add-
on)
Establish customer support & success processes (onboarding, support, 
documentation, FAQs)
Begin outbound enterprise sales & integrations (GRC tools, ticketing, audit 
systems)
Milestone 5.0 — v2.0 Enterprise-ready release — Target larger clients; support 
usage at enterprise scale; build long-term revenue growth
📈 Roadmap Timeline Summary
Phase 0     : –2 to 0 wks   → Setup & planning
Phase 1     : Months 1–2    → MVP Development
Phase 2     : Months 3–4    → Private Beta & Pilot
Phase 3     : Months 5–7    → Public Launch v1.0
Phase 4     : Months 8–12   → Growth & Feature Expansion v1.5
Phase 5+    : Months 12–18+ → Enterprise Features & Market Expansion v2.0
🧰 Key Milestones (for tracking & investors)
Regula - Roadmap & Milestones Plan
4


---
# Page 5

M1 — MVP ready (Alerting + basic crawling + UI)
M2 — Private Beta onboarded (5–10 pilot customers)
M3 — Public Launch with billing + self-serve
M4 — 100+ paying customers, stable platform
M5 — Enterprise-ready release, first enterprise client signed
⚠️ Contingencies & Buffers
Because you deal with external regulators’ websites (scraping, crawling), you 
should allocate buffer time in each phase for:
Handling anti-bot changes or crawling failures
Adapting to new site structures / regulator websites redesign
Extra QA and testing (for diff engine, summarization, alert correctness)
Plan for +1 month buffer around every major release milestone to accommodate 
these external dependencies.
📊 Gantt View
https://embed.figma.com/board/5FJiFzAZ4RuTD6ZiL2arHo/Regula-Roadma
p-Gantt-Chart?node-id=1-2&t=zVupyxzPk0yBbEuV-1&embed-host=notion&
footer=false&theme=system
Regula - Roadmap & Milestones Plan
5

