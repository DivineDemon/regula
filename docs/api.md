# Regula API Documentation

Complete API reference for the Regula platform.

## Base URL

All API endpoints are relative to your deployment URL:
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

Most endpoints require authentication via NextAuth.js session cookies. Include session cookies with all requests.

For API key authentication (where supported), include the API key in the `Authorization` header:
```
Authorization: Bearer <api-key>
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... } // Optional additional error details
}
```

## Organization Profile API

### GET /api/organizations/profile

Get the organization profile for a specific organization.

**Query Parameters:**
- `organizationId` (required): The organization ID

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "legalEntityName": "Example Fintech Ltd",
      "tradingName": "ExamplePay",
      "companyRegistrationNumber": "12345678",
      "dateOfIncorporation": "2020-01-15",
      "countryOfIncorporation": "PK",
      "websiteUrl": "https://example.com",
      "companySize": "medium",
      "fintechCategory": "PSP",
      "businessModel": "B2C",
      "primaryJurisdiction": "PK",
      "services": ["money_transfer", "payment_processing"],
      "countryOperations": [...],
      "complianceMapping": [...],
      "complianceFramework": {...},
      "partnerships": [...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing organizationId)
- `401` - Unauthorized
- `403` - Access denied
- `404` - Organization not found
- `500` - Server error

### POST /api/organizations/profile

Save or create a complete organization profile. This replaces any existing profile.

**Request Body:**
```json
{
  "organizationId": "org_123",
  "profile": {
    "legalEntityName": "Example Fintech Ltd",
    "countryOfIncorporation": "PK",
    "fintechCategory": "PSP",
    "businessModel": "B2C",
    "primaryJurisdiction": "PK",
    "services": ["money_transfer"],
    "countryOperations": [],
    "complianceMapping": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": { ... }
  }
}
```

**Status Codes:**
- `201` - Created/Updated successfully
- `400` - Validation error
- `401` - Unauthorized
- `403` - Access denied
- `404` - Organization not found
- `500` - Server error

### PATCH /api/organizations/profile

Partially update an organization profile. Only provided fields will be updated.

