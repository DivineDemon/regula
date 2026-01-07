"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "@/lib/auth/roles";
import type { users } from "@/lib/db/schema";
import { WarningModal } from "../shared/warning-modal";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

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
  const [confirmingRemovalId, setConfirmingRemovalId] = useState<string | null>(
    null,
  );

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

  const handleRemoveMember = (userId: string) => {
    setConfirmingRemovalId(userId);
  };

  const confirmRemoveMember = async () => {
    if (!confirmingRemovalId) return;

    const userId = confirmingRemovalId;
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
        setConfirmingRemovalId(null);
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

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0]?.toUpperCase() || "U";
  };

  return (
    <div className="w-full max-h-full col-span-2 p-5 grid grid-cols-2 gap-5 items-start justify-start border rounded-3xl">
      <h2 className="col-span-2 w-full text-left text-lg font-bold">
        Members ({members.length})
      </h2>
      {members.map((member) => (
        <div
          key={member.user.id}
          className="w-full border rounded-3xl flex flex-col items-start justify-start"
        >
          <div className="w-full flex items-center justify-center gap-5 p-5 border-b">
            <div className="w-full flex items-center justify-center gap-3.5">
              <Avatar className="size-10">
                <AvatarImage src={member.user.image || undefined} />
                <AvatarFallback>
                  {getUserInitials(member.user.name, member.user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <span className="w-full text-left text-[16px] leading-[16px] font-semibold">
                  {member.user.name}
                </span>
                <span className="w-full text-left text-[14px] leading-[14px] text-muted-foreground">
                  {member.user.email}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              {member.user.id === currentUserId && (
                <span className="shrink-0 px-3 py-1.5 capitalize rounded-full bg-primary text-white text-[12px] leading-[12px] font-medium">
                  You
                </span>
              )}
              <span className="shrink-0 px-3 py-1.5 capitalize rounded-full bg-primary text-white text-[12px] leading-[12px] font-medium">
                {member.role}
              </span>
            </div>
          </div>
          <div className="w-full flex items-center p-5 justify-end gap-2.5">
            <p className="w-full text-left text-[14px] leading-[14px] text-muted-foreground">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </p>
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
                <SelectValue placeholder="Select Role" />
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
                onClick={() => handleRemoveMember(member.user.id)}
                disabled={removingMember === member.user.id}
              >
                {removingMember === member.user.id ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
        </div>
      ))}
      {pendingInvitations.map((invitation) => (
        <div
          key={invitation.id}
          className="w-full border rounded-3xl flex flex-col items-start justify-start"
        >
          <div className="w-full flex items-center justify-center gap-5 p-5 border-b">
            <div className="w-full flex flex-col items-center justify-center gap-2">
              <span className="w-full text-left text-[16px] font-medium leading-[16px]">
                {invitation.email}
              </span>
              <span className="w-full text-left text-[14px] font-medium leading-[14px] text-muted-foreground">
                Invited {new Date(invitation.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <span className="shrink-0 px-3 py-1.5 capitalize rounded-full bg-primary text-white text-[12px] leading-[12px] font-medium">
                {invitation.role}
              </span>
              {new Date(invitation.createdAt) < new Date() ? (
                <span className="shrink-0 px-3 py-1.5 capitalize rounded-full bg-orange-500 text-black text-[12px] leading-[12px] font-medium">
                  Pending
                </span>
              ) : (
                <span className="shrink-0 px-3 py-1.5 capitalize rounded-full bg-destructive text-black text-[12px] leading-[12px] font-medium">
                  Expired
                </span>
              )}
            </div>
          </div>
          <div className="w-full p-5 flex items-center justify-center gap-5">
            <span className="flex-1 text-left text-muted-foreground text-sm">
              Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
            </span>
            <Button
              variant="destructive"
              onClick={() => handleCancelInvite(invitation.id)}
              disabled={cancelingInvite === invitation.id}
            >
              {cancelingInvite === invitation.id ? "Canceling..." : "Cancel"}
            </Button>
          </div>
        </div>
      ))}
      <WarningModal
        open={!!confirmingRemovalId}
        onOpenChange={(open) => !open && setConfirmingRemovalId(null)}
        title="Remove Member"
        subtitle="Are you sure you want to remove this member from the organization?"
        loading={!!removingMember}
        onConfirm={confirmRemoveMember}
        confirmText="Remove"
      />
    </div>
  );
}
