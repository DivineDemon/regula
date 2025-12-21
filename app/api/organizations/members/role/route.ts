import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, userId, role } = body;

    if (!organizationId || !userId || !role) {
      return NextResponse.json(
        { error: "Organization ID, user ID, and role are required" },
        { status: 400 },
      );
    }

    // Check if requester is admin
    const [requesterMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!requesterMember || requesterMember.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "You must be an administrator to update member roles" },
        { status: 403 },
      );
    }

    // Don't allow changing own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 },
      );
    }

    // Update member role
    await db
      .update(organizationMembers)
      .set({ role: role as UserRole })
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      );

    return NextResponse.json(
      { message: "Member role updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Role update error:", error);
    return NextResponse.json(
      { error: "Failed to update member role. Please try again." },
      { status: 500 },
    );
  }
}
