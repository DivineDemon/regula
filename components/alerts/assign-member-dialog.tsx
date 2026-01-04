"use client";

import { Loader2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface AssignMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  alertId: string;
  currentAssignments: string[];
  onSuccess: () => void;
}

export function AssignMemberDialog({
  open,
  onOpenChange,
  organizationId,
  alertId,
  currentAssignments,
  onSuccess,
}: AssignMemberDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] =
    useState<string[]>(currentAssignments);

  useEffect(() => {
    setSelectedUserIds(currentAssignments);
  }, [currentAssignments]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/members?organizationId=${organizationId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (open && organizationId) {
      fetchMembers();
    }
  }, [open, organizationId, fetchMembers]);

  const toggleMember = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          assignTo: selectedUserIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update assignments");
      }

      toast.success("Assignments updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating assignments:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update assignments",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getUserInitials = (member: Member) => {
    if (member.name) {
      return member.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return member.email[0]?.toUpperCase() || "U";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Alert</DialogTitle>
          <DialogDescription>
            Select members to assign this alert to
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => {
                const key = `skeleton-${index}`;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-2 w-full border rounded-lg hover:bg-card transition-colors"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No members found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => {
                const isSelected = selectedUserIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className="w-full border flex items-center gap-3 p-3 rounded-lg hover:bg-card transition-colors text-left"
                  >
                    <Avatar>
                      <AvatarImage src={member.image || undefined} />
                      <AvatarFallback>{getUserInitials(member)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.name || member.email}
                      </p>
                      {member.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      )}
                    </div>
                    <div
                      className={`size-4 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-input"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="size-3 text-primary-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          role="img"
                          aria-label="Selected"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Assignments"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
