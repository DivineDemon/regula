import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  invitations,
  organizationMembers,
  organizations,
  users,
} from "@/lib/db/schema";
import { InviteMemberForm } from "./invite-member-form";
import { MembersList } from "./members-list";

export default async function OrganizationMembersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user's first organization
  const [userOrg] = await db
    .select({
      organization: organizations,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, session.user.id))
    .limit(1);

  if (!userOrg) {
    redirect("/dashboard");
  }

  // Check if user is admin
  if (userOrg.role !== UserRole.ADMIN) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">
            You must be an administrator to manage organization members.
          </p>
        </div>
      </div>
    );
  }

  // Get all members
  const members = await db
    .select({
      user: users,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, userOrg.organization.id))
    .orderBy(desc(organizationMembers.joinedAt));

  // Get pending invitations
  const pendingInvitations = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, userOrg.organization.id),
        isNull(invitations.acceptedAt),
      ),
    )
    .orderBy(desc(invitations.createdAt));

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Organization Members</h1>
          <p className="mt-2 text-muted-foreground">
            Manage members and invitations for {userOrg.organization.name}
          </p>
        </div>

        <InviteMemberForm organizationId={userOrg.organization.id} />

        <MembersList
          organizationId={userOrg.organization.id}
          members={members}
          pendingInvitations={pendingInvitations}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
