"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WarningModal } from "../shared/warning-modal";

export function DataPrivacyClient({
  organizationId,
}: {
  organizationId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  const handleDataDeletionClick = () => {
    if (!organizationId) {
      toast.error("Please select an organization");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDataDeletion = async () => {
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
      setShowDeleteConfirm(false);
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
      <WarningModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete All Data"
        subtitle="Are you sure you want to delete all your data? This action cannot be undone."
        loading={isDeleting}
        onConfirm={confirmDataDeletion}
        confirmText="Delete Everything"
      />
      <div className="w-full flex flex-col items-start justify-start gap-5">
        <div className="w-full flex items-center justify-center p-2.5 rounded-lg border">
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="w-full text-left font-medium">
              Export Your Data
            </span>
            <p className="w-full text-left text-sm text-muted-foreground">
              Request a copy of all your personal data stored by Regula
            </p>
          </div>
          <Button
            onClick={handleDataExport}
            disabled={isExporting || !organizationId}
          >
            {isExporting ? "Exporting..." : "Export Data"}
          </Button>
          {exportData && (
            <Button onClick={downloadExport} variant="outline" className="ml-2">
              Download Export
            </Button>
          )}
        </div>
        <div className="w-full p-2.5 rounded-lg border border-destructive bg-destructive/10 text-destructive flex flex-col items-center justify-center gap-2.5">
          <div className="w-full flex flex-col items-center justify-center">
            <span className="w-full text-left font-medium">
              Delete Your Data
            </span>
            <p className="w-full text-left text-sm text-muted-foreground">
              Permanently delete all your personal data from Regula. This action
              cannot be undone. Deleting your data will permanently remove:
            </p>
          </div>
          <ul className="text-sm text-muted-foreground list-disc pl-5 w-full flex flex-col items-start justify-start gap-1">
            <li>Your account and profile information</li>
            <li>All monitored targets and versions</li>
            <li>All alerts and comments</li>
            <li>All organization memberships</li>
          </ul>
          <Button
            onClick={handleDataDeletionClick}
            disabled={isDeleting || !organizationId}
            variant="destructive"
            className="ml-auto"
          >
            {isDeleting ? "Deleting..." : "Delete All Data"}
          </Button>
        </div>
      </div>
    </>
  );
}
