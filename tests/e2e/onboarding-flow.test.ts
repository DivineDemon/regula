import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  targets,
  users,
} from "@/lib/db/schema";
import type { SuggestedTarget } from "@/lib/services/llm";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

// Mock all external services
vi.mock("@/lib/services/llm", () => ({
  discoverRelevantTargetsFromProfile: vi.fn(),
}));

vi.mock("@/lib/services/audit", () => ({
  createAuditLog: vi.fn(async () => {}),
}));

vi.mock("@/lib/services/quotas", () => ({
  quotaService: {
    checkQuota: vi.fn(async () => ({ allowed: true })),
  },
}));

vi.mock("@/lib/services/usage", () => ({
  usageService: {
    getTargetCount: vi.fn(async () => 0),
  },
}));

vi.mock("@/lib/inngest/functions/crawl", () => ({
  triggerCrawl: vi.fn(async () => {}),
}));

describe("End-to-End Onboarding Flow", () => {
  let testUserId: string;
  let testOrgId: string;

  beforeEach(async () => {
    // Create test user
    testUserId = nanoid();
    await db.insert(users).values({
      id: testUserId,
      email: "test@example.com",
      name: "Test User",
      emailVerified: new Date(),
    });

    // Create test organization
    testOrgId = nanoid();
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Test Organization",
      slug: `test-org-${testOrgId}`,
      plan: "free",
    });

    // Create organization membership
    await db.insert(organizationMembers).values({
      userId: testUserId,
      organizationId: testOrgId,
      role: UserRole.ADMIN,
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up in reverse order
    try {
      await db.delete(targets).where(eq(targets.organizationId, testOrgId));
    } catch {
      // Ignore
    }
    try {
      await db
        .delete(organizationMembers)
        .where(eq(organizationMembers.organizationId, testOrgId));
    } catch {
      // Ignore
    }
    try {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    } catch {
      // Ignore
    }
    try {
      await db.delete(users).where(eq(users.id, testUserId));
    } catch {
      // Ignore
    }
  });

  it("should complete full onboarding flow: profile creation -> target discovery -> target selection", async () => {
    // Step 1: Create organization profile
    const profile: OrganizationProfile = {
      legalEntityName: "Acme Fintech Ltd",
      tradingName: "Acme Pay",
      companyRegistrationNumber: "12345678",
      dateOfIncorporation: "2020-01-15",
      countryOfIncorporation: "GB",
      websiteUrl: "https://acme.com",
      companySize: "medium",
      fintechCategory: "PSP",
      businessModel: "B2C",
      primaryJurisdiction: "GB",
      services: ["payment_processing", "money_transfer"],
      countryOperations: [
        {
          countryCode: "GB",
          operationType: "direct",
          services: ["payment_processing"],
          licenseStatus: "licensed",
          licenses: [
            {
              licenseNumber: "LIC-12345",
              issuingAuthority: "FCA",
              issueDate: "2020-01-15",
              status: "licensed",
            },
          ],
        },
        {
          countryCode: "US",
          operationType: "indirect",
          services: ["money_transfer"],
          licenseStatus: "applying",
        },
      ],
      complianceMapping: [
        {
          service: "payment_processing",
          countryCode: "GB",
          complianceRequirements: ["AML", "KYC", "PSD2"],
          context: "FCA regulated",
        },
      ],
      complianceFramework: {
        amlFramework: "FATF Recommendations",
        kycProcedures: "Enhanced due diligence",
        dataProtectionFramework: "GDPR",
        privacyPolicyUrl: "https://acme.com/privacy",
        termsOfServiceUrl: "https://acme.com/terms",
        certifications: ["PCI_DSS", "ISO_27001"],
      },
      partnerships: [
        {
          type: "payment_network",
          details: { network: "Visa" },
        },
        {
          type: "remittance_partner",
          details: {
            corridors: ["GB", "US"],
            count: 3,
          },
        },
      ],
    };

    // Save profile to database
    await db
      .update(organizations)
      .set({ profile: profile as unknown as OrganizationProfile })
      .where(eq(organizations.id, testOrgId));

    // Verify profile was saved
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, testOrgId))
      .limit(1);

    expect(org.profile).toBeDefined();
    const savedProfile = org.profile as OrganizationProfile;
    expect(savedProfile.legalEntityName).toBe("Acme Fintech Ltd");
    expect(savedProfile.services).toHaveLength(2);

    // Step 2: Discover targets using LLM
    const { discoverRelevantTargetsFromProfile } = await import(
      "@/lib/services/llm"
    );

    const mockTargets: SuggestedTarget[] = [
      {
        url: "https://www.fca.org.uk/updates",
        label: "FCA Regulatory Updates",
        jurisdiction: "GB",
        category: "regulations",
        confidence: 0.95,
        reasoning: "Primary regulator for payment services in the UK",
        relevantServices: ["payment_processing"],
        relevantCountries: ["GB"],
      },
      {
        url: "https://www.fincen.gov/news",
        label: "FinCEN News and Updates",
        jurisdiction: "US",
        category: "aml",
        confidence: 0.9,
        reasoning: "US AML regulatory authority",
        relevantServices: ["money_transfer"],
        relevantCountries: ["US"],
      },
      {
        url: "https://www.ecb.europa.eu/paym/psd2",
        label: "ECB PSD2 Information",
        jurisdiction: "EU",
        category: "regulations",
        confidence: 0.85,
        reasoning: "PSD2 compliance requirements",
        relevantServices: ["payment_processing"],
        relevantCountries: ["GB"],
      },
    ];

    vi.mocked(discoverRelevantTargetsFromProfile).mockResolvedValue(
      mockTargets,
    );

    const discoveredTargets =
      await discoverRelevantTargetsFromProfile(savedProfile);

    expect(discoveredTargets).toHaveLength(3);
    expect(discoveredTargets[0].url).toBe("https://www.fca.org.uk/updates");

    // Step 3: User selects targets (simulate selection of first 2 targets)
    const selectedTargets = discoveredTargets.slice(0, 2);

    // Step 4: Create selected targets in bulk
    const { POST } = await import("@/app/api/targets/bulk/route");

    const bulkRequest = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: selectedTargets.map((target) => ({
          url: target.url,
          label: target.label,
          jurisdiction: target.jurisdiction,
          category: target.category,
          crawlFrequency: "daily" as const,
        })),
      }),
    });

    // Mock auth for bulk creation
    vi.mock("@/lib/utils/api-helpers", () => ({
      requireOrgAccess: vi.fn(async () => ({
        id: testUserId,
        email: "test@example.com",
      })),
      getClientIp: vi.fn(() => "127.0.0.1"),
      getUserAgent: vi.fn(() => "test-agent"),
      successResponse: (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      errorResponse: (message: string, status = 400) =>
        new Response(JSON.stringify({ error: message }), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    }));

    const bulkResponse = await POST(bulkRequest);
    expect(bulkResponse.status).toBe(201);

    const bulkData = await bulkResponse.json();
    expect(bulkData.createdCount).toBe(2);

    // Step 5: Verify targets were created
    const createdTargets = await db
      .select()
      .from(targets)
      .where(eq(targets.organizationId, testOrgId));

    expect(createdTargets).toHaveLength(2);
    expect(createdTargets[0].url).toBe("https://www.fca.org.uk/updates");
    expect(createdTargets[1].url).toBe("https://www.fincen.gov/news");

    // Step 6: Verify onboarding is complete (organization has targets)
    const hasTargets = createdTargets.length > 0;
    expect(hasTargets).toBe(true);
  });

  it("should handle target discovery failure gracefully", async () => {
    // Create profile
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

    // Mock LLM failure
    const { discoverRelevantTargetsFromProfile } = await import(
      "@/lib/services/llm"
    );

    vi.mocked(discoverRelevantTargetsFromProfile).mockRejectedValue(
      new Error("LLM service timeout"),
    );

    // Attempt discovery
    await expect(discoverRelevantTargetsFromProfile(profile)).rejects.toThrow();

    // User should still be able to manually add targets
    const { POST } = await import("@/app/api/targets/bulk/route");

    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: [
          {
            url: "https://example.com/manual-target",
            label: "Manually Added Target",
            crawlFrequency: "daily",
          },
        ],
      }),
    });

    // Mock auth
    vi.mock("@/lib/utils/api-helpers", () => ({
      requireOrgAccess: vi.fn(async () => ({
        id: testUserId,
        email: "test@example.com",
      })),
      getClientIp: vi.fn(() => "127.0.0.1"),
      getUserAgent: vi.fn(() => "test-agent"),
      successResponse: (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      errorResponse: (message: string, status = 400) =>
        new Response(JSON.stringify({ error: message }), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    }));

    const response = await POST(request);
    expect(response.status).toBe(201);

    // Verify manual target was created
    const targetsTable = targets;
    const createdTargets = await db
      .select()
      .from(targetsTable)
      .where(eq(targetsTable.organizationId, testOrgId));

    expect(createdTargets).toHaveLength(1);
    expect(createdTargets[0].url).toBe("https://example.com/manual-target");
  });

  it("should handle partial target creation failure", async () => {
    // Create profile
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

    // Mock LLM to return targets
    const { discoverRelevantTargetsFromProfile } = await import(
      "@/lib/services/llm"
    );

    const mockTargets: SuggestedTarget[] = [
      {
        url: "https://example.com/valid",
        label: "Valid Target",
        confidence: 0.9,
        reasoning: "Valid",
      },
      {
        url: "https://example.com/another",
        label: "Another Valid",
        confidence: 0.8,
        reasoning: "Valid",
      },
    ];

    vi.mocked(discoverRelevantTargetsFromProfile).mockResolvedValue(
      mockTargets,
    );

    const discovered = await discoverRelevantTargetsFromProfile(profile);
    expect(discovered).toHaveLength(2);

    // Create targets - one should fail validation
    const { POST } = await import("@/app/api/targets/bulk/route");

    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: [
          {
            url: "https://example.com/valid",
            label: "Valid Target",
            crawlFrequency: "daily",
          },
          {
            url: "invalid-url", // This should fail validation
            label: "Invalid Target",
            crawlFrequency: "daily",
          },
        ],
      }),
    });

    // Mock auth
    vi.mock("@/lib/utils/api-helpers", () => ({
      requireOrgAccess: vi.fn(async () => ({
        id: testUserId,
        email: "test@example.com",
      })),
      getClientIp: vi.fn(() => "127.0.0.1"),
      getUserAgent: vi.fn(() => "test-agent"),
      successResponse: (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      errorResponse: (message: string, status = 400) =>
        new Response(JSON.stringify({ error: message }), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    }));

    const response = await POST(request);
    // Should return 400 due to validation error
    expect(response.status).toBe(400);
  });

  it("should persist profile updates across steps", async () => {
    // Simulate step-by-step profile building
    let currentProfile: Partial<OrganizationProfile> = {};

    // Step 1: Company Profile
    currentProfile = {
      ...currentProfile,
      legalEntityName: "Test Company",
      countryOfIncorporation: "US",
      fintechCategory: "PSP",
      businessModel: "B2C",
      primaryJurisdiction: "US",
    };

    // Step 2: Services
    currentProfile = {
      ...currentProfile,
      services: ["payment_processing", "money_transfer"],
    };

    // Step 3: Geographic Operations
    currentProfile = {
      ...currentProfile,
      countryOperations: [
        {
          countryCode: "US",
          operationType: "direct",
          services: ["payment_processing"],
          licenseStatus: "licensed",
        },
      ],
    };

    // Step 4: Compliance Mapping
    currentProfile = {
      ...currentProfile,
      complianceMapping: [
        {
          service: "payment_processing",
          countryCode: "US",
          complianceRequirements: ["AML", "KYC"],
        },
      ],
    };

    // Final: Save complete profile
    const completeProfile: OrganizationProfile = {
      ...currentProfile,
      services: currentProfile.services || [],
      countryOperations: currentProfile.countryOperations || [],
      complianceMapping: currentProfile.complianceMapping || [],
    } as OrganizationProfile;

    await db
      .update(organizations)
      .set({ profile: completeProfile as unknown as OrganizationProfile })
      .where(eq(organizations.id, testOrgId));

    // Verify all steps are reflected
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, testOrgId))
      .limit(1);

    const saved = org.profile as OrganizationProfile;
    expect(saved.legalEntityName).toBe("Test Company");
    expect(saved.services).toHaveLength(2);
    expect(saved.countryOperations).toHaveLength(1);
    expect(saved.complianceMapping).toHaveLength(1);
  });
});
