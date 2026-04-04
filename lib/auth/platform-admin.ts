/**
 * Platform (founder) admin check for internal dashboards.
 * Set REGULA_PLATFORM_ADMIN_EMAILS to a comma-separated list of allowed emails.
 */

const ADMIN_EMAILS_KEY = "REGULA_PLATFORM_ADMIN_EMAILS";

function getAdminEmails(): string[] {
  const raw = process.env[ADMIN_EMAILS_KEY];
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getAdminEmails();
  return allowed.length > 0 && allowed.includes(email.toLowerCase());
}
