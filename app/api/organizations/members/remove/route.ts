import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, userId } = body;

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: "Organization ID and user ID are required" },
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
        { error: "You must be an administrator to remove members" },
        { status: 403 },
      );
    }

    // Don't allow removing yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 400 },
      );
    }

    // Remove member
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      );

    return NextResponse.json(
      { message: "Member removed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Member removal error:", error);
    return NextResponse.json(
      { error: "Failed to remove member. Please try again." },
      { status: 500 },
    );
  }
}
