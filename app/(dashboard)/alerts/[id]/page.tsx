"use client";

import { FileText, MessageSquare, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DocumentViewer } from "@/components/document-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { VersionComparisonViewer } from "@/components/version-comparison-viewer";
import type { AlertStatus } from "@/lib/db/schema/alerts";

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
    };
  }>;
}

export default function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [alertDetail, setAlertDetail] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<AlertStatus | "">("");
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setAlertId(p.id));
    const orgId = searchParams.get("organizationId");
    if (orgId) {
      setOrganizationId(orgId);
    } else {
      const stored = localStorage.getItem("currentOrganizationId");
      if (stored) {
        setOrganizationId(stored);
      }
    }
  }, [params, searchParams]);

  const fetchAlert = useCallback(async () => {
    if (!alertId || !organizationId) return;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [alertId, organizationId]);

  useEffect(() => {
    fetchAlert();
  }, [fetchAlert]);

  const handleStatusUpdate = async () => {
    if (
      !alertId ||
      !organizationId ||
      !newStatus ||
      newStatus === alertDetail?.alert.status
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading alert...</p>
      </div>
    );
  }

  if (!alertDetail) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-lg font-medium">Alert not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/alerts")}
        >
          Back to Alerts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/alerts")}
            className="mb-4"
          >
            ← Back to Alerts
          </Button>
          <h1 className="text-3xl font-bold">{alertDetail.target.label}</h1>
          <p className="mt-2 text-muted-foreground">
            Alert created{" "}
            {new Date(alertDetail.alert.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(alertDetail.alert.status)}
          {getSeverityBadge(alertDetail.alert.impactScore)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alert Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {alertDetail.alert.summary || "No summary available."}
              </p>
              {alertDetail.alert.impactScore !== null && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Impact Score</p>
                  <p className="text-2xl font-bold">
                    {(alertDetail.alert.impactScore * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Target Information */}
          <Card>
            <CardHeader>
              <CardTitle>Target Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">URL</p>
                <a
                  href={alertDetail.target.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {alertDetail.target.url}
                </a>
              </div>
              {alertDetail.target.jurisdiction && (
                <div>
                  <p className="text-sm font-medium">Jurisdiction</p>
                  <p className="text-sm text-muted-foreground">
                    {alertDetail.target.jurisdiction}
                  </p>
                </div>
              )}
              {alertDetail.target.category && (
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground">
                    {alertDetail.target.category}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Version Crawled</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(alertDetail.version.crawledAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Version Comparison */}
          {alertDetail.version.previousVersionId && (
            <VersionComparisonViewer
              currentVersionId={alertDetail.version.id}
              previousVersionId={alertDetail.version.previousVersionId}
              organizationId={organizationId || ""}
            />
          )}

          {/* Document Viewer */}
          {(() => {
            try {
              const metadata = alertDetail.version.metadata
                ? JSON.parse(alertDetail.version.metadata)
                : null;
              const hasAttachments =
                metadata?.attachments && metadata.attachments.length > 0;
              const isPDF = metadata?.contentType === "pdf";

              if (hasAttachments || isPDF) {
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Document Viewer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DocumentViewer
                        versionId={alertDetail.version.id}
                        organizationId={organizationId || ""}
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
            } catch {
              return null;
            }
          })()}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5" />
                Comments ({alertDetail.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment Form */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                  >
                    {submittingComment ? "Adding..." : "Add Comment"}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Comments List */}
              {alertDetail.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-4">
                  {alertDetail.comments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {comment.user.name || comment.user.email}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={newStatus}
                onValueChange={(value: string) =>
                  setNewStatus(value as AlertStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="triaged">Triaged</SelectItem>
                  <SelectItem value="actioned">Actioned</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              {newStatus !== alertDetail.alert.status && (
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  className="w-full"
                >
                  {updating ? "Updating..." : "Update Status"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-5" />
                Assigned To
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertDetail.assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No assignments yet
                </p>
              ) : (
                <div className="space-y-2">
                  {alertDetail.assignments.map((assignment) => (
                    <div
                      key={assignment.userId}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {assignment.user.name || assignment.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned{" "}
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Alert ID</p>
                <p className="text-muted-foreground font-mono text-xs">
                  {alertDetail.alert.id}
                </p>
              </div>
              <div>
                <p className="font-medium">Created</p>
                <p className="text-muted-foreground">
                  {new Date(alertDetail.alert.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-medium">Last Updated</p>
                <p className="text-muted-foreground">
                  {new Date(alertDetail.alert.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
