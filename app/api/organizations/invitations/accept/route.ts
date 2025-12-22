import { and, eq } from "drizzle-orm";
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

    // Verify email matches session user first
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

    // Find invitation (including already accepted ones for idempotency check)
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.email, email)))
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 400 },
      );
    }

    // Check if invitation was already accepted
    if (invitation.acceptedAt) {
      // Check if user is a member (invitation was accepted, possibly via registration)
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
        return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 400 });
      }
      // Invitation was accepted but user is not a member - edge case
      return NextResponse.json(
        { error: "Invitation was already accepted" },
        { status: 400 },
      );
    }

    // Check if invitation is expired
    if (invitation.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 },
      );
    }

    // Check if user is already a member (edge case: user was added another way)
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
      // Mark invitation as accepted anyway for idempotency
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
