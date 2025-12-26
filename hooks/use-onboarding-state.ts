"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

const STORAGE_KEY = "regula_onboarding_profile";

/**
 * Check if localStorage is available in the current browser
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const testKey = "__localStorage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the storage key for a specific organization
 */
function getStorageKey(organizationId: string): string {
  return `${STORAGE_KEY}_${organizationId}`;
}

/**
 * React hook for managing onboarding state with localStorage persistence
 * Handles browser compatibility, error recovery, and cross-tab synchronization
 */
export function useOnboardingState(organizationId: string) {
  const [profile, setProfile] = useState<Partial<OrganizationProfile>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = getStorageKey(organizationId);

  // Check localStorage availability on mount
  useEffect(() => {
    const available = isLocalStorageAvailable();
    setStorageAvailable(available);

    if (!available) {
      console.warn(
        "localStorage is not available. Onboarding state will not persist.",
      );
      setIsLoaded(true);
      return;
    }

    // Load saved data from localStorage on mount
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
      }
    } catch (error) {
      console.error("Failed to load onboarding state:", error);
      // Try to recover by clearing corrupted data
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore errors when clearing
      }
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    if (!storageAvailable) {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setProfile(parsed);
        } catch (error) {
          console.error("Failed to parse storage change:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [storageAvailable, storageKey]);

  // Save data to localStorage with debouncing
  const saveProfile = useCallback(
    (updates: Partial<OrganizationProfile>) => {
      if (!storageAvailable) {
        // Still update state even if storage is unavailable
        setProfile((prev) => ({ ...prev, ...updates }));
        return;
      }

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Update state immediately
      setProfile((prev) => {
        const updated = { ...prev, ...updates };

        // Debounce the actual localStorage write
        saveTimeoutRef.current = setTimeout(() => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch (error) {
            // Handle quota exceeded or other storage errors
            if (error instanceof DOMException) {
              if (error.name === "QuotaExceededError") {
                console.error(
                  "localStorage quota exceeded. Consider clearing old data.",
                );
              } else {
                console.error("Failed to save onboarding state:", error);
              }
            } else {
              console.error("Failed to save onboarding state:", error);
            }
          }
        }, 300); // 300ms debounce

        return updated;
      });
    },
    [storageAvailable, storageKey],
  );

  // Clear saved data
  const clearProfile = useCallback(() => {
    if (!storageAvailable) {
      setProfile({});
      return;
    }

    try {
      localStorage.removeItem(storageKey);
      setProfile({});
    } catch (error) {
      console.error("Failed to clear onboarding state:", error);
      // Still clear the state even if storage removal fails
      setProfile({});
    }
  }, [storageAvailable, storageKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    profile,
    saveProfile,
    clearProfile,
    isLoaded,
    storageAvailable,
  };
}
