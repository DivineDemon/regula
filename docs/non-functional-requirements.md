# Page 1

🛡️
Regula - NFRD
1. Performance & Scalability
Requirement ID
Requirement
Acceptance / Target Criteria
NFR-PERF-001
Crawl & Diff Throughput
System must support at least 1000
concurrent target-crawls per hour across
all tenants without significant slowdowns.
NFR-PERF-002
Alert Pipeline Latency
From successful crawl to alert appearance
in inbox: median latency ≤ 5 minutes; 95th
percentile ≤ 20 minutes under normal load.
NFR-PERF-003
UI Responsiveness
Dashboard and inbox pages should load in
< 2 seconds for datasets up to 10,000
alerts / versions. Pagination and infinite-
scroll must respond in under 1s.
NFR-PERF-004
Search & Export
Performance
Export (e.g., CSV / PDF of alert history up
to 5 years) must complete within
acceptable time — e.g. < 30 seconds for
up to 5,000 records (depending on plan).
NFR-SCAL-005
Horizontal Scalability
System architecture must support adding
nodes (crawler workers, web servers, DB
Regula - NFRD
1


---
# Page 2

Requirement ID
Requirement
Acceptance / Target Criteria
replicas) to scale with customer growth,
with no downtime.
2. Reliability & Availability
Requirement ID
Requirement
Target Level
NFR-AV-001
System Uptime
For paid (Growth/Enterprise) customers:
SLA of ≥ 99.5% uptime monthly (allowing
no more than ~3.65 hours downtime/month).
NFR-AV-002
Automatic Retry &
Failover
If a crawl or fetch fails (timeout, network
issue), the system automatically retries up to
configurable retry-count; after retries fails
gracefully, logging error and notifying
admin.
NFR-AV-003
Data Redundancy &
Backup
All stored data (versions, alerts, org data)
must be backed up at least daily to a
separate geo-redundant storage; backups
retained for a configurable period (e.g. 30
days).
NFR-AV-004
Graceful Degradation
In case of partial failure (e.g. crawl
subsystem down), UI remains functional;
existing alerts and history accessible;
scheduled crawls resume when subsystem
recovers.
3. Security & Privacy
Requirement ID
Requirement
Details / Acceptance Criteria
NFR-SEC-001
Transport Security
All data in transit (web UI, API, webhook)
must use HTTPS / TLS 1.2+; redirect
HTTP → HTTPS.
NFR-SEC-002
Data Encryption at Rest
Sensitive data (credentials, documents,
extracted text, stored PDFs) must be
encrypted at rest (AES-256 or equivalent).
Regula - NFRD
2


---
# Page 3

Requirement ID
Requirement
Details / Acceptance Criteria
NFR-SEC-003
Tenant Isolation
Strict multi-tenant data isolation: no data
from one org (tenant) can be accessed by
another. All DB queries must be scoped
by org_id or equivalent.
NFR-SEC-004
Access Control / RBAC
Role-based access: ensure only
authorized roles can perform sensitive
actions (billing, plan change, user
management, export etc.). Logging of
permission changes.
NFR-SEC-005
Audit Logging
All user actions (login, CRUD on
targets/users/alerts/settings, exports, plan
changes) must be logged with timestamp,
user ID, org ID, action type. Logs must be
immutable / append-only.
NFR-SEC-006
Compliance with Data
Protection Laws
Comply with applicable data protection
regulations (e.g. GDPR-style for global
clients), including data retention policies,
right to delete/export data, user consent,
privacy policy.
NFR-SEC-007
Vulnerability Management
Regular security reviews, patching
dependencies, periodic penetration
testing (especially before enterprise roll-
out).
NFR-SEC-008
Secure Configuration of
Crawls
Respect robots.txt / terms of use of
regulator sites; avoid IP/IP-range
blacklisting by implementing polite
crawling (rate-limiting, backoff, proxy
rotation). Implement abuse protection in
crawler.
4. Maintainability & Extensibility
Requirement ID
Requirement
Description
NFR-MNT-001
Modular Architecture
System design must be modular:
separate components for crawling,
diffing, summarization, web UI, billing —
Regula - NFRD
3


