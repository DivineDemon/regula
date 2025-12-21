import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { invitations, organizationMembers, users } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: "Token and email are required" },
        { status: 400 },
      );
    }

    // Find invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          eq(invitations.email, email),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }

    // Verify email matches session user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || user.email !== email) {
      return NextResponse.json(
        { error: "Invitation email does not match your account" },
        { status: 403 },
      );
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, invitation.organizationId),
        ),
      )
      .limit(1);

    if (existingMember) {
      // Mark invitation as accepted anyway
      await db
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invitation.id));

      return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 400 });
    }

    // Add user to organization
    await db.transaction(async (tx) => {
      // Create membership
      await tx.insert(organizationMembers).values({
        userId: session.user.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      });

      // Mark invitation as accepted
      await tx
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invitation.id));
    });

    return NextResponse.json(
      { message: "Invitation accepted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Invitation acceptance error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation. Please try again." },
      { status: 500 },
    );
  }
}
