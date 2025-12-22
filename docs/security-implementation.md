# Security Implementation Documentation

This document describes the security features implemented in Regula as part of Phase 9.

## 1. Row-Level Security

All database queries are filtered by `organizationId` to ensure multi-tenant data isolation:

- **Services**: All service functions that query data now require `organizationId` and verify it through joins or direct filters
- **Versions Service**: Updated to verify `organizationId` through target relationships
- **Alerts Service**: All queries filter by `organizationId`
- **Dashboard Service**: All metrics queries filter by `organizationId`

### Implementation Pattern

```typescript
// Example: Querying versions with organizationId verification
const [version] = await db
  .select({ version: versions })
  .from(versions)
  .innerJoin(targets, eq(versions.targetId, targets.id))
  .where(
    and(
      eq(versions.id, versionId),
      eq(targets.organizationId, organizationId),
    ),
  )
  .limit(1);
```

## 2. Tenant Middleware

A middleware (`middleware.ts`) enforces tenant context and rate limiting:

- **Authentication Check**: Verifies user session for protected routes
- **Rate Limiting**: Implements rate limiting using Upstash Redis
- **Route Protection**: Redirects unauthenticated users to login

### Rate Limits

- Default API routes: 100 requests per minute
- Write operations (targets, alerts, billing, settings): 30 requests per minute
- Authentication endpoints: 5 requests per minute
- Password reset: 3 requests per 5 minutes

## 3. API Route Protection

All API routes use tenant validation helpers:

- **`requireAuth()`**: Ensures user is authenticated
- **`requireOrgAccess()`**: Verifies user has access to the organization
- **`requireOrganizationAdmin()`**: Verifies user is admin (for admin-only operations)

### Implementation

```typescript
import { requireOrgAccess } from "@/lib/utils/api-helpers";

export async function GET(request: Request) {
  const user = await requireOrgAccess(organizationId);
  // ... rest of handler
}
```

## 4. Server Actions

No server actions are currently used in the application. All data mutations go through API routes which have tenant validation.

## 5. Data Encryption at Rest

### Database Encryption

Regula uses **Neon Postgres** (or Vercel Postgres) which provides:

- **Encryption at Rest**: All data stored in the database is encrypted at rest by the database provider
- **Encryption in Transit**: All connections use TLS/SSL
- **Automatic Backups**: Encrypted backups are maintained by the provider

### Application-Level Encryption

- **S3 Storage**: Large content files stored in S3 are encrypted using S3 server-side encryption
- **Environment Variables**: Sensitive configuration stored in environment variables (not in code)

### Configuration

No additional configuration is required - encryption is handled by the database provider (Neon/Vercel Postgres).

## 6. Password Hashing

Password hashing is implemented using **bcrypt** with a salt rounds of 10:

- **Registration**: Passwords are hashed using `bcrypt.hash(password, 10)` in `app/api/auth/register/route.ts`
- **Password Reset**: Passwords are hashed using `bcrypt.hash(password, 10)` in `app/api/auth/reset-password/route.ts`
- **Login Verification**: Passwords are verified using `bcrypt.compare()` in `lib/auth/config.ts`

### Implementation

```typescript
// Hashing during registration
const hashedPassword = await bcrypt.hash(password, 10);

// Verification during login
const isValidPassword = await bcrypt.compare(
  credentials.password as string,
  user.password,
);
```

## 7. CSRF Protection

Next.js 16 provides built-in CSRF protection for:

- **API Routes**: All POST/PUT/PATCH/DELETE requests are protected
- **Form Actions**: Server actions (if used) are protected
- **Cookie-based Sessions**: NextAuth uses secure, httpOnly cookies

### Configuration

CSRF protection is enabled by default in Next.js. No additional configuration is required.

## 8. Rate Limiting

Rate limiting is implemented using **Upstash Redis**:

- **Middleware-based**: Applied at the middleware level for all API routes
- **Per-endpoint**: Different rate limits for different endpoint types
- **IP-based**: Rate limits are applied per IP address
- **Headers**: Rate limit information is included in response headers

### Implementation

See `lib/utils/rate-limit.ts` and `middleware.ts` for implementation details.

## 9. Input Validation

Input validation is implemented using **Zod**:

- **API Routes**: All API routes use Zod schemas to validate request bodies and query parameters
- **Type Safety**: Zod provides both runtime validation and TypeScript type inference
- **Error Messages**: Validation errors are returned with detailed error messages

### Example

```typescript
const createTargetSchema = z.object({
  organizationId: z.string(),
  url: z.string().url("Invalid URL format"),
  label: z.string().min(1, "Label is required"),
  // ...
});

const validatedData = createTargetSchema.parse(body);
```

## 10. Audit Logging

Comprehensive audit logging is implemented for all critical actions:

### Audit Log Service

Located in `lib/services/audit.ts`, provides:

- **`createAuditLog()`**: Creates audit log entries
- **`getAuditLogs()`**: Retrieves audit logs with filtering
- **Action Types**: Comprehensive list of audit action types

### Logged Actions

- **Authentication**: `user.login`, `user.logout`, `user.register`, `user.email_verified`, `user.password_reset`
- **Targets**: `target.created`, `target.updated`, `target.deleted`, `target.status_changed`
- **Alerts**: `alert.created`, `alert.status_changed`, `alert.assigned`, `alert.comment_added`, `alert.exported`
- **Organization**: `organization.created`, `organization.updated`, `organization.member_invited`, `organization.member_removed`, `organization.member_role_changed`
- **Billing**: `billing.subscription_created`, `billing.subscription_updated`, `billing.subscription_cancelled`, `billing.payment_method_added`, `billing.payment_method_removed`, `billing.invoice_generated`
- **Exports**: `export.alerts`, `export.compliance_report`

### Audit Log Viewer

Admin-only audit log viewer is available at `/settings/audit-logs`:

- **Filtering**: Filter by action type, user, date range
- **Pagination**: Navigate through audit logs
- **Metadata**: View detailed metadata for each action

## Security Best Practices

1. **Never trust client input**: All inputs are validated using Zod
2. **Always verify organization access**: All queries filter by `organizationId`
3. **Use parameterized queries**: Drizzle ORM uses parameterized queries by default
4. **Log all critical actions**: Comprehensive audit logging for compliance
5. **Rate limit aggressively**: Prevent abuse and DoS attacks
6. **Use secure cookies**: NextAuth uses secure, httpOnly cookies
7. **Hash passwords properly**: bcrypt with appropriate salt rounds
8. **Encrypt sensitive data**: Database provider handles encryption at rest

## Compliance

The security implementation supports:

- **GDPR**: Audit logging, data isolation, access controls
- **SOC 2**: Comprehensive audit trails, access controls, encryption
- **HIPAA** (if applicable): Encryption, access controls, audit logging

