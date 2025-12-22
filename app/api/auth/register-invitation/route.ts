import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations, organizationMembers, users } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, invitationToken, invitationEmail } = body;

    // Validation
    if (!name || !email || !password || !invitationToken || !invitationEmail) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Validate email matches invitation email
    if (email !== invitationEmail) {
      return NextResponse.json(
        { error: "Email does not match invitation" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered. Please log in instead." },
        { status: 400 },
      );
    }

    // Find and validate invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, invitationToken),
          eq(invitations.email, invitationEmail),
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate user ID
    const userId = nanoid();

    // Create user and accept invitation in a transaction
    await db.transaction(async (tx) => {
      // Create user with auto-verified email (since they clicked the invitation link)
      await tx.insert(users).values({
        id: userId,
        email,
        name,
        password: hashedPassword,
        emailVerified: new Date(), // Auto-verify since they clicked invitation link
      });

      // Add user to organization
      await tx.insert(organizationMembers).values({
        userId,
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
      {
        message: "Account created and invitation accepted successfully",
        user: {
          id: userId,
          email,
          name,
        },
        organizationId: invitation.organizationId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Invitation registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 },
    );
  }
}
