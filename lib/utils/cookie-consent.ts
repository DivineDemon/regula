/**
 * Cookie consent utility functions
 * Handles checking and managing cookie consent for both logged-in and anonymous users
 */

const COOKIE_CONSENT_KEY = "regula_cookie_consent";
const COOKIE_CONSENT_VERSION = "v1.0";

export type CookieType = "essential" | "functional" | "analytics" | "marketing";

interface CookieConsentState {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: number;
}

/**
 * Get stored cookie consent from localStorage
 */
export function getCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as CookieConsentState;
    // Check if consent version is current
    if (parsed.version !== COOKIE_CONSENT_VERSION) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if user has consented to a specific cookie type
 */
export function hasCookieConsent(cookieType: CookieType): boolean {
  const consent = getCookieConsent();

  if (!consent) {
    // No consent given - only essential cookies allowed
    return cookieType === "essential";
  }

  switch (cookieType) {
    case "essential":
      return true; // Always allowed
    case "functional":
      return consent.functional;
    case "analytics":
      return consent.analytics;
    case "marketing":
      return consent.marketing;
    default:
      return false;
  }
}

/**
 * Set a cookie with consent check
 * @param name Cookie name
 * @param value Cookie value
 * @param options Cookie options (maxAge, path, etc.)
 * @param cookieType Type of cookie (essential, functional, analytics, marketing)
 * @returns true if cookie was set, false if consent was not given
 */
export function setCookieWithConsent(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
  } = {},
  cookieType: CookieType = "functional",
): boolean {
  // Essential cookies can always be set
  if (cookieType === "essential") {
    setCookie(name, value, options);
    return true;
  }

  // Check consent for non-essential cookies
  if (!hasCookieConsent(cookieType)) {
    return false;
  }

  setCookie(name, value, options);
  return true;
}

/**
 * Set a cookie (internal helper)
 */
function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
  } = {},
): void {
  if (typeof document === "undefined") {
    return;
  }

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.maxAge) {
    cookieString += `; max-age=${options.maxAge}`;
  }

  if (options.path) {
    cookieString += `; path=${options.path}`;
  } else {
    cookieString += "; path=/";
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }

  if (options.secure) {
    cookieString += "; secure";
  }

  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`;
  }

  // biome-ignore lint/suspicious/noDocumentCookie: Using standard cookie API for browser compatibility
  document.cookie = cookieString;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }

  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(
  name: string,
  options: { path?: string; domain?: string } = {},
): void {
  if (typeof document === "undefined") {
    return;
  }

  let cookieString = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`;

  if (options.path) {
    cookieString += `; path=${options.path}`;
  } else {
    cookieString += "; path=/";
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }

  // biome-ignore lint/suspicious/noDocumentCookie: Using standard cookie API for browser compatibility
  document.cookie = cookieString;
}
