"use client";

import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AssignMemberDialog } from "@/components/alerts/assign-member-dialog";
import { DocumentViewer } from "@/components/alerts/document-viewer";
import { VersionComparisonViewer } from "@/components/alerts/version-comparison-viewer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AlertStatus } from "@/lib/db/schema/alerts";
import { cn } from "@/lib/utils";

interface AlertDetail {
  alert: {
    id: string;
    status: AlertStatus;
    summary: string | null;
    impactScore: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  target: {
    id: string;
    label: string;
    url: string;
    jurisdiction: string | null;
    category: string | null;
  };
  version: {
    id: string;
    crawledAt: Date;
    hasChanges: boolean | null;
    previousVersionId: string | null;
    metadata: string | null;
  };
  assignments: Array<{
    userId: string;
    assignedAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
}

export function AlertDetailClient({
  alertDetail: initialAlertDetail,
  organizationId,
  alertId,
}: {
  alertDetail: AlertDetail;
  organizationId: string;
  alertId: string;
}) {
  const _router = useRouter();
  const [alertDetail, setAlertDetail] =
    useState<AlertDetail>(initialAlertDetail);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<AlertStatus | "">(
    initialAlertDetail.alert.status,
  );
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const fetchAlert = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/alerts/${alertId}?organizationId=${organizationId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch alert");
      }
      const data: AlertDetail = await response.json();
      setAlertDetail(data);
      setNewStatus(data.alert.status);
    } catch (error) {
      console.error("Error fetching alert:", error);
    }
  }, [alertId, organizationId]);

  const handleStatusUpdate = async () => {
    if (
      !alertId ||
      !organizationId ||
      !newStatus ||
      newStatus === alertDetail.alert.status
    ) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      await fetchAlert();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!alertId || !organizationId || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/alerts/${alertId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          content: newComment,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      setNewComment("");
      await fetchAlert();
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const getSeverityBadge = (score: number | null) => {
    if (score === null) return null;
    if (score >= 0.7) {
      return (
        <Badge
          variant="destructive"
          className="bg-red-500/10 text-red-700 dark:text-red-400"
        >
          High Impact
        </Badge>
      );
    }
    if (score >= 0.4) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
          Medium Impact
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
        Low Impact
      </Badge>
    );
  };

  const getStatusBadge = (status: AlertStatus) => {
    const variants = {
      new: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      triaged: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      actioned: "bg-green-500/10 text-green-700 dark:text-green-400",
      closed: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    };
    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-start justify-start gap-2">
        <div className="w-full flex items-center justify-center gap-5">
          <Link
            href="/alerts"
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "icon",
              }),
            )}
          >
            <ArrowLeft />
          </Link>
          <h1 className="w-full text-left text-3xl font-bold">
            {alertDetail.target.label}
          </h1>
        </div>
        <div className="w-full flex items-center justify-center gap-2.5">
          <p className="flex-1 text-left text-muted-foreground">
            Alert created&nbsp;
            {new Date(alertDetail.alert.createdAt).toLocaleString()}
          </p>
          {getStatusBadge(alertDetail.alert.status)}
          {getSeverityBadge(alertDetail.alert.impactScore)}
        </div>
      </div>
      <div className="w-full grid grid-cols-3 items-start justify-start gap-5">
        <div className="w-full col-span-2 flex flex-col items-start justify-start gap-5">
          {alertDetail.version.previousVersionId && (
            <VersionComparisonViewer
              currentVersionId={alertDetail.version.id}
              previousVersionId={alertDetail.version.previousVersionId}
              organizationId={organizationId}
            />
          )}
          {(() => {
            const metadata = alertDetail.version.metadata
              ? JSON.parse(alertDetail.version.metadata)
              : null;
            const hasAttachments =
              metadata?.attachments && metadata.attachments.length > 0;
            const isPDF = metadata?.contentType === "pdf";

            if (hasAttachments || isPDF) {
              return (
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Document Viewer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentViewer
                      versionId={alertDetail.version.id}
                      organizationId={organizationId}
                      filename={
                        metadata?.attachments?.[0]?.filename ||
                        `document-${alertDetail.version.id}.pdf`
                      }
                    />
                  </CardContent>
                </Card>
              );
            }

            return null;
          })()}
          <div className="w-full rounded-3xl bg-card flex flex-col items-center justify-center border">
            <div className="w-full flex items-center justify-center gap-2.5 p-5 border-b">
              <MessageSquare className="size-4" />
              <span className="flex-1 text-left text-lg font-bold">
                Comments ({alertDetail.comments.length})
              </span>
            </div>
            <div className="w-full flex items-start justify-start gap-2.5 p-5 border-b">
              <Textarea
                className="flex-1"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                size="icon"
                variant="default"
                onClick={handleAddComment}
                disabled={!newComment.trim() || submittingComment}
              >
                {submittingComment ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send />
                )}
              </Button>
            </div>
            <div className="w-full flex flex-col items-start justify-start gap-2.5 p-5">
              {alertDetail.comments.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <AlertCircle className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No comments found</EmptyTitle>
                    <EmptyDescription>
                      Comments will appear here when you add a comment to the
                      alert.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                alertDetail.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="w-full flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-full flex items-center justify-start gap-3.5">
                      <Avatar>
                        <AvatarImage src={comment.user.image || undefined} />
                        <AvatarFallback>
                          {getUserInitials(
                            comment.user.name,
                            comment.user.email,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-center justify-center">
                        <span className="w-full text-left text-sm font-medium">
                          {comment.user.name || comment.user.email}
                        </span>
                        <span className="w-full text-left text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="w-full text-left text-sm text-muted-foreground whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="w-full h-full col-span-1 flex flex-col items-start justify-start border rounded-3xl">
          <div className="w-full flex items-center justify-center p-5 border-b">
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="w-full text-left text-lg font-bold">
                Alert Details
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                {alertDetail.alert.id}
              </span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {alertDetail.alert.impactScore
                ? (alertDetail.alert.impactScore * 100).toFixed(0)
                : "N/A"}
              %
            </p>
          </div>
          <span className="w-full text-left text-muted-foreground p-5 border-b">
            {alertDetail.alert.summary || "No summary available."}
          </span>
          <div className="w-full flex items-center justify-center p-5 border-b">
            <span className="flex-1 text-left font-bold">Status</span>
            <div className="flex items-center justify-center gap-2.5">
              <Select
                value={newStatus}
                onValueChange={(value: string) =>
                  setNewStatus(value as AlertStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="triaged">Triaged</SelectItem>
                  <SelectItem value="actioned">Actioned</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              {newStatus !== alertDetail.alert.status && (
                <Button onClick={handleStatusUpdate} disabled={updating}>
                  {updating ? "Updating..." : "Update"}
                </Button>
              )}
            </div>
          </div>
          <div className="w-full flex flex-col items-center justify-center gap-2.5 p-5 border-b">
            <div className="w-full flex items-center justify-center gap-5">
              <span className="flex-1 text-left font-bold">URL</span>
              <Link
                href={alertDetail.target.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {alertDetail.target.url.slice(0, 25)}...
              </Link>
            </div>
            <div className="w-full flex items-center justify-center gap-5">
              <span className="flex-1 text-left font-bold">Jurisdiction</span>
              <span className="uppercase">
                {alertDetail.target.jurisdiction || "N/A"}
              </span>
            </div>
            <div className="w-full flex items-center justify-center gap-5">
              <span className="flex-1 text-left font-bold">Category</span>
              <span className="uppercase">
                {alertDetail.target.category || "N/A"}
              </span>
            </div>
            <div className="w-full flex items-center justify-center gap-5">
              <span className="flex-1 text-left font-bold">Last Updated</span>
              <span>
                {new Date(alertDetail.alert.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="w-full h-full flex flex-col items-start justify-start">
            <div className="w-full flex items-center justify-center p-5 border-b">
              <span className="flex-1 text-left text-lg font-bold">
                Assigned To
              </span>
              <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
                Add Assignment
              </Button>
            </div>
            {alertDetail.assignments.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AlertCircle className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No assignments found</EmptyTitle>
                  <EmptyDescription>
                    Assignments will appear here when you assign an alert to a
                    user.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="w-full flex flex-col items-start justify-start gap-2 p-5">
                {alertDetail.assignments.map((assignment) => (
                  <div
                    key={assignment.userId}
                    className="flex items-center justify-between w-full p-2.5 border rounded-lg hover:bg-card transition-colors"
                  >
                    <div className="w-full flex items-center justify-center gap-3.5">
                      <Avatar>
                        <AvatarImage src={assignment.user.image || undefined} />
                        <AvatarFallback>
                          {getUserInitials(
                            assignment.user.name,
                            assignment.user.email,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start justify-start w-full">
                        <p className="text-sm font-medium">
                          {assignment.user.name || assignment.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned&nbsp;
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <AssignMemberDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        organizationId={organizationId}
        alertId={alertId}
        currentAssignments={alertDetail.assignments.map((a) => a.userId)}
        onSuccess={fetchAlert}
      />
    </div>
  );
}
