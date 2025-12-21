import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, targets, versions } from "@/lib/db/schema";
import { detectChanges } from "@/lib/services/diff";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const currentVersionId = searchParams.get("currentVersionId");
    const previousVersionId = searchParams.get("previousVersionId");
    const organizationId = searchParams.get("organizationId");

    if (!currentVersionId || !previousVersionId || !organizationId) {
      return NextResponse.json(
        {
          error:
            "currentVersionId, previousVersionId, and organizationId are required",
        },
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

    // Verify both versions belong to organization
    const [currentVersion] = await db
      .select({
        version: versions,
        target: targets,
      })
      .from(versions)
      .innerJoin(targets, eq(versions.targetId, targets.id))
      .where(
        and(
          eq(versions.id, currentVersionId),
          eq(targets.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!currentVersion) {
      return NextResponse.json(
        { error: "Current version not found" },
        { status: 404 },
      );
    }

    // Get diff metadata from current version if available
    let diffMetadata = null;
    if (currentVersion.version.diffMetadata) {
      try {
        diffMetadata = JSON.parse(currentVersion.version.diffMetadata);
      } catch {
        // Ignore parse errors
      }
    }

    // If diff metadata doesn't exist, compute it
    if (!diffMetadata) {
      try {
        diffMetadata = await detectChanges({
          currentVersionId,
          previousVersionId,
          organizationId,
          targetId: currentVersion.target.id,
        });
      } catch (error) {
        console.error("Error computing diff:", error);
        // Return basic diff info
        diffMetadata = {
          hasChanges: currentVersion.version.hasChanges || false,
          changeTypes: [],
          structuralChanges: [],
          affectedSections: [],
        };
      }
    }

    return NextResponse.json(diffMetadata);
  } catch (error) {
    console.error("Error comparing versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
