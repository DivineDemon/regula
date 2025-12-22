import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { targets, versions } from "@/lib/db/schema";
import type { CrawlResult } from "./firecrawl";
import { s3Keys, storage } from "./s3";

/**
 * Version metadata structure
 */
export interface VersionMetadata {
  contentType: "html" | "pdf" | "text";
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  language?: string;
  attachments?: Array<{
    url: string;
    type: string;
    filename: string;
  }>;
  contentSize: number;
  contentStoredInS3: boolean;
  [key: string]: unknown;
}

/**
 * Generate SHA-256 hash of content
 */
export function generateContentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Store a version of crawled content
 */
export async function storeVersion(params: {
  targetId: string;
  crawlResult: CrawlResult;
  organizationId: string;
}): Promise<{ id: string; contentHash: string }> {
  const { targetId, crawlResult, organizationId } = params;

  // Generate content hash
  const contentHash = generateContentHash(crawlResult.content);

  // Prepare metadata
  const metadata: VersionMetadata = {
    contentType: crawlResult.contentType,
    title: crawlResult.metadata.title,
    description: crawlResult.metadata.description,
    author: crawlResult.metadata.author,
    publishedDate: crawlResult.metadata.publishedDate,
    language: crawlResult.metadata.language,
    attachments: crawlResult.metadata.attachments || [],
    contentSize: crawlResult.content.length,
    contentStoredInS3: false,
  };

  // For large content (> 100KB), store in S3 instead of database
  const CONTENT_SIZE_THRESHOLD = 100 * 1024; // 100KB
  const shouldStoreInS3 = crawlResult.content.length > CONTENT_SIZE_THRESHOLD;

  let contentToStore: string | null = crawlResult.content;
  let s3Key: string | null = null;

  if (shouldStoreInS3) {
    const versionId = nanoid();
    s3Key = s3Keys.document(organizationId, targetId, versionId);
    const uploaded = await storage.upload(
      s3Key,
      Buffer.from(crawlResult.content, "utf8"),
      "text/plain",
    );

    if (uploaded) {
      metadata.contentStoredInS3 = true;
      contentToStore = null; // Don't store in DB, reference S3 instead
      // Store the S3 key in metadata for retrieval
      metadata.s3Key = s3Key;
    } else {
      // If S3 upload fails, fall back to storing in DB
      console.warn(
        `Failed to upload content to S3 for target ${targetId}, storing in DB instead`,
      );
      contentToStore = crawlResult.content;
    }
  }

  // Get the previous version to link
  const [previousVersion] = await db
    .select()
    .from(versions)
    .where(eq(versions.targetId, targetId))
    .orderBy(desc(versions.crawledAt))
    .limit(1);

  console.log(
    `Storing version for target ${targetId}: previousVersionId=${previousVersion?.id ?? "none"}, contentHash=${contentHash.substring(0, 8)}...`,
  );

  // Create version record
  const versionId = s3Key
    ? s3Key.split("/").pop()?.replace(".txt", "") || nanoid()
    : nanoid();

  const [newVersion] = await db
    .insert(versions)
    .values({
      id: versionId,
      targetId,
      contentHash,
      content: contentToStore,
      metadata: JSON.stringify(metadata),
      previousVersionId: previousVersion?.id ?? null,
      hasChanges: false, // Will be set after diff comparison
      diffMetadata: null,
    })
    .returning();

  console.log(
    `Version stored successfully: id=${newVersion.id}, previousVersionId=${newVersion.previousVersionId ?? "null"}`,
  );

  return {
    id: newVersion.id,
    contentHash: newVersion.contentHash,
  };
}

/**
 * Retrieve version content (from DB or S3)
 * Verifies organizationId through target relationship
 */
