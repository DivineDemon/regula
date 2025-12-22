import { type NextRequest, NextResponse } from "next/server";
import type { alerts, TargetCategory, targets } from "@/lib/db/schema";
import type { AlertStatus } from "@/lib/db/schema/alerts";
import { getAlertsWithFilters } from "@/lib/services/alerts";
import { createAuditLog } from "@/lib/services/audit";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
} from "@/lib/utils/api-helpers";

function generateCSV(
  alertsData: Array<{
    alert: typeof alerts.$inferSelect;
    target: typeof targets.$inferSelect;
  }>,
): string {
  const headers = [
    "Alert ID",
    "Status",
    "Summary",
    "Impact Score",
    "Created At",
    "Updated At",
    "Target Label",
    "Target URL",
    "Jurisdiction",
    "Category",
  ];

  const rows = alertsData.map(({ alert, target }) => [
    alert.id,
    alert.status,
    alert.summary?.replace(/"/g, '""') || "",
    alert.impactScore?.toString() || "",
    alert.createdAt.toISOString(),
    alert.updatedAt.toISOString(),
    target.label,
    target.url,
    target.jurisdiction || "",
    target.category || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

function generatePDFContent(
  alertsData: Array<{
    alert: typeof alerts.$inferSelect;
    target: typeof targets.$inferSelect;
  }>,
): string {
  // Simple HTML-based PDF content (in production, use a proper PDF library like pdfkit or puppeteer)
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Alerts Export - ${new Date().toISOString()}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>Regulatory Alerts Export</h1>
      <p>Generated: ${new Date().toISOString()}</p>
      <p>Total Alerts: ${alertsData.length}</p>
      <table>
        <thead>
          <tr>
            <th>Alert ID</th>
            <th>Status</th>
            <th>Summary</th>
            <th>Impact Score</th>
            <th>Created At</th>
            <th>Target Label</th>
            <th>Jurisdiction</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          ${alertsData
            .map(
              ({ alert, target }) => `
            <tr>
              <td>${alert.id}</td>
              <td>${alert.status}</td>
              <td>${(alert.summary || "").substring(0, 100)}</td>
              <td>${alert.impactScore ? `${(alert.impactScore * 100).toFixed(0)}%` : "N/A"}</td>
              <td>${alert.createdAt.toISOString()}</td>
              <td>${target.label}</td>
              <td>${target.jurisdiction || "N/A"}</td>
              <td>${target.category || "N/A"}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;
  return html;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const jurisdiction = searchParams.get("jurisdiction");
    const category = searchParams.get("category");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    if (!organizationId) {
      return errorResponse("organizationId is required", 400);
    }

    if (format !== "csv" && format !== "pdf") {
      return errorResponse("format must be 'csv' or 'pdf'", 400);
    }

    const user = await requireOrgAccess(organizationId);

    // Get all alerts matching filters (no limit for exports)
    const result = await getAlertsWithFilters({
      organizationId,
      status: status ? (status as AlertStatus) : undefined,
      severity: severity ? (severity as "low" | "medium" | "high") : undefined,
      jurisdiction: jurisdiction || undefined,
      category: category ? (category as TargetCategory) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search: search || undefined,
      limit: 10000, // Large limit for exports
      offset: 0,
    });

    // Audit log for export
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "export.alerts",
      metadata: {
        format,
        alertCount: result.alerts.length,
        filters: {
          status,
          severity,
          jurisdiction,
          category,
          dateFrom,
          dateTo,
          search,
        },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    if (format === "csv") {
      const csvContent = generateCSV(result.alerts);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="alerts-export-${new Date().toISOString()}.csv"`,
        },
      });
    } else {
      // For PDF, return HTML that can be converted to PDF client-side or server-side
      // In production, use a proper PDF library
      const htmlContent = generatePDFContent(result.alerts);
      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="alerts-export-${new Date().toISOString()}.html"`,
        },
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Error exporting alerts:", error);
    return errorResponse("Internal server error", 500);
  }
}
