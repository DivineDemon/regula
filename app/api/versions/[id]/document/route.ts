import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, targets, versions } from "@/lib/db/schema";
import { storage } from "@/lib/services/s3";
import type { VersionMetadata } from "@/lib/services/versions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify user is member of organization
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get version and verify it belongs to organization
    const [versionData] = await db
      .select({
        version: versions,
        target: targets,
      })
      .from(versions)
      .innerJoin(targets, eq(versions.targetId, targets.id))
      .where(
        and(eq(versions.id, id), eq(targets.organizationId, organizationId)),
      )
      .limit(1);

    if (!versionData) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Parse metadata
    let metadata: VersionMetadata | null = null;
    if (versionData.version.metadata) {
      try {
        metadata = JSON.parse(versionData.version.metadata) as VersionMetadata;
      } catch {
        // Ignore parse errors
      }
    }

    // Check if there are attachments (PDFs)
    if (metadata?.attachments && metadata.attachments.length > 0) {
      // For now, return the first attachment URL
      // In a real implementation, you might want to generate a presigned URL
      const attachment = metadata.attachments[0];
      return NextResponse.json({
        url: attachment.url,
        contentType: attachment.type || "application/pdf",
        filename: attachment.filename,
      });
    }

    // If content is stored in S3, generate a presigned URL
    if (metadata?.contentStoredInS3 && metadata.s3Key) {
      const s3Key = metadata.s3Key as string;
      const url = await storage.getPresignedUrl(s3Key, 3600); // 1 hour expiry

      if (url) {
        return NextResponse.json({
          url,
          contentType: metadata.contentType || "text/plain",
          filename: `${id}.txt`,
        });
      }
    }

    // Fallback: return error
    return NextResponse.json(
      { error: "Document not available" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
