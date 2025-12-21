import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { invitations, organizationMembers } from "@/lib/db/schema";

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 },
      );
    }

    // Get invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    // Check if requester is admin of the organization
    const [requesterMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, invitation.organizationId),
        ),
      )
      .limit(1);

    if (!requesterMember || requesterMember.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "You must be an administrator to cancel invitations" },
        { status: 403 },
      );
    }

    // Delete invitation
    await db.delete(invitations).where(eq(invitations.id, invitationId));

    return NextResponse.json(
      { message: "Invitation canceled successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Invitation cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation. Please try again." },
      { status: 500 },
    );
  }
}
