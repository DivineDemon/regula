# Security Operations Runbook

This runbook covers dependency scanning, vulnerability management, patching cadence, and penetration testing for Regula. It supports NFR-SEC-007 (Vulnerability Management) and operational security practices.

## 1. Dependency scanning

### Purpose

- Detect known vulnerabilities in direct and transitive dependencies.
- Prioritize fixes for critical/high CVEs before they are exploited.

### Tools and commands

- **Package manager audit**
  - **Bun**: `bun audit` (or `npm audit` if using npm).
  - Run from repo root; fix reported issues following the tool’s suggestions (e.g. `bun update <pkg>`, or patching per advisory).
- **Optional: dedicated vulnerability scanner**
  - Consider adding a scanner such as [Snyk](https://snyk.io/) or [Socket](https://socket.dev/) (via CI or CLI) for deeper dependency and license analysis.

### Cadence

- **Weekly**: Run `bun audit` (or equivalent) locally or in CI.
- **On every release**: Run audit as part of the release checklist; do not ship with known critical/high vulnerabilities.

### CI integration

Add a job to your CI pipeline (e.g. GitHub Actions):

```yaml
# Example: run audit in CI
- name: Audit dependencies
  run: bun audit
  continue-on-error: false  # Fail the build on vulnerabilities (or true for advisory-only)
```

Adjust `continue-on-error` based on policy (e.g. fail on high/critical only).

---

## 2. Patching and upgrade cadence

### Principles

- Apply security patches promptly; critical/high CVEs within the timeframe defined below.
- Keep Node/bun and runtime versions on supported, patched lines.
- Lockfiles (`bun.lock`, `package-lock.json`) should be committed and updated when dependencies change.

### Suggested cadence

| Severity / type      | Target action                          |
|----------------------|----------------------------------------|
| Critical CVE         | Patch or mitigate within 72 hours      |
| High CVE             | Patch within 1 week                    |
| Medium / Low         | Include in next planned dependency pass|
| Non-security updates | Monthly dependency review and upgrade  |

### Process

1. Run audit; triage and document findings.
2. Prefer upgrading to a patched version; if none, apply mitigations (e.g. config, network controls) and track until fix is available.
3. Re-run audit and tests after changes.
4. Document decisions (e.g. accepted risk, deferred fix) in a short note or ticket.

---

## 3. Penetration testing

### Purpose

- Validate security controls (auth, RBAC, tenant isolation, API protection) and identify misconfigurations or logic flaws.
- Align with NFR-SEC-007 and enterprise readiness.

### Cadence

- **Before major releases** (e.g. public launch, v1.0): External or internal penetration test covering:
  - Authentication and session handling
  - Authorization and tenant isolation (e.g. cross-org access attempts)
  - API and webhook security (rate limits, input validation, auth)
  - Sensitive data exposure (alerts, versions, PII)
- **At least annually** thereafter, or when significant new features (billing, SSO, integrations) are added.

### Scope (minimum)

- Web app (login, dashboard, alerts, settings, org management).
- Key API routes (auth, targets, alerts, versions, billing, webhooks, GDPR).
- Crawler and external integrations only if in scope (e.g. abuse/DoS against crawl endpoints).

### Deliverables

- Findings report (severity, steps to reproduce, impact).
- Remediation plan and re-test of critical/high findings.

---

## 4. Secure configuration and crawler behaviour

- **Crawler**: Respect `robots.txt` and per-host rate limits; no bypass of access controls (see `lib/crawl/robots.ts` and crawl configuration).
- **Secrets**: No credentials in code; use environment variables and a secrets manager in production.
- **HTTPS**: Enforce TLS in production; redirect HTTP to HTTPS.

---

## 5. Quick reference commands

| Action                 | Command / note                    |
|------------------------|-----------------------------------|
| Run dependency audit   | `bun audit`                       |
| Run lint / typecheck   | `bun run lint`, `bun run typecheck` |
| Run tests              | `bun test` (if configured)        |

---

## 6. Incident response

For security incidents and breach notification, follow the process described in the Legal & Compliance requirements (e.g. notify affected users within 72 hours, impact analysis, mitigation steps). See `docs/legal-requirements.md` and any internal incident runbook.
