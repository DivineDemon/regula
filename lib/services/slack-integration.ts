/**
 * Slack integration for alert notifications
 */

export interface SlackWebhookPayload {
  text?: string;
  blocks?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
  }>;
  attachments?: Array<{
    color: string;
    fields: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
  }>;
}

/**
 * Send alert notification to Slack
 */
export async function sendSlackAlertNotification(params: {
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
  let color = "#36a64f"; // Green (low)
  if (impactScore !== null) {
    if (impactScore >= 0.7) {
      color = "#ff0000"; // Red (high)
    } else if (impactScore >= 0.4) {
      color = "#ffa500"; // Orange (medium)
    }
  }

  const payload: SlackWebhookPayload = {
    text: `New Alert: ${targetLabel}`,
    attachments: [
      {
        color,
        fields: [
          {
            title: "Target",
            value: targetLabel,
            short: true,
          },
          {
            title: "Impact Score",
            value:
              impactScore !== null
                ? `${(impactScore * 100).toFixed(0)}%`
                : "N/A",
            short: true,
          },
          ...(jurisdiction
            ? [
                {
                  title: "Jurisdiction",
                  value: jurisdiction,
                  short: true,
                },
              ]
            : []),
          ...(category
            ? [
                {
                  title: "Category",
                  value: category,
                  short: true,
                },
              ]
            : []),
          {
            title: "Summary",
            value: summary.substring(0, 500),
            short: false,
          },
          {
            title: "View Alert",
            value: `<${alertUrl}|Open in Regula>`,
            short: false,
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
        error: `Slack API returned ${response.status}: ${errorText}`,
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
