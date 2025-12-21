import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { email as emailService } from "@/lib/services/email";

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    // Get current user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if email is being changed
    const emailChanged = email !== user.email;

    // If email is being changed, check if it's already taken
    if (emailChanged) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 400 },
        );
      }
    }

    // Update user
    await db
      .update(users)
      .set({
        name,
        email: emailChanged ? email : user.email,
        emailVerified: emailChanged ? null : user.emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // If email changed, send verification email
    if (emailChanged) {
      // Generate verification token
      const verificationToken = nanoid(32);
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 24);

      // Delete any existing verification tokens for this email
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, email));

      // Create verification token
      await db.insert(verificationTokens).values({
        identifier: email,
        token: verificationToken,
        expires: tokenExpires,
      });

      // Send verification email
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

      await emailService.sendVerificationEmail({
        to: email,
        verificationUrl,
        token: verificationToken,
      });
    }

    return NextResponse.json(
      {
        message: "Profile updated successfully",
        emailChanged,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile. Please try again." },
      { status: 500 },
    );
  }
}
