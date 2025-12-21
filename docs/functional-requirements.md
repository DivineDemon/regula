# Page 1

📝
Regula - FRD
1. Document Overview
Purpose — This FRD defines the behavior, features, and acceptance criteria for 
Regula’s core system. It will guide development, QA/test, and future 
enhancements.
Scope — Covers user & org management, monitoring setup, crawling & change 
detection, analysis & alerting, compliance workspace, billing/subscriptions, 
security & data protection, onboarding and support.
Definitions & Abbreviations
User — an individual using Regula, part of an organization (tenant)
Org / Tenant — a registered company using Regula
Target — a regulator source (URL/domain) configured by org for monitoring
Crawl — a fetch attempt of a target content (HTML or attachment)
Version — stored snapshot of a target’s content at one crawl time
Alert — result of change detection + classification + scoring when a version 
changes
Regula - FRD
1


---
# Page 2

Impact Score — numeric or categorical measure of how relevant a change is 
for the org
2. Functional Requirement Entries (with Acceptance 
Criteria)
Below are detailed FRD entries for a subset of the most critical functional areas. 
Once these templates are confirmed, you (or your team) can replicate for 
remaining requirements.
FR-001: User Registration & Authentication
Description:
Allow new users to sign up, verify email, and log in to the system. Support 
organization creation or joining.
Preconditions:
User has access to a valid email address.
System not in maintenance mode.
Main Flow:
1. User navigates to “Sign Up” page.
2. User enters email, password, name, optionally organization name.
3. System validates input (password strength, email format).
4. System sends verification email.
5. User clicks verification link.
6. System marks email verified, logs user in, prompts org creation or join existing 
org.
Acceptance Criteria:
AC-001.1: Given valid email/password and org name → after verification user 
should be in “registered + verified” state and assigned as Org Admin.
AC-001.2: Given invalid email format or weak password → system rejects sign-
up and shows clear error messages.
Regula - FRD
2


---
# Page 3

AC-001.3: Email verification link expires after configurable period (e.g. 24 
hours). If expired, sign-up must be restarted or request new link.
AC-001.4: Passwords stored hashed (not plaintext); login verifies correctly.
AC-001.5: On login, system creates session with appropriate security (e.g. 
session timeout, CSRF protection).
Alternative / Edge Cases:
Email already taken → error “Email already registered.”
Click verification link twice / link invalid → error message.
FR-002: Organization (Tenant) Creation & Management
Description:
After sign-up, a user can create a new organization (tenant), or — if invited — join 
an existing organization. Organization has its own settings, users, data isolation.
Preconditions:
User is authenticated and email verified.
Main Flow:
1. User selects “Create Organization.”
2. User provides organization name and country (jurisdiction).
3. System creates org, assigns user as Org Admin, initializes default settings 
(e.g. plan = Free, empty target list).
Acceptance Criteria:
AC-002.1: Organization name must be unique in the system. Duplicate attempt 
yields error.
AC-002.2: New org is created with default configuration and Free plan, 
isolated data scope.
AC-002.3: Org Admin can view org dashboard, settings, billing, user 
management.
Regula - FRD
3


---
# Page 4

AC-002.4: System enforces data isolation — no data leak across tenants (e.g. 
data queries must be scoped to org_id).
Alternative / Edge Cases:
Organization creation fails (DB error) → show user-friendly error and no partial 
data saved.
Concurrent creation of same org name by two users — enforce uniqueness via 
DB constraints.
FR-010: Add / Remove Regulatory Targets
Description:
Org admin can configure which regulators (by URL/domain) the system should 
monitor for their organization.
Preconditions:
Org exists; user has admin privileges.
Main Flow (Add Target):
1. Admin clicks “Add Target.”
2. Admin enters target URL/domain, optional label/tag, selects jurisdiction and 
regulatory category.
3. System validates URL format, tests accessibility (HTTP GET), confirms 
reachable.
4. If valid, system adds target to org’s target list, schedules first crawl 
(depending on plan).
Acceptance Criteria (Add):
AC-010.1: Valid reachable URL → target added successfully, appears in target 
list.
AC-010.2: Invalid URL format → reject with error.
AC-010.3: URL unreachable (non-200 status / timeout) → show warning, allow 
user to confirm but mark target “pending.”
Regula - FRD
4


---
# Page 5

