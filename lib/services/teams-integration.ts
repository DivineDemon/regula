/**
 * Microsoft Teams integration for alert notifications
 */

export interface TeamsWebhookPayload {
  "@type": "MessageCard";
  "@context": "https://schema.org/extensions";
  summary: string;
  themeColor: string;
  title: string;
  sections: Array<{
    activityTitle?: string;
    activitySubtitle?: string;
    facts: Array<{
      name: string;
      value: string;
    }>;
    markdown?: boolean;
  }>;
  potentialAction?: Array<{
    "@type": "OpenUri";
    name: string;
    targets: Array<{
      os: "default";
      uri: string;
    }>;
  }>;
}

/**
 * Send alert notification to Microsoft Teams
 */
export async function sendTeamsAlertNotification(params: {
  webhookUrl: string;
  alertId: string;
  targetLabel: string;
  summary: string;
  impactScore: number | null;
  alertUrl: string;
  jurisdiction?: string;
  category?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    webhookUrl,
    alertId: _alertId,
    targetLabel,
    summary,
    impactScore,
    alertUrl,
    jurisdiction,
    category,
  } = params;

  // Determine color based on impact score
  let themeColor = "28a745"; // Green (low)
  if (impactScore !== null) {
    if (impactScore >= 0.7) {
      themeColor = "dc3545"; // Red (high)
    } else if (impactScore >= 0.4) {
      themeColor = "ffc107"; // Yellow (medium)
    }
  }

  const payload: TeamsWebhookPayload = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: `New Alert: ${targetLabel}`,
    themeColor,
    title: "New Regulatory Alert",
    sections: [
      {
        activityTitle: targetLabel,
        activitySubtitle: "Regulatory content change detected",
        facts: [
          {
            name: "Impact Score",
            value:
              impactScore !== null
                ? `${(impactScore * 100).toFixed(0)}%`
                : "N/A",
          },
          ...(jurisdiction
            ? [
                {
                  name: "Jurisdiction",
                  value: jurisdiction,
                },
              ]
            : []),
          ...(category
            ? [
                {
                  name: "Category",
                  value: category,
                },
              ]
            : []),
          {
            name: "Summary",
            value: summary.substring(0, 1000),
          },
        ],
        markdown: true,
      },
    ],
    potentialAction: [
      {
        "@type": "OpenUri",
        name: "View Alert",
        targets: [
          {
            os: "default",
            uri: alertUrl,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Teams API returned ${response.status}: ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
