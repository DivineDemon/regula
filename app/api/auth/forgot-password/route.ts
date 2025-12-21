import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { email as emailService } from "@/lib/services/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json(
        {
          message:
            "If an account with that email exists, a password reset link has been sent.",
        },
        { status: 200 },
      );
    }

    // Generate password reset token
    const resetToken = nanoid(32);
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 1); // Token expires in 1 hour

    // Use a prefixed identifier to distinguish from email verification tokens
    const identifier = `password-reset:${email}`;

    // Delete any existing password reset tokens for this email
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, identifier));

    // Create new password reset token
    await db.insert(verificationTokens).values({
      identifier,
      token: resetToken,
      expires: tokenExpires,
    });

    // Send password reset email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await emailService.sendPasswordResetEmail({
      to: email,
      resetUrl,
      token: resetToken,
    });

    return NextResponse.json(
      {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request. Please try again." },
      { status: 500 },
    );
  }
}