AC-010.4: Target list shows metadata: label, jurisdiction, category, next 
scheduled crawl, status (active / pending / disabled).
Main Flow (Remove Target):
1. Admin selects existing target, clicks “Remove.”
2. System asks confirmation (yes/no).
3. On confirmation, system disables target, cancels scheduled crawls, removes 
from active monitoring but preserves historical data.
Acceptance Criteria (Remove):
AC-010.5: On confirm, target no longer appears in active list; no further crawls 
scheduled.
AC-010.6: Historical data (versions, alerts) remains accessible for compliance 
audit/export.
FR-020: Crawl Execution & URL Fetching
Description:
System must fetch target content (HTML, PDF/attachments) per schedule or 
manual trigger, and store snapshot for versioning.
Preconditions:
Target is active and reachable.
Crawl schedule exists (hourly, daily, manual).
Main Flow:
1. Scheduler triggers crawl for a target.
2. Fetch engine attempts HTTP(S) GET (or headless browser render if JS) to 
fetch content.
3. On success, extract HTML/text and attachments; store snapshot in version 
history with metadata (timestamp, URL, content hash).
4. On failure (timeout, 4xx/5xx, captcha), log error, retry per configured backoff; 
after max retries mark target as “error” and alert org admin.
Regula - FRD
5


---
# Page 6

Acceptance Criteria:
AC-020.1: For reachable pages, system correctly stores snapshot with 
metadata.
AC-020.2: Attachments (PDFs, DOCs) are detected and downloaded. Later 
text-extracted versions stored.
AC-020.3: Crawl failures are logged; retry logic works; after max retries, 
status flagged and admin notified.
AC-020.4: Crawl performance does not block other tasks — use async / 
queue based architecture.
Edge Cases / Notes:
For JS-heavy pages: use headless browser rendering; detect dynamic content 
loaded via JS.
For pages protected by robots.txt / rate-limiting: respect politeness; if blocked, 
mark target as “manual only / unsupported,” notify user.
FR-022: Change Detection / Diff Engine
Description:
On each new version fetch, system compares with previous version to detect 
meaningful changes — structural or content — and flag “changed” for further 
analysis.
Preconditions:
At least one previous version exists for the target.
New version fetch succeeded.
Main Flow:
1. Fetch new version.
2. Compute checksum/hash; compare with last version.
3. If identical: mark “no change”, skip further analysis.
4. If different: run structural diff (headings, paragraphs, attachments), mark 
change types (addition, deletion, modification), flag version as “changed.”
Regula - FRD
6


---
# Page 7

Acceptance Criteria:
AC-022.1: Identical content → detect no change.
AC-022.2: Content difference → detect change, categorize at least at high-
level (minor, major, attachment, deletion).
AC-022.3: Changes in attachments (new, removed, modified) are detected and 
flagged.
AC-022.4: Diff metadata stored: which lines/blocks changed, previous vs new 
content pointer, version IDs.
FR-030: Automatic Summarization, Classification & Impact 
Scoring
Description:
For changes flagged by diff engine, system generates human-readable summary, 
classifies regulatory type, extracts key entities and computes impact score.
Preconditions:
Version marked “changed” by diff engine.
Main Flow:
1. Invoke LLM/ML summarization component on diff (or full new version).
2. Extract summary, classification tags (e.g. AML, licensing, fees), named entities 
(dates, fines, statute IDs).
3. Compute impact score based on internal scoring rules (e.g. severity of 
change, regulatory category, target jurisdiction), and user/org profile.
4. Store results as pending-alert data.
Acceptance Criteria:
AC-030.1: Summary is generated within acceptable latency (e.g. < 5 seconds 
per alert) under normal load.
AC-030.2: Classification tags assigned (or fallback “Uncategorized”). Stored 
persistently.
Regula - FRD
7


---
# Page 8

AC-030.3: Impact score computed and stored (e.g. numeric 0–1 or categorical 
Low/Medium/High).
AC-030.4: Summary includes link to original and prior versions + diff view link.
Edge Cases / Notes:
If summarization fails (LLM error, timeout), system should mark alert as 
“Needs Review” and optionally retry.
For large documents: consider chunking or partial summarization to maintain 
performance.
FR-040: Alerting & Notification System
Description:
Deliver alerts to users based on detection + analysis + user preferences (channel, 
severity, frequency).
Preconditions:
Alert data (summary, score, metadata) exists.
User/org has configured notification preferences.
Main Flow:
1. When a new alert is generated, evaluate user/org alert filters (severity 
threshold, target, jurisdiction).
2. If alert passes filter: add to org’s alert inbox.
3. Trigger external notification based on settings (email immediately or digest, 
webhook, Slack, etc.).
4. If user doesn’t login — include in next digest (if configured).
Acceptance Criteria:
AC-040.1: Alerts that meet threshold appear in inbox and notifications sent 
within 5 minutes.
AC-040.2: Digest notifications (daily/weekly) aggregate alerts correctly, with 
summary and metadata.
Regula - FRD
8


---
# Page 9