export async function getVersionContent(
  versionId: string,
  organizationId: string,
): Promise<string | null> {
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

  if (!version) {
    return null;
  }

  const versionData = version.version;

  // If content is in DB, return it
  if (versionData.content) {
    return versionData.content;
  }

  // If content is in S3, retrieve it
  if (versionData.metadata) {
    try {
      const metadata = JSON.parse(versionData.metadata) as VersionMetadata;
      if (
        metadata.contentStoredInS3 &&
        metadata.s3Key &&
        typeof metadata.s3Key === "string"
      ) {
        const buffer = await storage.download(metadata.s3Key);
        if (buffer) {
          return buffer.toString("utf8");
        }
      }
    } catch (error) {
      console.error(
        `Failed to parse metadata for version ${versionId}:`,
        error,
      );
    }
  }

  return null;
}

/**
 * Get version by ID with organizationId verification
 */
export async function getVersion(versionId: string, organizationId?: string) {
  if (organizationId) {
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

    return version?.version || null;
  }

  // Fallback for internal use (without org check)
  const [version] = await db
    .select()
    .from(versions)
    .where(eq(versions.id, versionId))
    .limit(1);

  return version || null;
}

/**
 * Get all versions for a target, ordered by crawl date (newest first)
 * Verifies organizationId through target relationship
 */
export async function getVersionsByTarget(
  targetId: string,
  organizationId: string,
) {
  return db
    .select({ version: versions })
    .from(versions)
    .innerJoin(targets, eq(versions.targetId, targets.id))
    .where(
      and(
        eq(versions.targetId, targetId),
        eq(targets.organizationId, organizationId),
      ),
    )
    .orderBy(desc(versions.crawledAt));
}

/**
 * Get version history for a target (latest N versions)
 * Verifies organizationId through target relationship
 */
export async function getVersionHistory(
  targetId: string,
  organizationId: string,
  limit = 10,
): Promise<Array<typeof versions.$inferSelect>> {
  const results = await db
    .select({ version: versions })
    .from(versions)
    .innerJoin(targets, eq(versions.targetId, targets.id))
    .where(
      and(
        eq(versions.targetId, targetId),
        eq(targets.organizationId, organizationId),
      ),
    )
    .orderBy(desc(versions.crawledAt))
    .limit(limit);

  return results.map((r) => r.version);
}

/**
 * Get the latest version for a target
 * Verifies organizationId through target relationship
 */
export async function getLatestVersion(
  targetId: string,
  organizationId: string,
) {
  const [version] = await db
    .select({ version: versions })
    .from(versions)
    .innerJoin(targets, eq(versions.targetId, targets.id))
    .where(
      and(
        eq(versions.targetId, targetId),
        eq(targets.organizationId, organizationId),
      ),
    )
    .orderBy(desc(versions.crawledAt))
    .limit(1);

  return version?.version || null;
}

/**
 * Get the previous version for comparison
 * Verifies organizationId through target relationship
 */
export async function getPreviousVersion(
  versionId: string,
  organizationId: string,
) {
  const [currentVersion] = await db
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

  if (!currentVersion?.version?.previousVersionId) {
    return null;
  }

  return getVersion(currentVersion.version.previousVersionId, organizationId);
}

/**
 * Update version with diff metadata
 * Verifies organizationId through target relationship
 */
export async function updateVersionDiffMetadata(
  versionId: string,
  organizationId: string,
  hasChanges: boolean,
  diffMetadata: Record<string, unknown>,
) {
  // Verify version belongs to organization through target
  const [version] = await db
    .select()
    .from(versions)
    .innerJoin(targets, eq(versions.targetId, targets.id))
    .where(
      and(
        eq(versions.id, versionId),
        eq(targets.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!version) {
    throw new Error("Version not found or access denied");
  }

  await db
    .update(versions)
    .set({
      hasChanges,
      diffMetadata: JSON.stringify(diffMetadata),
    })
    .where(eq(versions.id, versionId));
}

/**
 * Compare two versions by hash
 */
export function compareVersionsByHash(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}
