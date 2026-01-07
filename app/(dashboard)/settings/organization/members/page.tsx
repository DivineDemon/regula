import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { InviteMemberForm } from "@/components/settings/invite-member-form";
import { MembersList } from "@/components/settings/members-list";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  invitations,
  organizationMembers,
  organizations,
  users,
} from "@/lib/db/schema";

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
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">
          You must be an administrator to manage organization members.
        </p>
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
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-start justify-start gap-2">
        <h1 className="w-full text-left text-3xl font-bold">
          Organization Members
        </h1>
        <p className="w-full text-left text-muted-foreground">
          Manage members and invitations for {userOrg.organization.name}
        </p>
      </div>
      <div className="w-full h-full grid grid-cols-3 gap-5 items-start justify-start">
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
