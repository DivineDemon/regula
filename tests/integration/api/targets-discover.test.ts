import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/targets/discover/route";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import type { SuggestedTarget } from "@/lib/services/llm";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

// Mock the auth helpers
vi.mock("@/lib/utils/api-helpers", async () => {
  const actual = await vi.importActual("@/lib/utils/api-helpers");
  return {
    ...actual,
    requireOrgAccess: vi.fn(async (_organizationId: string) => ({
      id: "test-user-id",
      email: "test@example.com",
    })),
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

// Mock the LLM service
const mockDiscoverRelevantTargetsFromProfile = vi.fn();
vi.mock("@/lib/services/llm", () => ({
  discoverRelevantTargetsFromProfile: mockDiscoverRelevantTargetsFromProfile,
}));

describe("Target Discovery API", () => {
  let testOrgId: string;

  beforeEach(async () => {
    testOrgId = nanoid();
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Test Organization",
      slug: `test-org-${testOrgId}`,
      plan: "free",
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should discover targets from organization profile", async () => {
    // Set up organization with profile
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

    // Mock LLM response
    const mockTargets: SuggestedTarget[] = [
      {
        url: "https://example.com/regulatory",
        label: "US Payment Regulator",
        jurisdiction: "US",
        category: "regulations",
        confidence: 0.95,
        reasoning: "Primary regulator for payment services",
        relevantServices: ["payment_processing"],
        relevantCountries: ["US"],
      },
    ];

    mockDiscoverRelevantTargetsFromProfile.mockResolvedValue(mockTargets);

    const request = new Request("http://localhost/api/targets/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.targets).toBeDefined();
    expect(data.targets).toHaveLength(1);
    expect(data.targets[0].url).toBe("https://example.com/regulatory");
    expect(data.count).toBe(1);
  });

  it("should return empty array when no targets discovered", async () => {
    const profile: OrganizationProfile = {
      legalEntityName: "Test Company",
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
      .set({ profile: profile as unknown as OrganizationProfile })
      .where(eq(organizations.id, testOrgId));

    mockDiscoverRelevantTargetsFromProfile.mockResolvedValue([]);

    const request = new Request("http://localhost/api/targets/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.targets).toEqual([]);
    expect(data.count).toBe(0);
  });

  it("should reject request for organization without profile", async () => {
    const request = new Request("http://localhost/api/targets/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("profile not found");
  });

  it("should handle LLM service errors gracefully", async () => {
    const profile: OrganizationProfile = {
      legalEntityName: "Test Company",
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
      .set({ profile: profile as unknown as OrganizationProfile })
      .where(eq(organizations.id, testOrgId));

    // Mock LLM error
    mockDiscoverRelevantTargetsFromProfile.mockRejectedValue(
      new Error("LLM service timeout"),
    );

    const request = new Request("http://localhost/api/targets/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should handle timeout errors with specific message", async () => {
    const profile: OrganizationProfile = {
      legalEntityName: "Test Company",
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
      .set({ profile: profile as unknown as OrganizationProfile })
      .where(eq(organizations.id, testOrgId));

    mockDiscoverRelevantTargetsFromProfile.mockRejectedValue(
      new Error("Target discovery timed out after 60000ms"),
    );

    const request = new Request("http://localhost/api/targets/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toContain("timed out");
  });

  it("should reject invalid request body", async () => {
    const request = new Request("http://localhost/api/targets/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing organizationId
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should reject request for non-existent organization", async () => {
    const request = new Request("http://localhost/api/targets/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: "non-existent-id",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
