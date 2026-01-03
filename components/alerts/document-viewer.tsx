"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentViewerProps {
  versionId: string;
  organizationId: string;
  filename?: string;
}

export function DocumentViewer({
  versionId,
  organizationId,
  filename,
}: DocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>("application/pdf");

  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch document URL from API
        const response = await fetch(
          `/api/versions/${versionId}/document?organizationId=${organizationId}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch document");
        }

        const data = await response.json();
        setDocumentUrl(data.url);
        setContentType(data.contentType || "application/pdf");
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [versionId, organizationId]);

  const handleDownload = () => {
    if (documentUrl) {
      const link = document.createElement("a");
      link.href = documentUrl;
      link.download = filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !documentUrl) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {error || "Document not available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Viewer
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {contentType === "application/pdf" ? (
            <iframe
              src={documentUrl}
              className="w-full h-[600px]"
              title="PDF Document"
            />
          ) : contentType.startsWith("image/") ? (
            <Image
              src={documentUrl}
              alt="Document"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          ) : (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