---
# Page 4

Requirement ID
Requirement
Description
enabling independent
updates/deployment.
NFR-MNT-002
Code Quality &
Documentation
Core modules must have automated
tests (unit + integration), clear
documentation (code comments,
architecture diagrams, API docs), and
clean abstractions for future features.
NFR-MNT-003
Monitoring & Observability
Implement monitoring (metrics, logs,
alerting) for throughput, error rates,
latency, resource usage. Use
dashboards + alerting for operational
health.
NFR-MNT-004
Versioning & Backwards
Compatibility
APIs (if offered) must maintain backward
compatibility or provide versioning to
avoid breaking existing integrations
when features added/changed.
5. Usability & UX Quality
Requirement ID
Requirement
Target / Acceptance
NFR-UX-001
Onboarding Time
New users completing signup → first
crawl → first alert in under 15 minutes
total (assuming valid target).
NFR-UX-002
Alert Clarity & Transparency
Alerts must clearly show: what changed
(diff / before-after), summary, impact
score, link to source, and full original
text/version.
NFR-UX-003
Accessibility &
Responsiveness
Web UI must work on common screen
sizes (desktop, tablet), and follow basic
accessibility standards (keyboard
navigation, readable font sizes, color
contrast).
NFR-UX-004
Notification Reliability
Email, webhook, and digest notifications
must reliably deliver alerts without
duplication, delay, or missing context.
Regula - NFRD
4


---
# Page 5

6. Operational & Deployment Requirements
Requirement ID
Requirement
Details
NFR-OPS-001
Deployment Automation
Infrastructure deployment (servers, DB,
workers) automated via IaC (Infrastructure
as Code), supporting reproducible,
versioned deployment.
NFR-OPS-002
Scalable Infrastructure
Use containerization / orchestration (e.g.
Kubernetes) to manage crawler workers,
web servers, background jobs, to allow
scaling up/down.
NFR-OPS-003
Cost Efficiency &
Monitoring
Monitor resource utilization (CPU, memory,
storage) per tenant; alert when usage
grows disproportionately; enable auto-
scaling or usage-based pricing thresholds.
NFR-OPS-004
Backup & Disaster
Recovery
Daily backups + off-site storage; procedure
for data recovery (within defined RPO/RTO).
NFR-OPS-005
Logging & Metrics
Retention
Operational logs and metrics retained for
reasonable period (e.g. 90 days) to debug
issues and perform audits.
7. Compliance & Legal Safety
Requirement ID
Requirement
Reason / Impact
NFR-LAW-001
Terms of Use / Disclaimer
Provide clear terms: Regula delivers
informational summaries; users remain
responsible for legal compliance. Avoid
liability.
NFR-LAW-002
Scraping Ethics & Respect for
Robots/ToS
Only crawl publicly accessible pages;
respect robots.txt and site terms;
implement respectful crawling (rate
limits, politeness). Minimise risk of IP
bans / legal issues.
NFR-LAW-003
User Data Privacy & GDPR-
style Rights
For users from different jurisdictions,
support data deletion, export, and
privacy compliance per local laws.
Regula - NFRD
5


---
# Page 6

Requirement ID
Requirement
Reason / Impact
NFR-LAW-004
Audit Trail & Exportable
Evidence
Provide exportable history (versions,
alerts) so users can use evidence for
internal/external audits.
8. Non-Functional Requirement Traceability (mapping 
to earlier NFR categories)
Performance & Scalability — NFR-PERF-001..004, NFR-SCAL-005
Reliability & Availability — NFR-AV-001..004
Security & Privacy — NFR-SEC-001..008
Maintainability & Monitoring — NFR-MNT-001..004 + NFR-OPS-001..005
Usability / UX — NFR-UX-001..004
Compliance & Legal Safety — NFR-LAW-001..004
Regula - NFRD
6

