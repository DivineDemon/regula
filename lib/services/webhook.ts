import crypto from "node:crypto";
import { createAuditLog } from "./audit";

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  statusText?: string;
  error?: string;
  attempt: number;
  duration: number;
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  type: string;
  alertId: string;
  organizationId: string;
  targetLabel: string;
  summary: string;
  impactScore: number | null;
  alertUrl: string;
  timestamp: string;
}

/**
 * Generate webhook signature using HMAC-SHA256
 */
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Send webhook with retry logic, timeout, and proper error handling
 */
export async function sendWebhook(params: {
  url: string;
  payload: WebhookPayload;
  secret?: string | null;
  organizationId: string;
  alertId: string;
  maxRetries?: number;
  timeout?: number;
}): Promise<WebhookDeliveryResult> {
  const {
    url,
    payload,
    secret,
    organizationId,
    alertId,
    maxRetries = 3,
    timeout = 10000, // 10 seconds default timeout
  } = params;

  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Regula-Webhook/1.0",
  };

  // Add signature if secret is provided
  if (secret) {
    const signature = generateWebhookSignature(payloadString, secret);
    headers["X-Regula-Signature"] = `sha256=${signature}`;
    headers["X-Regula-Timestamp"] = new Date().toISOString();
  }

  let lastError: Error | null = null;
  let lastStatusCode: number | undefined;
  let lastStatusText: string | undefined;

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    let controller: AbortController | null = null;

    try {
      controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), timeout);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      lastStatusCode = response.status;
      lastStatusText = response.statusText;

      // Check if response is successful (2xx status codes)
      if (response.ok) {
        // Log successful delivery
        await createAuditLog({
          organizationId,
          action: "webhook.delivered",
          metadata: {
            alertId,
            webhookUrl: url,
            statusCode: response.status,
            attempt,
            duration,
          },
        }).catch((error) => {
          console.error("Failed to log webhook delivery:", error);
        });

        return {
          success: true,
          statusCode: response.status,
          statusText: response.statusText,
          attempt,
          duration,
        };
      }

      // Non-2xx response - log and retry
      const errorText = await response
        .text()
        .catch(() => "Unable to read response");
      lastError = new Error(
        `Webhook returned ${response.status} ${response.statusText}: ${errorText.substring(0, 200)}`,
      );

      // Don't retry on client errors (4xx) except 408, 429
      if (response.status >= 400 && response.status < 500) {
        if (response.status !== 408 && response.status !== 429) {
          // Client error - don't retry
          await createAuditLog({
            organizationId,
            action: "webhook.failed",
            metadata: {
              alertId,
              webhookUrl: url,
              statusCode: response.status,
              statusText: response.statusText,
              error: errorText.substring(0, 500),
              attempt,
              duration,
            },
          }).catch((error) => {
            console.error("Failed to log webhook failure:", error);
          });

          return {
            success: false,
            statusCode: response.status,
            statusText: response.statusText,
            error: errorText.substring(0, 200),
            attempt,
            duration,
          };
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = new Error(`Webhook request timed out after ${timeout}ms`);
        } else {
          lastError = error;
        }
      } else {
        lastError = new Error(String(error));
      }

      // Log failure
      await createAuditLog({
        organizationId,
        action: "webhook.failed",
        metadata: {
          alertId,
          webhookUrl: url,
          error: lastError.message,
          attempt,
          duration,
        },
      }).catch((err) => {
        console.error("Failed to log webhook failure:", err);
      });

      // If this is the last attempt, return failure
      if (attempt === maxRetries) {
        return {
          success: false,
          error: lastError.message,
          attempt,
          duration,
        };
      }
    }

    // Exponential backoff: wait 1s, 2s, 4s before retrying
    if (attempt < maxRetries) {
      const backoffDelay = Math.min(1000 * 2 ** (attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  // Final failure after all retries
  return {
    success: false,
    statusCode: lastStatusCode,
    statusText: lastStatusText,
    error: lastError?.message || "Unknown error",
    attempt: maxRetries,
    duration: 0,
  };
}

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Webhook URL is required" };
  }

  try {
    const parsedUrl = new URL(url);

    // Only allow HTTP and HTTPS
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        valid: false,
        error: "Webhook URL must use HTTP or HTTPS protocol",
      };
    }

    // Disallow localhost/private IPs in production (optional security check)
    if (process.env.NODE_ENV === "production") {
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.16.") ||
        hostname.startsWith("172.17.") ||
        hostname.startsWith("172.18.") ||
        hostname.startsWith("172.19.") ||
        hostname.startsWith("172.20.") ||
        hostname.startsWith("172.21.") ||
        hostname.startsWith("172.22.") ||
        hostname.startsWith("172.23.") ||
        hostname.startsWith("172.24.") ||
        hostname.startsWith("172.25.") ||
        hostname.startsWith("172.26.") ||
        hostname.startsWith("172.27.") ||
        hostname.startsWith("172.28.") ||
        hostname.startsWith("172.29.") ||
        hostname.startsWith("172.30.") ||
        hostname.startsWith("172.31.")
      ) {
        return {
          valid: false,
          error:
            "Webhook URL cannot point to localhost or private IP addresses",
        };
      }
    }

    return { valid: true };
  } catch (_error) {
    return {
      valid: false,
      error: "Invalid URL format",
    };
  }
}
