"use client";

import { ExternalLink, FileText } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cleanDocumentUrl } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker for Next.js (client-side)
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

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
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>("application/pdf");

  // Fetch document metadata and URL from our API
  useEffect(() => {
    const fetchDocumentMeta = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/versions/${versionId}/document?organizationId=${organizationId}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch document");
        }

        const data = await response.json();
        const url = cleanDocumentUrl(data.url) || null;
        setDocumentUrl(url);
        setContentType(data.contentType || "application/pdf");
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentMeta();
  }, [versionId, organizationId]);

  // For PDFs: proxy the document through our API so we get a blob (avoids CORS / X-Frame-Options)
  useEffect(() => {
    if (contentType !== "application/pdf" || !documentUrl) {
      setPdfBlob(null);
      return;
    }

    let cancelled = false;

    const fetchPdfBlob = async () => {
      try {
        const res = await fetch("/api/proxy-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: documentUrl }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { error?: string })?.error ||
              `Proxy returned ${res.status}`,
          );
        }

        const blob = await res.blob();
        if (cancelled) return;
        setPdfBlob(blob);
      } catch (err) {
        if (!cancelled) {
          console.error("Error proxying document:", err);
          setError(err instanceof Error ? err.message : "Failed to load PDF");
          setPdfBlob(null);
        }
      }
    };

    fetchPdfBlob();
    return () => {
      cancelled = true;
    };
  }, [contentType, documentUrl]);

  const openInNewTab = useCallback(() => {
    if (documentUrl) {
      window.open(documentUrl, "_blank", "noopener,noreferrer");
    }
  }, [documentUrl]);

  // Waiting for proxied PDF blob (do not key off `pdfBlob` here — when it arrives we must render the viewer)
  const pdfBlobLoading =
    contentType === "application/pdf" &&
    Boolean(documentUrl) &&
    !pdfBlob &&
    !error;

  if (loading || pdfBlobLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[400px] rounded-lg" />
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Viewer
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={filename || "document.pdf"}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new tab
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {contentType === "application/pdf" ? (
            <div className="w-full flex flex-col items-center justify-center">
              {pdfBlob && (
                <div className="bg-muted/30 w-full h-[600px] overflow-y-auto overflow-x-hidden">
                  <Document
                    file={pdfBlob}
                    onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                    onLoadError={(e) => {
                      console.error("PDF load error:", e);
                      setError("Failed to render PDF");
                    }}
                    loading={
                      <div className="w-full h-[600px] flex items-center justify-center p-12">
                        <Skeleton className="w-full h-full rounded-lg" />
                      </div>
                    }
                    error={
                      <div className="p-8 text-center text-muted-foreground">
                        Failed to load PDF.&nbsp;
                        <button
                          type="button"
                          onClick={openInNewTab}
                          className="underline font-medium hover:no-underline text-foreground"
                        >
                          Open in new tab
                        </button>
                      </div>
                    }
                  >
                    {numPages !== null &&
                      Array.from({ length: numPages }, (_, i) => {
                        const pageNumber = i + 1;
                        return (
                          <Page
                            key={`page-${pageNumber}`}
                            pageNumber={pageNumber}
                            width={800}
                            renderTextLayer
                            renderAnnotationLayer
                            className="mb-4!"
                          />
                        );
                      })}
                  </Document>
                </div>
              )}
            </div>
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
              <Button variant="outline" onClick={openInNewTab}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in new tab
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
