"use client";

import { Loader2, TrashIcon } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shared/alert-dialog";
import type { targets } from "@/lib/db/schema";

type Target = typeof targets.$inferSelect;

interface DeleteTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  organizationId: string;
  onSuccess: () => void;
}

export function DeleteTargetDialog({
  open,
  onOpenChange,
  target,
  organizationId,
  onSuccess,
}: DeleteTargetDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/targets/${target.id}?organizationId=${organizationId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(
          errorData.error || "Failed to delete target. Please try again.",
        );
        return;
      }

      onSuccess();
    } catch (_err) {
      setError("Failed to delete target. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Target</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the target &quot;{target.label}
            &quot;? This action cannot be undone and will stop monitoring this
            target.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <TrashIcon className="mr-2 size-4" />
                Delete Target
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
