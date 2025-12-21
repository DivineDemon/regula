import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  invitations,
  organizationMembers,
  organizations,
  users,
} from "@/lib/db/schema";
import { email as emailService } from "@/lib/services/email";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, email, role } = body;

    if (!organizationId || !email || !role) {
      return NextResponse.json(
        { error: "Organization ID, email, and role are required" },
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
        { error: "You must be an administrator to invite members" },
        { status: 403 },
      );
    }

    // Check if user is already a member
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, existingUser.id),
            eq(organizationMembers.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 },
        );
      }
    }

    // Check if there's a pending invitation
    const [pendingInvite] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.email, email),
          isNull(invitations.acceptedAt),
        ),
      )
      .limit(1);

    if (pendingInvite) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 },
      );
    }

    // Get organization
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

    // Generate invitation token
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Create invitation
    const invitationId = nanoid();
    await db.insert(invitations).values({
      id: invitationId,
      organizationId,
      email,
      role: role as UserRole,
      token,
      invitedBy: session.user.id,
      expiresAt,
    });

    // Send invitation email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/accept-invitation?token=${token}&email=${encodeURIComponent(email)}`;

    // TODO: Create sendInvitationEmail function in email service
    await emailService.send({
      to: email,
      subject: `Invitation to join ${organization.name} on Regula`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Organization Invitation</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 16px 0; color: #374151;">You've been invited to join <strong>${organization.name}</strong> on Regula as a <strong>${role}</strong>.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept Invitation</a>
              </div>
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${acceptUrl}" style="color: #667eea; word-break: break-all;">${acceptUrl}</a>
              </p>
              <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
                This invitation will expire in 7 days.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `You've been invited to join ${organization.name} on Regula as a ${role}.\n\nAccept invitation: ${acceptUrl}\n\nThis invitation will expire in 7 days.`,
    });

    return NextResponse.json(
      { message: "Invitation sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Invitation error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation. Please try again." },
      { status: 500 },
    );
  }
}
