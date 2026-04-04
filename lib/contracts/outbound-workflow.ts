import { z } from "zod";
import type { EvidencePacketV1 } from "@/lib/services/evidence-packet";

/**
 * Versioned outbound contracts for ticketing / GRC integrations.
 * These are portable shapes: map them to vendor APIs (Jira REST, ServiceNow Table API, etc.).
 */

export const jiraIssueCreateContractSchema = z.object({
  contract: z.literal("regula.workflow.jira.issue_create"),
  version: z.literal("1.0.0"),
  integrationNotes: z.string(),
  fields: z.object({
    summary: z.string(),
    descriptionPlainText: z.string(),
    labels: z.array(z.string()).optional(),
  }),
  regula: z.object({
    organizationId: z.string(),
    alertId: z.string(),
    targetUrl: z.string(),
    regulaDeepLink: z.string(),
    evidenceIntegritySha256: z.string(),
  }),
});

export type JiraIssueCreateContractV1 = z.infer<
  typeof jiraIssueCreateContractSchema
>;

export const serviceNowIncidentContractSchema = z.object({
  contract: z.literal("regula.workflow.servicenow.incident"),
  version: z.literal("1.0.0"),
  integrationNotes: z.string(),
  payload: z.object({
    short_description: z.string(),
    description: z.string(),
    correlation_id: z.string(),
    category: z.string().optional(),
  }),
  regula: z.object({
    organizationId: z.string(),
    alertId: z.string(),
    targetUrl: z.string(),
    regulaDeepLink: z.string(),
    evidenceIntegritySha256: z.string(),
  }),
});

export type ServiceNowIncidentContractV1 = z.infer<
  typeof serviceNowIncidentContractSchema
>;

export const genericGrcTicketContractSchema = z.object({
  contract: z.literal("regula.workflow.grc.generic_ticket"),
  version: z.literal("1.0.0"),
  integrationNotes: z.string(),
  ticket: z.object({
    title: z.string(),
    body: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    externalReferences: z.array(
      z.object({
        system: z.literal("regula"),
        type: z.literal("alert"),
        id: z.string(),
      }),
    ),
    links: z.array(
      z.object({
        rel: z.enum(["canonical", "source"]),
        href: z.string(),
      }),
    ),
  }),
  evidence: z.object({
    embedded: z.literal(false),
    digestSha256: z.string(),
    schemaId: z.literal("regula.evidence_packet"),
    schemaVersion: z.literal("1.0.0"),
  }),
});

export type GenericGrcTicketContractV1 = z.infer<
  typeof genericGrcTicketContractSchema
>;

function impactToSeverity(impact: number | null): "low" | "medium" | "high" {
  if (impact === null) return "medium";
  if (impact >= 0.7) return "high";
  if (impact >= 0.4) return "medium";
  return "low";
}

function buildDescriptionPlainText(packet: EvidencePacketV1): string {
  const lines = [
    packet.alert.summary || "(no summary)",
    "",
    `Target: ${packet.target.label}`,
    `URL: ${packet.target.url}`,
    `Jurisdiction: ${packet.target.jurisdiction ?? "—"}`,
    `Category: ${packet.target.category ?? "—"}`,
    "",
    `Version content hash: ${packet.capturedVersion.contentHash}`,
    `Captured at: ${packet.capturedVersion.crawledAt}`,
    "",
    `Open in Regula: ${packet.regulaDeepLink}`,
    "",
    `Evidence packet integrity (SHA-256): ${packet.integrity.canonicalPayloadSha256}`,
  ];
  return lines.join("\n");
}

const jiraNotes =
  "Map fields.summary to Jira issue fields.summary. Map fields.descriptionPlainText to ADF or plain description per your Jira version. Use regula.* for custom fields or labels.";

const snNotes =
  "Map payload to incident (or sn_custom table). Use correlation_id for idempotency. Optionally map regula.* into u_* custom columns.";

const grcNotes =
  "Generic webhook or GRC import: ticket.* is the human payload; evidence.digestSha256 matches a downloaded regula.evidence_packet v1 JSON.";

export function toJiraIssueCreateContract(
  packet: EvidencePacketV1,
): JiraIssueCreateContractV1 {
  const summary = `[Regula] ${packet.target.label}`.slice(0, 255);
  const descriptionPlainText = buildDescriptionPlainText(packet);
  return jiraIssueCreateContractSchema.parse({
    contract: "regula.workflow.jira.issue_create",
    version: "1.0.0",
    integrationNotes: jiraNotes,
    fields: {
      summary,
      descriptionPlainText,
      labels: ["regula", "regulatory-change"],
    },
    regula: {
      organizationId: packet.organizationId,
      alertId: packet.alert.id,
      targetUrl: packet.target.url,
      regulaDeepLink: packet.regulaDeepLink,
      evidenceIntegritySha256: packet.integrity.canonicalPayloadSha256,
    },
  });
}

export function toServiceNowIncidentContract(
  packet: EvidencePacketV1,
): ServiceNowIncidentContractV1 {
  const short_description = `[Regula] ${packet.target.label}`.slice(0, 160);
  const description = buildDescriptionPlainText(packet);
  const correlation_id = `regula:${packet.organizationId}:${packet.alert.id}`;

  return serviceNowIncidentContractSchema.parse({
    contract: "regula.workflow.servicenow.incident",
    version: "1.0.0",
    integrationNotes: snNotes,
    payload: {
      short_description,
      description,
      correlation_id,
      category: "regulatory",
    },
    regula: {
      organizationId: packet.organizationId,
      alertId: packet.alert.id,
      targetUrl: packet.target.url,
      regulaDeepLink: packet.regulaDeepLink,
      evidenceIntegritySha256: packet.integrity.canonicalPayloadSha256,
    },
  });
}

export function toGenericGrcTicketContract(
  packet: EvidencePacketV1,
): GenericGrcTicketContractV1 {
  const title = `Regulatory change: ${packet.target.label}`.slice(0, 500);
  const body = buildDescriptionPlainText(packet);

  return genericGrcTicketContractSchema.parse({
    contract: "regula.workflow.grc.generic_ticket",
    version: "1.0.0",
    integrationNotes: grcNotes,
    ticket: {
      title,
      body,
      severity: impactToSeverity(packet.alert.impactScore),
      externalReferences: [
        { system: "regula", type: "alert", id: packet.alert.id },
      ],
      links: [
        { rel: "canonical", href: packet.regulaDeepLink },
        { rel: "source", href: packet.target.url },
      ],
    },
    evidence: {
      embedded: false,
      digestSha256: packet.integrity.canonicalPayloadSha256,
      schemaId: "regula.evidence_packet",
      schemaVersion: "1.0.0",
    },
  });
}

export type WorkflowContractProvider = "jira" | "servicenow" | "generic";

export function toWorkflowContract(
  packet: EvidencePacketV1,
  provider: WorkflowContractProvider,
):
  | JiraIssueCreateContractV1
  | ServiceNowIncidentContractV1
  | GenericGrcTicketContractV1 {
  switch (provider) {
    case "jira":
      return toJiraIssueCreateContract(packet);
    case "servicenow":
      return toServiceNowIncidentContract(packet);
    default:
      return toGenericGrcTicketContract(packet);
  }
}
