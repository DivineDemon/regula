import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, targets, versions } from "@/lib/db/schema";
import { getVersionContent } from "@/lib/services/versions";

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

    // Get content
    const content = await getVersionContent(id, organizationId);

    // Parse metadata
    let metadata = null;
    if (versionData.version.metadata) {
      try {
        metadata = JSON.parse(versionData.version.metadata);
      } catch {
        // Ignore parse errors
      }
    }

    return NextResponse.json({
      id: versionData.version.id,
      content: content || "",
      crawledAt: versionData.version.crawledAt,
      metadata,
    });
  } catch (error) {
    console.error("Error fetching version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