**Request Body:**
```json
{
  "organizationId": "org_123",
  "profile": {
    "services": ["money_transfer", "card_issuance"],
    "companySize": "large"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": { ... }
  }
}
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Validation error
- `401` - Unauthorized
- `403` - Access denied
- `404` - Organization not found
- `500` - Server error

## Target Discovery API

### POST /api/targets/discover

Discover relevant regulatory targets using AI analysis of the organization profile.

**Request Body:**
```json
{
  "organizationId": "org_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "targets": [
      {
        "url": "https://www.sbp.org.pk/regulations/",
        "label": "State Bank of Pakistan - Regulations",
        "jurisdiction": "PK",
        "category": "regulations",
        "confidence": 0.95,
        "reasoning": "Highly relevant for PSP operating in Pakistan",
        "relevantServices": ["money_transfer", "payment_processing"],
        "relevantCountries": ["PK"]
      }
    ],
    "count": 1
  }
}
```

**Status Codes:**
- `200` - Success (may return empty targets array)
- `400` - Bad request or profile not found
- `401` - Unauthorized
- `403` - Access denied
- `404` - Organization not found
- `500` - Server error (LLM service error)

**Error Response (LLM failures):**
```json
{
  "success": false,
  "error": "Target discovery timed out. Please try again or add targets manually.",
  "details": {
    "retryable": true,
    "originalError": "..." // Only in development
  }
}
```

## Bulk Target Creation API

### POST /api/targets/bulk

Create multiple targets in a single request.

**Request Body:**
```json
{
  "organizationId": "org_123",
  "targets": [
    {
      "url": "https://www.sbp.org.pk/regulations/",
      "label": "State Bank of Pakistan - Regulations",
      "jurisdiction": "PK",
      "category": "regulations",
      "crawlFrequency": "daily"
    },
    {
      "url": "https://www.sbp.org.pk/circulars/",
      "label": "State Bank of Pakistan - Circulars",
      "jurisdiction": "PK",
      "category": "regulations",
      "crawlFrequency": "daily"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": [
      {
        "id": "target_123",
        "url": "https://www.sbp.org.pk/regulations/",
        "label": "State Bank of Pakistan - Regulations",
        "jurisdiction": "PK",
        "category": "regulations",
        "crawlFrequency": "daily",
        "status": "pending",
        "organizationId": "org_123",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "createdCount": 1,
    "failedCount": 1,
    "errors": [
      {
        "target": { "url": "...", "label": "..." },
        "error": "Invalid URL format"
      }
    ]
  }
}
```

**Status Codes:**
- `201` - At least one target created successfully
- `400` - Validation error or all targets failed
- `401` - Unauthorized
- `403` - Access denied or quota exceeded
- `404` - Organization not found
- `500` - Server error

**Notes:**
- Maximum 100 targets per request
- Targets are created individually; partial success is possible
- Failed targets are returned in the `errors` array
- Quota limits are enforced based on subscription plan

## Targets API

### GET /api/targets

List all targets for an organization.

**Query Parameters:**
- `organizationId` (required): The organization ID

**Response:**
```json
{
  "success": true,
  "data": {
    "targets": [
      {
        "id": "target_123",
        "url": "https://www.sbp.org.pk/regulations/",
        "label": "State Bank of Pakistan - Regulations",
        "jurisdiction": "PK",
        "category": "regulations",
        "crawlFrequency": "daily",
        "status": "active",
        "organizationId": "org_123",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### POST /api/targets

Create a new target.

**Request Body:**
```json
{
  "organizationId": "org_123",
  "url": "https://www.sbp.org.pk/regulations/",
  "label": "State Bank of Pakistan - Regulations",
  "jurisdiction": "PK",
  "category": "regulations",
  "crawlFrequency": "daily"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "target": {
      "id": "target_123",
      ...
    }
  }
}
```

### GET /api/targets/[id]

Get a single target by ID.

**Query Parameters:**
- `organizationId` (required): The organization ID

**Response:**
```json
{
  "success": true,
  "data": {
    "target": { ... }
  }
}
```

### DELETE /api/targets/[id]

Delete a target.

**Query Parameters:**
- `organizationId` (required): The organization ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Target deleted successfully"
  }
}
```

## Organization Profile Schema

The organization profile follows this structure:

```typescript
interface OrganizationProfile {
  // Company Information
  legalEntityName: string;
  tradingName?: string;
  companyRegistrationNumber?: string;
  dateOfIncorporation?: string; // ISO date string
  countryOfIncorporation: string; // ISO 3166-1 alpha-2
  websiteUrl?: string;
  companySize?: "startup" | "small" | "medium" | "large" | "enterprise";
  fintechCategory: "EMI" | "Neobank" | "PSP" | "Remittance" | "Cryptocurrency" | "Lending" | "Investment" | "Insurance" | "Wealth Management" | "Trading Platform" | "Other";
  businessModel: "B2C" | "B2B" | "B2B2C";
  primaryJurisdiction: string; // ISO 3166-1 alpha-2

  // Services & Products
  services: FintechService[];

  // Geographic Operations
  countryOperations: CountryOperation[];

  // Compliance Mapping
  complianceMapping: ServiceCountryCompliance[];
  complianceFramework?: ComplianceFramework;

  // Partnerships
  partnerships?: Partnership[];

  // Metadata
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}
```

See `lib/types/organization-profile.ts` for complete type definitions.

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors, missing parameters)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (access denied, quota exceeded)
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a user-friendly message and optional details for debugging (in development mode only).

## Rate Limiting

API endpoints are rate-limited using PostgreSQL-backed counters. Rate limits vary by endpoint and subscription plan. When rate limits are exceeded, a `429 Too Many Requests` response is returned.

## Audit Logging

All profile updates and target operations are logged in the audit log for compliance and security purposes.

