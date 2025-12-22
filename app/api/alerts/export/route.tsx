import {
  Document,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
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

// PDF styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  title: {
    fontSize: 18,
    marginBottom: 5,
    fontWeight: "bold",
  },
  meta: {
    fontSize: 8,
    marginBottom: 3,
    color: "#666",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#bfbfbf",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#bfbfbf",
    minHeight: 25,
  },
  tableHeader: {
    backgroundColor: "#f2f2f2",
    fontWeight: "bold",
    fontSize: 8,
  },
  tableCell: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#bfbfbf",
    fontSize: 7,
  },
  tableCellId: {
    width: "12%",
  },
  tableCellStatus: {
    width: "10%",
  },
  tableCellSummary: {
    width: "28%",
  },
  tableCellImpact: {
    width: "8%",
  },
  tableCellDate: {
    width: "12%",
  },
  tableCellTarget: {
    width: "15%",
  },
  tableCellJurisdiction: {
    width: "8%",
  },
  tableCellCategory: {
    width: "7%",
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
});

function generatePDFDocument(
  alertsData: Array<{
    alert: typeof alerts.$inferSelect;
    target: typeof targets.$inferSelect;
  }>,
) {
  const rowsPerPage = 30; // Approximate rows per page
  const totalPages = Math.ceil(alertsData.length / rowsPerPage);
  const generatedDate = new Date().toISOString();

  // Split alerts into pages
  const pages: Array<
    Array<{
      alert: typeof alerts.$inferSelect;
      target: typeof targets.$inferSelect;
    }>
  > = [];
  for (let i = 0; i < alertsData.length; i += rowsPerPage) {
    pages.push(alertsData.slice(i, i + rowsPerPage));
  }

  return (
    <Document>
      {pages.map((pageAlerts, pageIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Pages are static and won't be reordered
        <Page key={pageIndex} size="A4" style={pdfStyles.page}>
          {/* Header - only on first page */}
          {pageIndex === 0 && (
            <View style={pdfStyles.header}>
              <Text style={pdfStyles.title}>Regulatory Alerts Export</Text>
              <Text style={pdfStyles.meta}>Generated: {generatedDate}</Text>
              <Text style={pdfStyles.meta}>
                Total Alerts: {alertsData.length}
              </Text>
            </View>
          )}

          {/* Table Header */}
          <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellId]}>
              Alert ID
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellStatus]}>
              Status
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellSummary]}>
              Summary
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellImpact]}>
              Impact
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellDate]}>
              Created
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellTarget]}>
              Target
            </Text>
            <Text
              style={[pdfStyles.tableCell, pdfStyles.tableCellJurisdiction]}
            >
              Jurisdiction
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellCategory]}>
              Category
            </Text>
          </View>

          {/* Table Rows */}
          {pageAlerts.map(({ alert, target }) => (
            <View key={alert.id} style={pdfStyles.tableRow}>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellId]}>
                {alert.id}
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellStatus]}>
                {alert.status}
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellSummary]}>
                {(alert.summary || "").substring(0, 60)}
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellImpact]}>
                {alert.impactScore
                  ? `${(alert.impactScore * 100).toFixed(0)}%`
                  : "N/A"}
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellDate]}>
                {alert.createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellTarget]}>
                {target.label.substring(0, 20)}
              </Text>
              <Text
                style={[pdfStyles.tableCell, pdfStyles.tableCellJurisdiction]}
              >
                {target.jurisdiction || "N/A"}
              </Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.tableCellCategory]}>
                {target.category || "N/A"}
              </Text>
            </View>
          ))}

          {/* Page Number */}
          <Text style={pdfStyles.pageNumber} fixed>
            Page {pageIndex + 1} of {totalPages}
          </Text>
        </Page>
      ))}
    </Document>
  );
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
      // Generate actual PDF using @react-pdf/renderer
      const pdfDoc = generatePDFDocument(result.alerts);
      const pdfStream = await pdf(pdfDoc).toBlob();
      const arrayBuffer = await pdfStream.arrayBuffer();

      return new NextResponse(arrayBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="alerts-export-${new Date().toISOString()}.pdf"`,
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
