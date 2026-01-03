"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const columns: ColumnDef<Target>[] = [
    {
      accessorKey: "label",
      header: "Label",
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => {
        const url = row.getValue("url") as string;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate max-w-xs block"
          >
            {url}
          </a>
        );
      },
    },
    {
      accessorKey: "jurisdiction",
      header: "Jurisdiction",
      cell: ({ row }) => {
        const jurisdiction = row.getValue("jurisdiction") as string | null;
        return jurisdiction ? (
          jurisdiction
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string | null;
        return category ? (
          <Badge variant="outline">
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "crawlFrequency",
      header: "Frequency",
      cell: ({ row }) => {
        const frequency = row.getValue("crawlFrequency") as string;
        return (
          <Badge variant="outline">
            {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as Target["status"];
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {getStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const target = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingTarget(target)}
              aria-label={`Edit target ${target.label}`}
            >
              <PencilIcon className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeletingTarget(target)}
              aria-label={`Delete target ${target.label}`}
            >
              <TrashIcon className="size-4" aria-hidden="true" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: targets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <>
      <div className="w-full flex flex-col items-start justify-start border rounded-3xl overflow-hidden">
        <div className="w-full flex items-center justify-center p-5 border-b">
          <span className="flex-1 text-left">Monitoring Targets</span>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            aria-label="Add new target"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            Add Target
          </Button>
        </div>
        {targets.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PlusIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No targets configured yet</EmptyTitle>
              <EmptyDescription>
                Get started by adding your first monitoring target
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusIcon className="size-4" />
                Add Your First Target
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="w-full h-[calc(100vh-279px)] flex flex-col items-start justify-start overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.id === "actions"
                            ? "text-right bg-card"
                            : "bg-card"
                        }
                        scope="col"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.id === "actions"
                              ? "text-right"
                              : undefined
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between flex-wrap gap-5 p-5 border-t mt-auto w-full">
              <div className="text-sm text-muted-foreground">
                Showing&nbsp;
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
                &nbsp; to&nbsp;
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  targets.length,
                )}
                &nbsp; of {targets.length} targets
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="size-4" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <span className="sr-only sm:not-sr-only">Next</span>
                  <ChevronRightIcon className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
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
