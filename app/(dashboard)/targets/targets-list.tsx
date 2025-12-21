"use client";

import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { targets } from "@/lib/db/schema";
import { AddTargetDialog } from "./add-target-dialog";
import { DeleteTargetDialog } from "./delete-target-dialog";
import { EditTargetDialog } from "./edit-target-dialog";

type Target = typeof targets.$inferSelect;

interface TargetsListProps {
  targets: Target[];
  organizationId: string;
  userOrgs: Array<{
    organization: { id: string; name: string };
    role: string;
  }>;
}

export function TargetsList({
  targets,
  organizationId,
  userOrgs: _userOrgs,
}: TargetsListProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<Target | null>(null);

  const getStatusBadgeVariant = (status: Target["status"]) => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "error":
        return "destructive";
      case "paused":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: Target["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "pending":
        return "Pending";
      case "error":
        return "Error";
      case "paused":
        return "Paused";
      default:
        return status;
    }
  };

  const handleTargetAdded = () => {
    setIsAddDialogOpen(false);
    router.refresh();
  };

  const handleTargetUpdated = () => {
    setEditingTarget(null);
    router.refresh();
  };

  const handleTargetDeleted = () => {
    setDeletingTarget(null);
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monitoring Targets</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusIcon className="size-4" />
              Add Target
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No targets configured yet
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusIcon className="size-4" />
                Add Your First Target
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Label</th>
                    <th className="text-left p-3 font-medium">URL</th>
                    <th className="text-left p-3 font-medium">Jurisdiction</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Frequency</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target) => (
                    <tr key={target.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{target.label}</td>
                      <td className="p-3">
                        <a
                          href={target.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate max-w-xs block"
                        >
                          {target.url}
                        </a>
                      </td>
                      <td className="p-3">
                        {target.jurisdiction || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {target.category ? (
                          <Badge variant="outline">
                            {target.category.charAt(0).toUpperCase() +
                              target.category.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {target.crawlFrequency.charAt(0).toUpperCase() +
                            target.crawlFrequency.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={getStatusBadgeVariant(target.status)}>
                          {getStatusLabel(target.status)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTarget(target)}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingTarget(target)}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddTargetDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        organizationId={organizationId}
        onSuccess={handleTargetAdded}
      />

      {editingTarget && (
        <EditTargetDialog
          open={!!editingTarget}
          onOpenChange={(open) => !open && setEditingTarget(null)}
          target={editingTarget}
          organizationId={organizationId}
          onSuccess={handleTargetUpdated}
        />
      )}

      {deletingTarget && (
        <DeleteTargetDialog
          open={!!deletingTarget}
          onOpenChange={(open) => !open && setDeletingTarget(null)}
          target={deletingTarget}
          organizationId={organizationId}
          onSuccess={handleTargetDeleted}
        />
      )}
    </>
  );
}
