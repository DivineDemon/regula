"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/lib/auth/roles";
import type { users } from "@/lib/db/schema";

interface Member {
  user: typeof users.$inferSelect;
  role: UserRole;
  joinedAt: Date;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  expiresAt: Date;
}

interface MembersListProps {
  organizationId: string;
  members: Member[];
  pendingInvitations: PendingInvitation[];
  currentUserId: string;
}

export function MembersList({
  organizationId,
  members,
  pendingInvitations,
  currentUserId,
}: MembersListProps) {
  const router = useRouter();
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingRole(userId);

    try {
      const response = await fetch("/api/organizations/members/role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          userId,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to update role");
      } else {
        toast.success("Role updated successfully");
        router.refresh();
      }
    } catch (_err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this member from the organization?",
      )
    ) {
      return;
    }

    setRemovingMember(userId);

    try {
      const response = await fetch("/api/organizations/members/remove", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to remove member");
      } else {
        toast.success("Member removed successfully");
        router.refresh();
      }
    } catch (_err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setRemovingMember(null);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    setCancelingInvite(invitationId);

    try {
      const response = await fetch("/api/organizations/invitations/cancel", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to cancel invitation");
      } else {
        toast.success("Invitation cancelled successfully");
        router.refresh();
      }
    } catch (_err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setCancelingInvite(null);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "default";
      case UserRole.ANALYST:
        return "secondary";
      case UserRole.VIEWER:
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>
            Manage organization members and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.user.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {member.user.name || member.user.email}
                    </p>
                    {member.user.id === currentUserId && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      handleRoleChange(member.user.id, value as UserRole)
                    }
                    disabled={
                      updatingRole === member.user.id ||
                      member.user.id === currentUserId
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
                      <SelectItem value={UserRole.ANALYST}>Analyst</SelectItem>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {member.user.id !== currentUserId && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveMember(member.user.id)}
                      disabled={removingMember === member.user.id}
                    >
                      {removingMember === member.user.id
                        ? "Removing..."
                        : "Remove"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{invitation.email}</p>
                      <Badge variant={getRoleBadgeVariant(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Invited{" "}
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </p>
                    {new Date(invitation.expiresAt) < new Date() && (
                      <p className="text-xs text-destructive">Expired</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelInvite(invitation.id)}
                    disabled={cancelingInvite === invitation.id}
                  >
                    {cancelingInvite === invitation.id
                      ? "Canceling..."
                      : "Cancel"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
