import { and, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";

/**
 * Snooze an alert until a specific date
 */
export async function snoozeAlert(
  alertId: string,
  organizationId: string,
  snoozedUntil: Date,
) {
  const [updated] = await db
    .update(alerts)
    .set({
      snoozedUntil,
      updatedAt: new Date(),
    })
    .where(
      and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
    )
    .returning();

  return updated || null;
}

/**
 * Unsnooze an alert
 */
export async function unsnoozeAlert(alertId: string, organizationId: string) {
  const [updated] = await db
    .update(alerts)
    .set({
      snoozedUntil: null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
    )
    .returning();

  return updated || null;
}

/**
 * Get snoozed alerts that should be unsnoozed (past their snooze date)
 */
export async function getExpiredSnoozedAlerts(organizationId: string) {
  const now = new Date();
  return db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        lte(alerts.snoozedUntil, now),
      ),
    );
}

/**
 * Check if an alert is currently snoozed
 */
export async function isAlertSnoozed(
  alertId: string,
  organizationId: string,
): Promise<boolean> {
  const [alert] = await db
    .select()
    .from(alerts)
    .where(
      and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
    )
    .limit(1);

  if (!alert?.snoozedUntil) {
    return false;
  }

  return alert.snoozedUntil > new Date();
}
