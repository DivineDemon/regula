import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, name } = body;

    if (!organizationId || !name) {
      return NextResponse.json(
        { error: "Organization ID and name are required" },
        { status: 400 },
      );
    }

    // Check if user is admin of the organization
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

    if (!member || member.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "You must be an administrator to update organization settings",
        },
        { status: 403 },
      );
    }

    // Check if organization exists
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Generate new slug
    const orgSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Check if slug is already taken by another organization
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (existingOrg && existingOrg.id !== organizationId) {
      return NextResponse.json(
        { error: "Organization name is already taken" },
        { status: 400 },
      );
    }

    // Update organization
    await db
      .update(organizations)
      .set({
        name,
        slug: orgSlug,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    return NextResponse.json(
      { message: "Organization updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Organization update error:", error);
    return NextResponse.json(
      { error: "Failed to update organization. Please try again." },
      { status: 500 },
    );
  }
}