AC-040.3: Webhook/SNS integration sends correct JSON payload containing 
alert metadata (summary, link, score, target).
AC-040.4: Settings changes (threshold, channel) apply immediately for future 
alerts.
FR-050: Compliance Workspace, Search & Export
Description:
Provide orgs with tools to view alert history, search across past versions/alerts, 
and export for audit/compliance reporting.
Preconditions:
Org has historical data (versions, alerts) stored.
Main Flow:
1. User navigates to “Archive / Alerts History.”
2. Use filters (date range, jurisdiction, status, severity, target) to narrow results.
3. Select alerts / versions to export.
4. Choose export type (CSV, PDF package) and trigger export.
Acceptance Criteria:
AC-050.1: Search returns correct results that match filter criteria.
AC-050.2: Export contains all relevant metadata + document evidence + 
version links.
AC-050.3: Exported PDF/CSV is correctly formatted, readable; includes 
date/time, regulator, summary, alert status, version links.
AC-050.4: Data retention logic works — older data purged based on plan’s 
retention policy, but archived (if enterprise) or user-exported data remains 
accessible.
FR-060: Subscription & Billing Engine
Description:
Regula - FRD
9


---
# Page 10

Manage plan assignment, usage metering, quotas, upgrades/downgrades, 
payments and invoicing.
Preconditions:
Org created; user assigned as billing admin.
Main Flow:
1. Upon signup, assign Free plan.
2. Monitor usage (number of targets, crawls, alerts) continuously.
3. On usage close to quota: notify admin with warning (“X% of quota used”).
4. On quota exceed or feature need: allow user to upgrade plan via payment 
gateway.
5. Process payment, update plan, send invoice.
6. Handle downgrades / plan cancellation — enforce lower quotas and disable 
over-quota features or send warnings.
Acceptance Criteria:
AC-060.1: Usage correctly tracked and associated with org.
AC-060.2: Notifications sent at 80% and 100% of quota usage (configurable).
AC-060.3: Payment flow successful (payment + invoice) → plan upgraded; 
new quotas applied.
AC-060.4: Error in payment (failed card) → system retries, notifies user, 
disables over-quota usage.
AC-060.5: Downgrade reduces quotas immediately and blocks over-quota 
activity.
FR-070: Security, Data Protection & RBAC
Description:
Ensure data isolation, secure storage, role-based permissions, and audit logging 
for compliance and privacy.
Preconditions:
Regula - FRD
10


---
# Page 11

Users/Orgs exist; data storage infrastructure supports encryption and access 
control.
Main Flow:
1. On data storage: encrypt sensitive data at rest.
2. During data access: enforce per-tenant data filtering; restrict user access 
based on role.
3. On every user action (login, role change, alert triage, export, billing changes): 
log event with timestamp, user ID, org ID, action type.
4. On login: enforce TLS, session timeout, optionally OTP or 2FA (future).
Acceptance Criteria:
AC-070.1: Users cannot access data belonging to other tenants — test with 
multi-tenant test accounts.
AC-070.2: All sensitive data (passwords, credentials, stored docs) encrypted 
at rest + in transit.
AC-070.3: Audit log captures all critical actions and is tamper-resistant (write-
once, or append-only).
AC-070.4: Role permissions enforced — e.g. Viewer cannot delete targets or 
manage billing.
3. Prioritization & Release Planning (Subset)
Not all features must land in Day-1 MVP. Below is a suggested MVP vs. Post-MVP 
split:
Priority
Features / Requirements
Must-Have (MVP)
User registration & org management; add/remove targets;
basic crawling + change detection; summarization & alert
generation; alert inbox + email notifications; basic
workspace; Free/Starter billing; data isolation & security;
onboarding wizard
Important (Post-MVP
Phase 1)
Usage metering + quota tracking; billing upgrades;
export/archive; filter & search across history; webhook/Slack
Regula - FRD
11


---
# Page 12

Priority
Features / Requirements
alert channels; PDF/attachment parsing; diff viewer UI
Nice-to-Have (Phase 2+)
Role-based granular permissions; advanced retention
settings; invoice generation; enterprise SSO; SLA/uptime
monitoring; analytics dashboard; feedback-driven alert
tuning; manual upload of regs
4. Traceability Matrix (Sample: mapping to BRD)
BRD ID
FRD ID(s)
Description
BR-01 (Multi-jurisdiction
support)
FR-010, FR-020, FR-022,
FR-030
Target configuration + crawling
+ diff + summarization works
for any jurisdiction
BR-03 (Low onboarding
friction)
FR-001, FR-002, FR-080,
FR-081
Simple sign-up & onboarding
UI
BR-05 (Actionable alerts)
FR-022, FR-030, FR-040
Diff + summarization + scoring
+ alerting
BR-07 (Scalable)
FR-020, FR-070 (security),
plus backend architecture
(non-functional)
Crawl engine + multi-tenant +
secure data handling
Regula - FRD
12

