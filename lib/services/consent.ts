import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { type ConsentType, userConsents } from "@/lib/db/schema";

/**
 * Consent management service
 */
export const consentService = {
  /**
   * Grant consent for a specific type
   */
  async grantConsent({
    userId,
    consentType,
    consentVersion,
    metadata,
  }: {
    userId: string;
    consentType: ConsentType;
    consentVersion?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const consentId = nanoid();

    // Check if consent already exists
    const existing = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, consentType),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing consent
      await db
        .update(userConsents)
        .set({
          granted: new Date(),
          withdrawn: null,
          consentVersion: consentVersion || existing[0].consentVersion,
          metadata: metadata ? JSON.stringify(metadata) : existing[0].metadata,
          updatedAt: new Date(),
        })
        .where(eq(userConsents.id, existing[0].id));

      return existing[0].id;
    }

    // Create new consent
    await db.insert(userConsents).values({
      id: consentId,
      userId,
      consentType,
      granted: new Date(),
      withdrawn: null,
      consentVersion: consentVersion || "v1.0",
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    return consentId;
  },

  /**
   * Withdraw consent for a specific type
   */
  async withdrawConsent({
    userId,
    consentType,
  }: {
    userId: string;
    consentType: ConsentType;
  }): Promise<void> {
    await db
      .update(userConsents)
      .set({
        withdrawn: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, consentType),
        ),
      );
  },

  /**
   * Check if user has granted consent
   */
  async hasConsent({
    userId,
    consentType,
  }: {
    userId: string;
    consentType: ConsentType;
  }): Promise<boolean> {
    const [consent] = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, consentType),
        ),
      )
      .limit(1);

    if (!consent) {
      return false;
    }

    // Consent is valid if granted and not withdrawn
    return consent.granted !== null && consent.withdrawn === null;
  },

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string): Promise<
    Array<{
      id: string;
      consentType: ConsentType;
      granted: Date | null;
      withdrawn: Date | null;
      consentVersion: string | null;
      metadata: string | null;
    }>
  > {
    const consents = await db
      .select({
        id: userConsents.id,
        consentType: userConsents.consentType,
        granted: userConsents.granted,
        withdrawn: userConsents.withdrawn,
        consentVersion: userConsents.consentVersion,
        metadata: userConsents.metadata,
      })
      .from(userConsents)
      .where(eq(userConsents.userId, userId));

    return consents;
  },
};
