import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY must be set in environment variables");
}

if (!process.env.EMAIL_FROM) {
  throw new Error("EMAIL_FROM must be set in environment variables");
}

/**
 * Resend email client
 */
export const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM;

/**
 * Email service helper functions
 */
export const email = {
  /**
   * Send an email
   */
  async send({
    to,
    subject,
    html,
    text,
    from,
    replyTo,
    cc,
    bcc,
    tags,
  }: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
    tags?: Array<{ name: string; value: string }>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Resend requires at least one of: html, text, react, or template
      if (!html && !text) {
        return {
          success: false,
          error: "Either html or text must be provided",
        };
      }

      // Build email options with proper type narrowing
      const emailOptions: Parameters<typeof resend.emails.send>[0] = {
        from: from ?? EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        ...(html ? { html } : { text: text ?? "" }),
        ...(replyTo && {
          replyTo: Array.isArray(replyTo) ? replyTo : [replyTo],
        }),
        ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
        ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
        ...(tags && { tags }),
      };

      const result = await resend.emails.send(emailOptions);

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error("Email send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Send an alert notification email
   */
  async sendAlertNotification({
    to,
    alertId,
    targetLabel,
    summary,
    impactScore,
    alertUrl,
  }: {
    to: string | string[];
    alertId: string;
    targetLabel: string;
    summary: string;
    impactScore?: number;
    alertUrl: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const impactLevel =
      impactScore === undefined
        ? "Unknown"
        : impactScore >= 0.7
          ? "High"
          : impactScore >= 0.4
            ? "Medium"
            : "Low";

    const subject = `[Regula Alert] ${targetLabel} - ${impactLevel} Impact`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Regula Alert</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin-top: 0; color: #111827;">New Regulatory Change Detected</h2>
            <p style="margin: 16px 0;"><strong>Target:</strong> ${targetLabel}</p>
            <p style="margin: 16px 0;"><strong>Impact Level:</strong> <span style="padding: 4px 12px; border-radius: 4px; font-weight: 600; ${
              impactLevel === "High"
                ? "background: #fee2e2; color: #991b1b;"
                : impactLevel === "Medium"
                  ? "background: #fef3c7; color: #92400e;"
                  : "background: #d1fae5; color: #065f46;"
            }">${impactLevel}</span></p>
            ${impactScore !== undefined ? `<p style="margin: 16px 0;"><strong>Impact Score:</strong> ${(impactScore * 100).toFixed(0)}%</p>` : ""}
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #374151;">Summary</h3>
              <p style="margin: 0; color: #6b7280;">${summary}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${alertUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Alert</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
              This is an automated notification from Regula. Alert ID: ${alertId}
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Regula Alert - New Regulatory Change Detected

Target: ${targetLabel}
Impact Level: ${impactLevel}
${impactScore !== undefined ? `Impact Score: ${(impactScore * 100).toFixed(0)}%\n` : ""}

Summary:
${summary}

View Alert: ${alertUrl}

Alert ID: ${alertId}
    `.trim();

    return this.send({
      to,
      subject,
      html,
      text,
    });
  },

  /**
   * Send a daily digest email
   */
  async sendDailyDigest({
    to,
    organizationName,
    alerts,
    digestUrl,
  }: {
    to: string | string[];
    organizationName: string;
    alerts: Array<{
      id: string;
      targetLabel: string;
      summary: string;
      impactScore?: number;
      createdAt: Date;
    }>;
    digestUrl: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const alertCount = alerts.length;
    const highImpactCount = alerts.filter(
      (a) => a.impactScore !== undefined && a.impactScore >= 0.7,
    ).length;

    const subject = `[Regula] Daily Digest - ${alertCount} New Alert${alertCount !== 1 ? "s" : ""}`;

    const alertsHtml = alerts
      .map(
        (alert) => `
      <div style="background: white; padding: 16px; border-radius: 6px; margin: 12px 0; border-left: 4px solid ${
        alert.impactScore !== undefined && alert.impactScore >= 0.7
          ? "#dc2626"
          : alert.impactScore !== undefined && alert.impactScore >= 0.4
            ? "#d97706"
            : "#059669"
      }; border: 1px solid #e5e7eb;">
        <h4 style="margin: 0 0 8px 0; color: #111827;">${alert.targetLabel}</h4>
        <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">${alert.summary}</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">${new Date(alert.createdAt).toLocaleString()}</p>
      </div>
    `,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Regula Daily Digest</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin-top: 0; color: #111827;">Hello ${organizationName},</h2>
            <p style="margin: 16px 0; color: #374151;">
              You have <strong>${alertCount}</strong> new alert${alertCount !== 1 ? "s" : ""} from the past 24 hours.
              ${highImpactCount > 0 ? `<strong>${highImpactCount}</strong> require immediate attention.` : ""}
            </p>
            <div style="margin: 30px 0;">
              ${alertsHtml}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${digestUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View All Alerts</a>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Regula Daily Digest

Hello ${organizationName},

You have ${alertCount} new alert${alertCount !== 1 ? "s" : ""} from the past 24 hours.
${highImpactCount > 0 ? `${highImpactCount} require immediate attention.\n` : ""}

${alerts.map((alert) => `${alert.targetLabel}\n${alert.summary}\n${new Date(alert.createdAt).toLocaleString()}\n`).join("\n")}

View All Alerts: ${digestUrl}
    `.trim();

    return this.send({
      to,
      subject,
      html,
      text,
    });
  },

  /**
   * Send a verification email
   */
  async sendVerificationEmail({
    to,
    verificationUrl,
    token: _token,
  }: {
    to: string;
    verificationUrl: string;
    token: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = "Verify your Regula account";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 16px 0; color: #374151;">Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify Email</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
            </p>
            <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Verify Your Email

Please verify your email address by visiting this link:
${verificationUrl}

This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    `.trim();

    return this.send({
      to,
      subject,
      html,
      text,
    });
  },

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail({
    to,
    resetUrl,
    token: _token,
  }: {
    to: string;
    resetUrl: string;
    token: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = "Reset your Regula password";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 16px 0; color: #374151;">You requested to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
            <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset

You requested to reset your password. Visit this link to create a new password:
${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    `.trim();

    return this.send({
      to,
      subject,
      html,
      text,
    });
  },

  /**
   * Send 24-hour onboarding success email (first day check-in)
   */
  async sendOnboardingSuccess24h({
    to,
    organizationName,
    dashboardUrl,
  }: {
    to: string | string[];
    organizationName: string;
    dashboardUrl: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = "[Regula] You’re all set — here’s what to do next";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You’re all set</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin-top: 0; color: #111827;">Hi ${organizationName},</h2>
            <p style="margin: 16px 0; color: #374151;">Thanks for completing onboarding. Here are quick next steps to get the most out of Regula:</p>
            <ul style="margin: 16px 0; padding-left: 24px; color: #374151;">
              <li>Check your <strong>Dashboard</strong> for a summary of targets and any early alerts.</li>
              <li>Review <strong>Alert settings</strong> under Settings → Notifications so your team gets the right updates.</li>
              <li>Add more targets anytime from the Targets page if you want to expand coverage.</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Open dashboard</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Questions? Reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
You're all set — ${organizationName}

Thanks for completing onboarding. Quick next steps:
- Check your Dashboard for targets and any early alerts.
- Review Alert settings under Settings → Notifications.
- Add more targets from the Targets page if needed.

Open dashboard: ${dashboardUrl}

Questions? Reply to this email.
    `.trim();

    return this.send({ to, subject, html, text });
  },

  /**
   * Send 7-day onboarding success / check-in email
   */
  async sendOnboardingSuccess7d({
    to,
    organizationName,
    dashboardUrl,
    alertsCount,
  }: {
    to: string | string[];
    organizationName: string;
    dashboardUrl: string;
    alertsCount?: number;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = "[Regula] One week in — how’s monitoring going?";

    const alertsLine =
      alertsCount !== undefined && alertsCount > 0
        ? `<p style="margin: 16px 0; color: #374151;">You’ve had <strong>${alertsCount}</strong> alert${alertsCount !== 1 ? "s" : ""} in the past week. Review them in the dashboard to stay on top of changes.</p>`
        : '<p style="margin: 16px 0; color: #374151;">No new alerts yet — we’ll notify you as soon as we detect relevant changes.</p>';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">One week in</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin-top: 0; color: #111827;">Hi ${organizationName},</h2>
            <p style="margin: 16px 0; color: #374151;">You’ve been using Regula for about a week. Here’s a quick check-in.</p>
            ${alertsLine}
            <p style="margin: 16px 0; color: #374151;">If you want to adjust targets or notification preferences, use the Targets page or Settings → Notifications.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Open dashboard</a>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
One week in — ${organizationName}

You've been using Regula for about a week.
${alertsCount !== undefined && alertsCount > 0 ? `You've had ${alertsCount} alert(s) in the past week. Review them in the dashboard.\n` : "No new alerts yet — we'll notify you when we detect changes.\n"}
Adjust targets on the Targets page or notifications under Settings → Notifications.

Open dashboard: ${dashboardUrl}
    `.trim();

    return this.send({ to, subject, html, text });
  },

  /**
   * Send low-engagement / “we’re here to help” email to org admins
   */
  async sendLowEngagementOutreach({
    to,
    organizationName,
    dashboardUrl,
  }: {
    to: string | string[];
    organizationName: string;
    dashboardUrl: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = "[Regula] A few tips to get more from your monitoring";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">We’re here to help</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin-top: 0; color: #111827;">Hi ${organizationName},</h2>
            <p style="margin: 16px 0; color: #374151;">We noticed you haven’t been active in Regula lately. If you’d like to get more value from your monitoring:</p>
            <ul style="margin: 16px 0; padding-left: 24px; color: #374151;">
              <li>Review and triage open alerts so your team stays in the loop.</li>
              <li>Add or refine targets to cover more regulators or jurisdictions.</li>
              <li>Adjust notification preferences so the right people get the right alerts.</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Open dashboard</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If you have questions or need help, reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
We're here to help — ${organizationName}

We noticed you haven't been active lately. Tips to get more value:
- Review and triage open alerts.
- Add or refine targets for more coverage.
- Adjust notification preferences.

Open dashboard: ${dashboardUrl}

Questions? Reply to this email.
    `.trim();

    return this.send({ to, subject, html, text });
  },
};
