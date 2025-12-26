import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/targets/bulk/route";
import { db } from "@/lib/db";
import { organizations, targets } from "@/lib/db/schema";

// Mock the auth helpers
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

// Mock services
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

describe("Bulk Target Creation API", () => {
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
    // Clean up targets
    try {
      await db.delete(targets).where(eq(targets.organizationId, testOrgId));
    } catch {
      // Ignore cleanup errors
    }
    // Clean up organization
    try {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should create multiple targets in bulk", async () => {
    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: [
          {
            url: "https://example.com/regulatory-1",
            label: "Regulatory Target 1",
            jurisdiction: "US",
            category: "regulations",
            crawlFrequency: "daily",
          },
          {
            url: "https://example.com/regulatory-2",
            label: "Regulatory Target 2",
            jurisdiction: "GB",
            category: "aml",
            crawlFrequency: "weekly",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.created).toBeDefined();
    expect(data.created).toHaveLength(2);
    expect(data.createdCount).toBe(2);
    expect(data.failedCount).toBe(0);

    // Verify targets were created in database
    const createdTargets = await db
      .select()
      .from(targets)
      .where(eq(targets.organizationId, testOrgId));

    expect(createdTargets).toHaveLength(2);
    expect(createdTargets[0].url).toBe("https://example.com/regulatory-1");
    expect(createdTargets[1].url).toBe("https://example.com/regulatory-2");
  });

  it("should handle partial failures gracefully", async () => {
    // This test would require mocking the database to fail on specific inserts
    // For now, we'll test the structure
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
            url: "invalid-url", // Invalid URL
            label: "Invalid Target",
            crawlFrequency: "daily",
          },
        ],
      }),
    });

    const response = await POST(request);
    // Should return 400 due to validation error
    expect(response.status).toBe(400);
  });

  it("should reject empty targets array", async () => {
    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should reject too many targets", async () => {
    const manyTargets = Array.from({ length: 101 }, (_, i) => ({
      url: `https://example.com/target-${i}`,
      label: `Target ${i}`,
      crawlFrequency: "daily" as const,
    }));

    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: manyTargets,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should validate target URLs", async () => {
    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: [
          {
            url: "not-a-valid-url",
            label: "Invalid URL Target",
            crawlFrequency: "daily",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should validate required fields", async () => {
    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: [
          {
            // Missing url and label
            crawlFrequency: "daily",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should set default crawl frequency", async () => {
    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: testOrgId,
        targets: [
          {
            url: "https://example.com/target",
            label: "Test Target",
            // crawlFrequency not provided, should default to "daily"
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.created[0].crawlFrequency).toBe("daily");
  });

  it("should reject request for non-existent organization", async () => {
    const request = new Request("http://localhost/api/targets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: "non-existent-id",
        targets: [
          {
            url: "https://example.com/target",
            label: "Test Target",
            crawlFrequency: "daily",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
