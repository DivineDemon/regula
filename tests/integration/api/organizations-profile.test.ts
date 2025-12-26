import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "@/app/api/organizations/profile/route";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

// Mock the auth and database helpers
vi.mock("@/lib/utils/api-helpers", async () => {
  const actual = await vi.importActual("@/lib/utils/api-helpers");
  return {
    ...actual,
    requireOrgAccess: vi.fn(async (_organizationId: string) => ({
      id: "test-user-id",
      email: "test@example.com",
    })),
    getClientIp: vi.fn(() => "127.0.0.1"),
    getUserAgent: vi.fn(() => "test-agent"),
    successResponse: vi.fn((data: unknown, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
    errorResponse: vi.fn((message: string, status = 400, details?: unknown) => {
      return new Response(JSON.stringify({ error: message, details }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  };
});

vi.mock("@/lib/services/audit", () => ({
  createAuditLog: vi.fn(async () => {}),
}));

describe("Organization Profile API", () => {
  let testOrgId: string;

  beforeEach(async () => {
    // Create a test organization
    testOrgId = nanoid();
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Test Organization",
      slug: `test-org-${testOrgId}`,
      plan: "free",
    });
  });

  afterEach(async () => {
    // Clean up test organization
    try {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("POST /api/organizations/profile", () => {
    it("should create a new profile", async () => {
      const validProfile: OrganizationProfile = {
        legalEntityName: "Test Company Ltd",
        countryOfIncorporation: "US",
        fintechCategory: "PSP",
        businessModel: "B2C",
        primaryJurisdiction: "US",
        services: ["payment_processing"],
        countryOperations: [
          {
            countryCode: "US",
            operationType: "direct",
            services: ["payment_processing"],
            licenseStatus: "licensed",
          },
        ],
        complianceMapping: [],
      };

      const request = new Request(
        "http://localhost/api/organizations/profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: testOrgId,
            profile: validProfile,
          }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.profile).toBeDefined();
      expect(data.profile.legalEntityName).toBe("Test Company Ltd");
    });

    it("should reject invalid profile data", async () => {
      const invalidProfile = {
        // Missing required fields
        legalEntityName: "Test",
      };

      const request = new Request(
        "http://localhost/api/organizations/profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: testOrgId,
            profile: invalidProfile,
          }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should reject request for non-existent organization", async () => {
      const validProfile: OrganizationProfile = {
        legalEntityName: "Test Company",
        countryOfIncorporation: "US",
        fintechCategory: "PSP",
        businessModel: "B2C",
        primaryJurisdiction: "US",
        services: ["payment_processing"],
        countryOperations: [
          {
            countryCode: "US",
            operationType: "direct",
            services: ["payment_processing"],
            licenseStatus: "licensed",
          },
        ],
        complianceMapping: [],
      };

      const request = new Request(
        "http://localhost/api/organizations/profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: "non-existent-id",
            profile: validProfile,
          }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/organizations/profile", () => {
    it("should retrieve existing profile", async () => {
      // First create a profile
      const profile: OrganizationProfile = {
        legalEntityName: "Test Company",
        countryOfIncorporation: "US",
        fintechCategory: "PSP",
        businessModel: "B2C",
        primaryJurisdiction: "US",
        services: ["payment_processing"],
        countryOperations: [
          {
            countryCode: "US",
            operationType: "direct",
            services: ["payment_processing"],
            licenseStatus: "licensed",
          },
        ],
        complianceMapping: [],
      };

      await db
        .update(organizations)
        .set({ profile: profile as unknown as OrganizationProfile })
        .where(eq(organizations.id, testOrgId));

      const request = new Request(
        `http://localhost/api/organizations/profile?organizationId=${testOrgId}`,
        {
          method: "GET",
        },
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.profile).toBeDefined();
      expect(data.profile.legalEntityName).toBe("Test Company");
    });

    it("should return null for organization without profile", async () => {
      const request = new Request(
        `http://localhost/api/organizations/profile?organizationId=${testOrgId}`,
        {
          method: "GET",
        },
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.profile).toBeNull();
    });

    it("should reject request without organizationId", async () => {
      const request = new Request(
        "http://localhost/api/organizations/profile",
        {
          method: "GET",
        },
      );

      const response = await GET(request);
      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /api/organizations/profile", () => {
    it("should update existing profile partially", async () => {
      // Create initial profile
      const initialProfile: OrganizationProfile = {
        legalEntityName: "Initial Company",
        countryOfIncorporation: "US",
        fintechCategory: "PSP",
        businessModel: "B2C",
        primaryJurisdiction: "US",
        services: ["payment_processing"],
        countryOperations: [
          {
            countryCode: "US",
            operationType: "direct",
            services: ["payment_processing"],
            licenseStatus: "licensed",
          },
        ],
        complianceMapping: [],
      };

      await db
        .update(organizations)
        .set({ profile: initialProfile as unknown as OrganizationProfile })
        .where(eq(organizations.id, testOrgId));

      // Update with partial data
      const request = new Request(
        "http://localhost/api/organizations/profile",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: testOrgId,
            profile: {
              tradingName: "Updated Trading Name",
            },
          }),
        },
      );

      const response = await PATCH(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.profile.legalEntityName).toBe("Initial Company");
      expect(data.profile.tradingName).toBe("Updated Trading Name");
    });

    it("should merge updates correctly", async () => {
      const initialProfile: OrganizationProfile = {
        legalEntityName: "Initial Company",
        tradingName: "Initial Trading",
        countryOfIncorporation: "US",
        fintechCategory: "PSP",
        businessModel: "B2C",
        primaryJurisdiction: "US",
        services: ["payment_processing"],
        countryOperations: [],
        complianceMapping: [],
      };

      await db
        .update(organizations)
        .set({ profile: initialProfile as unknown as OrganizationProfile })
        .where(eq(organizations.id, testOrgId));

      const request = new Request(
        "http://localhost/api/organizations/profile",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: testOrgId,
            profile: {
              tradingName: "New Trading Name",
              services: ["payment_processing", "money_transfer"],
            },
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(data.profile.legalEntityName).toBe("Initial Company");
      expect(data.profile.tradingName).toBe("New Trading Name");
      expect(data.profile.services).toHaveLength(2);
    });

    it("should reject invalid partial update", async () => {
      const request = new Request(
        "http://localhost/api/organizations/profile",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: testOrgId,
            profile: {
              countryOfIncorporation: "INVALID", // Invalid country code
            },
          }),
        },
      );

      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });
  });
});
