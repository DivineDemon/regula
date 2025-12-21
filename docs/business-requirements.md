# Page 1

👨🏻‍💼
Regula - Business Requirements
1. Purpose & Scope
Purpose:
To deliver a SaaS platform that enables SMB FinTechs (especially in emerging 
markets) to monitor regulatory changes in real-time, receive prioritized actionable 
alerts, and manage compliance workflows — without hiring expensive 
legal/compliance staff.
Scope:
Monitor regulator websites (publicly listed, across multiple jurisdictions)
Detect changes (new laws, amendments, guidance updates, PDF/attachment 
updates)
Summarize changes, assess impact, and map to business-relevant obligations
Notify users via alerts, digests, or webhooks
Provide a compliance-management workspace: track alerts, history, status 
(new/triaged/closed), audit log
Support multi-tenant SaaS with role-based access for organizations
Offer user onboarding, self-serve and minimal friction
Regula - Business Requirements
1


---
# Page 2

Include exporting / audit-ready reporting
2. Business Requirements Overview (High-Level)
ID
Requirement
Description / Rationale
BR-01
Support multiple jurisdictions
Users should be able to monitor
regulators in any supported country
(initial focus: Pakistan, MENA, South Asia)
— to serve emerging-market FinTechs.
BR-02
Real-time / near-real-time
monitoring
Regulation changes sometimes produce
urgent compliance risk; delay = risk.
BR-03
Low onboarding friction
Target users often lack compliance/legal
teams; the tool must be usable without
consultancy.
BR-04
Affordable for SMBs
Many potential customers have small
budgets → pricing must stay SMB-
friendly.
BR-05
Deliver actionable alerts (not
noise)
Key pain: sifting through noise; users
need only relevant, high-impact updates.
BR-06
Provide compliance
workflow & audit trail
Compliance isn’t just about alerts —
companies need to assign, track,
document, and audit.
BR-07
Scalable across many
customers
As number of customers / jurisdictions
grows, system must remain performant
and cost-effective.
BR-08
Data retention & export for
audits
Clients may need regulatory history for
internal/external audits or legal
compliance.
BR-09
Secure, multi-tenant data
isolation & access control
Data for different organizations must stay
isolated; privacy & security is critical.
BR-10
Flexible pricing & usage
model
To scale from smallest startups to larger
firms; predictable pricing + usage-based
components.
BR-11
Support legal & compliance
disclaimers / liability handling
Since we monitor public regulatory
content and offer summaries, need clear
Regula - Business Requirements
2


---
# Page 3

ID
Requirement
Description / Rationale
disclaimers and legal compliance design.
3. Functional Requirements (High-Level — to be 
expanded later)
Here’s a high-level section that bridges into functional spec. (We’ll later translate 
into FRD + user stories.)
User & Org Management — registration, authentication, org creation, user 
roles (admin, viewer, analyst, etc.)
Target / Jurisdiction Configuration — ability to add/remove regulator URLs 
per org; specify jurisdictions & regulatory categories
Crawler / Monitoring Engine — schedule & manage crawls, fetch HTML/PDF, 
detect changes, store version history
Change Detection & Diff Engine — structural diff, “what changed” extraction 
(headings, paragraphs, attachments)
NLP & Impact Analysis — summarization, classification (regulation type, 
urgency), impact scoring, tagging
Alerting & Notification — real-time alerts, daily/weekly digests, email 
notifications, webhook/Slack/Teams integration
Compliance Workspace / Dashboard — inbox of alerts, status tracking (new / 
triaged / actioned / closed), assigning tasks, comments, audit log
Search & Archive — full-text search across history, filtering by 
jurisdiction/date/severity, export (CSV/PDF)
Subscription & Billing Engine — tiered plans, usage tracking (crawl/alert 
credits), upgrade/downgrade, add-ons
Security & Access Control — data isolation per tenant, encryption, secure 
storage, role-based permissions
Onboarding Wizard & UX — easy setup: add jurisdiction(s), add regulators, 
configure alert preferences, run first scan
Regula - Business Requirements
3


---
# Page 4

Support & Feedback Mechanism — user feedback, false-positive reporting, 
reporting issues, support tickets
4. Non-Functional / Quality Requirements (Summary — 
full list later)
Some of the high-level non-functional requirements:
Performance — Crawl + diff + alert pipeline must handle many regulators and 
customers; typical detection latency < 1 hour.
Reliability / Availability — System uptime ≥ 99.5% (SLA for enterprise users), 
automatic retries for failed crawls.
Scalability — Horizontal scalability for both crawling infrastructure and data 
storage (multi-tenant).
Security & Privacy — Data encrypted at rest and in transit, per-tenant data 
isolation, compliance with data-protection best practices.
Usability & UX — Onboarding in under 15 minutes; intuitive dashboards; 
minimal learning curve.
Maintainability / Extensibility — Modular architecture; ability to add new 
jurisdictions, new regulators, new alert channels easily.
Compliance & Legal Safety — Respect robots.txt / public-data restrictions; 
include disclaimers; safe data handling; logging.
Auditability — Full audit logs of alerts, user actions, task assignments — 
necessary for compliance audits.
5. Constraints & Assumptions
Initial launch will cover a limited set of jurisdictions (focus PK, MENA, South 
Asia), but architecture must be extensible
All inputs (regulator sources) are publicly accessible — no login-protected or 
paywalled scraping at launch
Regula - Business Requirements
4


---
# Page 5

Users do not expect legal advice; Regula provides informational insights only; 
users retain compliance responsibility
Pricing must be competitive enough for SMBs, but usage (crawl load) must 
remain sustainable
6. Out-of-Scope (for MVP)
To keep MVP lean and achievable:
No enterprise-grade SSO / SAML at launch (post-MVP)
No dedicated per-customer crawler pool for small customers (may consider 
later for enterprise clients)
No human-review / analyst-backed compliance advice (tool remains 
automated)
No mobile apps (web UI only)
No multi-language interface (initial launch → English + key local languages 
later)
Regula - Business Requirements
5

