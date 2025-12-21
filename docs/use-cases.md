# Page 1

📘
Regula - User Stories & Use 
Cases
👥 User Roles (Actors)
Org Admin — primary user; sets up organization, billing, targets; invites team 
members.
Compliance / Ops User — inside an organization; views alerts, triages, 
comments, closes tasks.
Viewer / Read-only User — limited to viewing alerts / history, no editing.
System (Background Worker) — crawling engine, diff engine, summarization 
& alert generation, scheduler.
📘 User Stories & Use Cases
User Management & Onboarding
US-001: User Signup & Org Creation
As a founder or compliance lead, I want to sign up, verify my email, and create 
a new organization so that I can onboard and start using Regula.
Regula - User Stories & Use Cases
1


---
# Page 2

US-002: Invite Team Member
As an Org Admin, I want to invite a colleague via email and assign them a role 
(Analyst / Viewer) so that my team can jointly manage alerts/compliance.
US-003: Role-Based Access — Viewer Only
As a Viewer User, I want to view alerts and history but not modify targets or 
billing so I can stay informed without risk of accidental changes.
Regulator Target Setup & Monitoring
US-010: Add Regulator Target
As an Org Admin, I want to add a regulator website (URL/domain) to my 
monitoring list with jurisdiction/category tags so Regula knows where to 
monitor.
US-011: Remove / Disable Regulator Target
As an Org Admin, I want to remove or disable a target so I can stop monitoring 
an outdated or irrelevant regulator.
US-012: Configure Monitoring Frequency
As an Org Admin, I want to set the crawl frequency (e.g. hourly, daily, weekly) 
per target so that monitoring matches my compliance needs and cost 
tolerance.
Crawling, Change Detection & Alerting
US-020: Automatic Crawl & Detection
As the System, automatically fetch target content, store versions, and detect 
changes — no user action required for continuous monitoring.
US-021: Generate Summaries & Impact Scoring
As the System, after detecting a change, generate a concise summary, 
classify the change type, compute impact score — so users get actionable 
alerts instead of raw diffs.
US-022: Deliver Alert to Inbox & via Notification
Regula - User Stories & Use Cases
2


---
# Page 3

As a Compliance User / Org Admin, I want to receive alerts (in-app + 
email/webhook) when important regulatory changes occur so I don’t miss 
critical updates.
US-023: Alert Filtering by Severity / Category
As a Compliance User, I want to set alert thresholds (e.g. only “High” impact) 
or filter by jurisdiction/category so I avoid alert fatigue.
Compliance Workspace & Workflow Management
US-030: View Alert Inbox & Alert Details
As a Compliance User, I want to view a list of alerts and click into any alert to 
see summary, diff, origin, and version history, so I can analyze regulatory 
changes.
US-031: Assign Alert / Mark as Triaged / Closed
As an Org Admin or Analyst, I want to assign alerts to team members, add 
comments/notes, set status (new → triaged → actioned → closed) for 
compliance tracking.
US-032: Search & Filter Historical Alerts / Versions
As a Compliance or Viewer User, I want to search and filter past alerts and 
document versions by date, jurisdiction, regulator, severity, status — for audit 
and review purposes.
US-033: Export Compliance Report / Evidence
As a Compliance User or Org Admin, I want to export a report (CSV or PDF) of 
alerts and associated documents from a period — for audits, internal 
reporting, or regulatory submission.
Subscription, Billing & Plan Management
US-060: View Current Plan & Usage
As an Org Admin, I want to view my current subscription plan, number of 
targets, crawl usage, alert credits — so I know where I stand against quota.
US-061: Upgrade / Downgrade Plan
Regula - User Stories & Use Cases
3


---
# Page 4

As an Org Admin, I want to upgrade or downgrade my subscription plan and 
have quotas adjusted accordingly — if my target list or monitoring needs 
change.
US-062: Receive Usage/Quota Warning Notification
As an Org Admin, I want to receive an email or in-app warning when I’m close 
to or exceed my quota so I can upgrade or avoid over-usage.
Security, Access & Data Protection
US-070: Enforce Tenant Data Isolation
As the System / Admin, ensure data of different organizations is isolated — 
users from Org A cannot access Org B’s regulator targets or alerts.
US-071: Role-Based Access Control for Actions
As a Compliance User or Viewer, ensure only authorized roles can perform 
sensitive actions (billing, target config, user invites) — to prevent misuse.
US-072: Audit Logging of User Activities
As an Org Admin or Auditor, have a log of all critical actions (user creation, 
target changes, alert triage, export) with timestamps — for compliance 
traceability.
Onboarding & First-Time Use Experience
US-080: Onboarding Wizard for First-Time Users
As a New User / Org Admin, I want a guided setup (create org → add 1-2 
targets → set alert preferences → run first crawl) so I get first value fast 
without tutorials.
US-081: First Alert & Feedback Prompt
As a New User, once the first alert arrives, I am prompted to review and 
optionally mark any false positives — so system learns and I see value 
immediately.
🔄
Regula - User Stories & Use Cases
4


---
# Page 5

🔄 Example Use Case — End-to-End Flow: “SMB 
FinTech Compliance Monitoring”
Actors: Org Admin (Alice), Compliance User (Bob), System
Preconditions: Alice signed up, created org, added 5 regulator targets (domestic 
+ regional), set monitoring to daily.
Flow:
1. System runs daily crawl on all 5 targets.
2. Detects change on regulator site #3.
3. Diff engine flags change; summarization + impact scoring run. Impact rated 
“High.”
4. System creates alert. Email + webhook sent to org.
5. Bob (Compliance User) logs in → sees alert in inbox. Opens alert → sees 
summary, diff, link to full doc.
6. Bob assigns alert to himself, adds note: “Check KYC flow, prepare update.” 
Status set “triaged.”
7. Compliance team updates internal policy; when done, Bob marks alert 
“closed.”
8. Quarter-end: Org Admin exports compliance report (past 3 months) as PDF for 
internal audit.
Postconditions: Alert logged, audit trail exists, internal compliance updated — 
team safe from regulatory risk.
Regula - User Stories & Use Cases
5

