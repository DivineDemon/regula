import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  subscriptions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { email as emailService } from "@/lib/services/email";
import { stripeService } from "@/lib/services/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, organizationName } = body;

    // Validation
    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "All fields are required" },
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
        { error: "Email already registered" },
        { status: 400 },
      );
    }

    // Check if organization name is already taken
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(
        eq(
          organizations.slug,
          organizationName.toLowerCase().replace(/\s+/g, "-"),
        ),
      )
      .limit(1);

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization name is already taken" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate IDs
    const userId = nanoid();
    const organizationId = nanoid();
    const orgSlug = organizationName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Generate verification token
    const verificationToken = nanoid(32);
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // Token expires in 24 hours

    // Create user, organization, and subscription in a transaction
    await db.transaction(async (tx) => {
      // Create user
      await tx.insert(users).values({
        id: userId,
        email,
        name,
        password: hashedPassword,
        emailVerified: null, // Will be set when email is verified
      });

      // Create organization
      await tx.insert(organizations).values({
        id: organizationId,
        name: organizationName,
        slug: orgSlug,
        plan: "free",
      });

      // Add user as admin to organization
      await tx.insert(organizationMembers).values({
        userId,
        organizationId,
        role: UserRole.ADMIN,
      });

      // Create default subscription (free plan)
      const subscriptionId = nanoid();
      await tx.insert(subscriptions).values({
        id: subscriptionId,
        organizationId,
        plan: "free",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now for free plan
      });

      // Create verification token
      await tx.insert(verificationTokens).values({
        identifier: email,
        token: verificationToken,
        expires: tokenExpires,
      });
    });

    // Create Stripe customer for the organization (for future paid subscriptions)
    // Do this outside the transaction since it's an external API call
    // If it fails, we still have a working account with a free subscription
    try {
      const customer = await stripeService.createCustomer({
        email,
        name: organizationName,
        metadata: {
          organizationId,
          userId,
        },
      });

      // Update subscription with Stripe customer ID
      await db
        .update(subscriptions)
        .set({ stripeCustomerId: customer.id })
        .where(eq(subscriptions.organizationId, organizationId));
    } catch (error) {
      console.error("Failed to create Stripe customer:", error);
      // Continue with registration even if Stripe customer creation fails
      // The subscription will work fine without it for free plans
    }

    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    await emailService.sendVerificationEmail({
      to: email,
      verificationUrl,
      token: verificationToken,
    });

    return NextResponse.json(
      {
        message:
          "Account created successfully. Please check your email to verify your account.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 },
    );
  }
}
