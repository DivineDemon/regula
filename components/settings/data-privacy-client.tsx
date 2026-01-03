"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DataPrivacyClient({
  organizationId,
}: {
  organizationId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<Record<string, unknown> | null>(
    null,
  );

  const handleDataExport = async () => {
    if (!organizationId) {
      toast.error("Please select an organization");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/gdpr/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export data");
      }

      const result = await response.json();
      setExportData(result.data);
      toast.success("Data export generated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export data",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDataDeletion = async () => {
    if (!organizationId) {
      toast.error("Please select an organization");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete all your data? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/gdpr/deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete data");
      }

      toast.success("Data deletion request processed successfully");

      // Redirect to home after deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete data",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadExport = () => {
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regula-data-export-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Under GDPR, you have the right to access, export, and delete your
          personal data. Use the options below to exercise these rights.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Your Data</CardTitle>
          <CardDescription>
            Request a copy of all your personal data stored by Regula
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDataExport}
            disabled={isExporting || !organizationId}
          >
            {isExporting ? "Exporting..." : "Export Data"}
          </Button>
          {exportData && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Export generated successfully. Click below to download.
              </p>
              <Button onClick={downloadExport} variant="outline">
                Download Export
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Your Data</CardTitle>
          <CardDescription>
            Permanently delete all your personal data from Regula. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive mb-2">
              Warning: Deleting your data will permanently remove:
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
              <li>Your account and profile information</li>
              <li>All monitored targets and versions</li>
              <li>All alerts and comments</li>
              <li>All organization memberships</li>
            </ul>
            <p className="text-sm font-medium text-destructive mt-2">
              This action cannot be undone.
            </p>
          </div>
          <Button
            onClick={handleDataDeletion}
            disabled={isDeleting || !organizationId}
            variant="destructive"
          >
            {isDeleting ? "Deleting..." : "Delete All Data"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
