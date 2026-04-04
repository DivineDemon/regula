import { getCountryName } from "@/lib/data/countries";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

const SERVICE_LABELS: Record<string, string> = {
  money_transfer: "Money Transfer",
  payment_processing: "Payment Processing",
  card_issuance: "Card Issuance",
  wallet_services: "Wallet Services",
  remittance: "Remittance",
  fx_services: "Foreign Exchange",
  crypto_exchange: "Cryptocurrency Exchange",
  crypto_wallet: "Cryptocurrency Wallet",
  lending: "Lending",
  investment_platform: "Investment Platform",
  savings_account: "Savings Account",
  current_account: "Current Account",
  bnpl: "Buy Now Pay Later",
  crowdfunding: "Crowdfunding",
  p2p_lending: "Peer-to-Peer Lending",
  robo_advisor: "Robo-Advisory",
  insurance_distribution: "Insurance Distribution",
  other: "Other",
};

function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function labelService(id: string): string {
  return SERVICE_LABELS[id] ?? id.replace(/_/g, " ");
}

/**
 * Builds a structured Markdown export of the organization profile (for PDF / archival).
 */
export function buildOrganizationProfileMarkdown(
  profile: OrganizationProfile,
): string {
  const lines: string[] = [];
  const title = profile.tradingName || profile.legalEntityName;
  const generated = new Date().toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  lines.push(`# ${cell(title)}`);
  lines.push("");
  lines.push(`*Organization profile · ${cell(generated)}*`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Company profile");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Legal entity name | ${cell(profile.legalEntityName)} |`);
  if (profile.tradingName) {
    lines.push(`| Trading name | ${cell(profile.tradingName)} |`);
  }
  if (profile.companyRegistrationNumber) {
    lines.push(
      `| Registration number | ${cell(profile.companyRegistrationNumber)} |`,
    );
  }
  if (profile.dateOfIncorporation) {
    lines.push(
      `| Date of incorporation | ${cell(new Date(profile.dateOfIncorporation).toLocaleDateString())} |`,
    );
  }
  lines.push(
    `| Country of incorporation | ${cell(getCountryName(profile.countryOfIncorporation))} |`,
  );
  lines.push(
    `| Primary jurisdiction | ${cell(getCountryName(profile.primaryJurisdiction))} |`,
  );
  if (profile.websiteUrl) {
    lines.push(`| Website | ${cell(profile.websiteUrl)} |`);
  }
  if (profile.companySize) {
    lines.push(`| Company size | ${cell(profile.companySize)} |`);
  }
  lines.push(`| Fintech category | ${cell(profile.fintechCategory)} |`);
  lines.push(`| Business model | ${cell(profile.businessModel)} |`);
  lines.push("");

  lines.push("## Services & products");
  lines.push("");
  if (profile.services.length === 0) {
    lines.push("*No services selected.*");
  } else {
    for (const s of profile.services) {
      lines.push(`- **${cell(labelService(s))}**`);
    }
  }
  lines.push("");

  lines.push("## Geographic operations");
  lines.push("");
  if (profile.countryOperations.length === 0) {
    lines.push("*No country operations defined.*");
  } else {
    for (const op of profile.countryOperations) {
      lines.push(`### ${cell(getCountryName(op.countryCode))}`);
      lines.push("");
      lines.push("| Field | Value |");
      lines.push("| --- | --- |");
      lines.push(
        `| Operation type | ${cell(op.operationType.replace(/_/g, " "))} |`,
      );
      lines.push(
        `| License status | ${cell(op.licenseStatus.replace(/_/g, " "))} |`,
      );
      lines.push("");
      if (op.licenses?.length) {
        lines.push("**Licenses**");
        lines.push("");
        for (const lic of op.licenses) {
          lines.push(
            `- **${cell(lic.licenseNumber)}** — ${cell(lic.issuingAuthority)}`,
          );
          if (lic.expiryDate) {
            lines.push(
              `  - Expires: ${cell(new Date(lic.expiryDate).toLocaleDateString())}`,
            );
          }
        }
        lines.push("");
      }
      lines.push("**Services in this market**");
      lines.push("");
      if (op.services.length === 0) {
        lines.push("*None listed.*");
      } else {
        for (const s of op.services) {
          lines.push(`- ${cell(labelService(s))}`);
        }
      }
      lines.push("");
    }
  }

  if (profile.complianceMapping?.length) {
    lines.push("## Compliance mapping");
    lines.push("");
    for (const m of profile.complianceMapping) {
      const head = `${labelService(m.service)} — ${getCountryName(m.countryCode)}`;
      lines.push(`### ${cell(head)}`);
      lines.push("");
      if (m.complianceRequirements.length === 0) {
        lines.push("*No requirements listed.*");
      } else {
        for (const req of m.complianceRequirements) {
          lines.push(`- ${cell(req.replace(/_/g, " "))}`);
        }
      }
      if (m.context) {
        lines.push("");
        lines.push(`> ${cell(m.context)}`);
      }
      lines.push("");
    }
  }

  if (profile.complianceFramework) {
    const cf = profile.complianceFramework;
    lines.push("## Compliance framework");
    lines.push("");
    if (cf.amlFramework) {
      lines.push("### AML framework");
      lines.push("");
      lines.push(cf.amlFramework);
      lines.push("");
    }
    if (cf.kycProcedures) {
      lines.push("### KYC procedures");
      lines.push("");
      lines.push(cf.kycProcedures);
      lines.push("");
    }
    if (cf.dataProtectionFramework) {
      lines.push("### Data protection framework");
      lines.push("");
      lines.push(cf.dataProtectionFramework);
      lines.push("");
    }
    if (cf.certifications?.length) {
      lines.push("### Certifications");
      lines.push("");
      for (const c of cf.certifications) {
        lines.push(`- ${cell(c)}`);
      }
      lines.push("");
    }
  }

  if (profile.partnerships?.length) {
    lines.push("## Partnerships");
    lines.push("");
    for (const p of profile.partnerships) {
      lines.push(`### ${cell(p.type.replace(/_/g, " "))}`);
      lines.push("");
      if (p.name) {
        lines.push(`**Name:** ${cell(p.name)}`);
        lines.push("");
      }
      if (p.details) {
        const d = p.details;
        if (d.network) {
          lines.push(`- Network: ${cell(d.network)}`);
        }
        if (d.system) {
          lines.push(`- System: ${cell(d.system)}`);
        }
        if (d.corridors?.length) {
          lines.push(
            `- Corridors: ${d.corridors.map((c) => getCountryName(c)).join(", ")}`,
          );
        }
        if (d.count !== undefined) {
          lines.push(`- Count: ${d.count}`);
        }
        lines.push("");
      }
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "*This document was generated from your Regula organization profile.*",
  );

  return lines.join("\n");
}

/** Safe filename for the exported PDF. */
export function organizationProfilePdfFilename(
  profile: OrganizationProfile,
): string {
  const base =
    profile.legalEntityName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "organization-profile";
  const d = new Date().toISOString().slice(0, 10);
  return `${base}-regula-profile-${d}.pdf`;
}
