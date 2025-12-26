# Testing Guide

This directory contains comprehensive tests for the Regula onboarding system, organized into three categories:

## Test Structure

```
tests/
├── setup.ts                    # Test configuration and global setup
├── unit/                        # Unit tests
│   ├── validations/            # Validation schema tests
│   ├── services/               # Service function tests
│   └── hooks/                  # React hook tests
├── integration/                # Integration tests
│   └── api/                    # API endpoint tests
└── e2e/                        # End-to-end tests
    └── onboarding-flow.test.ts # Complete onboarding flow tests
```

## Running Tests

### All Tests
```bash
bun test
# or
npm test
```

### Unit Tests Only
```bash
bun test:unit
# or
npm run test:unit
```

### Integration Tests Only
```bash
bun test:integration
# or
npm run test:integration
```

### E2E Tests Only
```bash
bun test:e2e
# or
npm run test:e2e
```

### Watch Mode
```bash
bun test:watch
# or
npm run test:watch
```

## Test Categories

### Unit Tests

Unit tests focus on testing individual functions, schemas, and hooks in isolation:

- **Validation Schemas** (`tests/unit/validations/`): Tests for Zod validation schemas including:
  - `companyProfileSchema` - Main organization profile validation
  - `licenseSchema` - Regulatory license validation
  - `countryOperationSchema` - Country operation validation
  - `complianceMappingSchema` - Compliance mapping validation
  - `partnershipSchema` - Partnership validation
  - `complianceFrameworkSchema` - Compliance framework validation

- **LLM Parsing** (`tests/unit/services/llm-parsing.test.ts`): Tests for LLM response parsing functions:
  - `parseTargetDiscoveryResponse` - Target discovery response parsing
  - `parseClassificationResponse` - Content classification parsing
  - `parseSummarizationResponse` - Content summarization parsing
  - `parseEntityExtractionResponse` - Entity extraction parsing

- **Hooks** (`tests/unit/hooks/use-onboarding-state.test.ts`): Tests for React hooks:
  - `useOnboardingState` - Onboarding state management with localStorage persistence

### Integration Tests

Integration tests verify that API endpoints work correctly with the database:

- **Organization Profile API** (`tests/integration/api/organizations-profile.test.ts`):
  - `POST /api/organizations/profile` - Create/update profile
  - `GET /api/organizations/profile` - Retrieve profile
  - `PATCH /api/organizations/profile` - Partial profile update

- **Target Discovery API** (`tests/integration/api/targets-discover.test.ts`):
  - `POST /api/targets/discover` - Discover targets using LLM

- **Bulk Target Creation API** (`tests/integration/api/targets-bulk.test.ts`):
  - `POST /api/targets/bulk` - Create multiple targets

### End-to-End Tests

E2E tests verify the complete onboarding flow:

- **Onboarding Flow** (`tests/e2e/onboarding-flow.test.ts`):
  - Complete flow: Profile creation → Target discovery → Target selection
  - Error handling scenarios
  - Partial failure handling
  - Profile persistence across steps

## Test Database Setup

Integration and E2E tests require a test database. Set up a separate test database:

```env
# .env.test
DATABASE_URL=postgresql://user:password@localhost:5432/regula_test
```

The tests will:
- Create test data before each test
- Clean up test data after each test
- Use transactions where possible to ensure isolation

## Mocking

Tests use Vitest's mocking capabilities to:

- Mock external services (LLM, audit logs, quotas, etc.)
- Mock authentication and authorization
- Mock database operations where appropriate
- Isolate units under test

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { companyProfileSchema } from "@/lib/validations/organization-profile";

describe("My Feature", () => {
  it("should validate correctly", () => {
    const result = companyProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/my-endpoint/route";
import { db } from "@/lib/db";

describe("My API Endpoint", () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it("should handle requests correctly", async () => {
    const request = new Request("http://localhost/api/my-endpoint", {
      method: "POST",
      body: JSON.stringify(testData),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

## Coverage

Run tests with coverage:

```bash
bun test --coverage
```

Coverage reports are generated in the `coverage/` directory.

## Continuous Integration

Tests are designed to run in CI environments. Ensure:

1. Test database is available
2. Environment variables are set
3. All dependencies are installed

## Troubleshooting

### Tests failing with database errors
- Ensure test database exists and is accessible
- Check `DATABASE_URL` in test environment
- Verify database migrations are applied

### Tests failing with mock errors
- Check that mocks are properly set up in `beforeEach`
- Ensure mocks are cleared in `afterEach`
- Verify mock implementations match actual service interfaces

### Tests timing out
- Increase timeout for slow operations
- Check for hanging promises or unclosed connections
- Verify database cleanup is working correctly

