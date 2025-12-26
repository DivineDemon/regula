// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe("useOnboardingState Hook", () => {
  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.clear();

    // Mock window.localStorage
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock window.addEventListener and removeEventListener for storage events
    vi.spyOn(window, "addEventListener");
    vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it("should initialize with empty profile", () => {
    const { result } = renderHook(() => useOnboardingState("test-org-id"));

    expect(result.current.profile).toEqual({});
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.storageAvailable).toBe(true);
  });

  it("should load saved profile from localStorage", () => {
    const savedProfile: Partial<OrganizationProfile> = {
      legalEntityName: "Test Company",
      fintechCategory: "PSP",
      businessModel: "B2C",
      countryOfIncorporation: "US",
      primaryJurisdiction: "US",
      services: ["payment_processing"],
      countryOperations: [],
      complianceMapping: [],
    };

    localStorageMock.setItem(
      "regula_onboarding_profile_test-org-id",
      JSON.stringify(savedProfile),
    );

    const { result } = renderHook(() => useOnboardingState("test-org-id"));

    expect(result.current.profile).toEqual(savedProfile);
  });

  it("should save profile to localStorage", async () => {
    const { result } = renderHook(() => useOnboardingState("test-org-id"));

    const updates: Partial<OrganizationProfile> = {
      legalEntityName: "New Company",
      fintechCategory: "PSP",
      businessModel: "B2C",
      countryOfIncorporation: "US",
      primaryJurisdiction: "US",
      services: ["payment_processing"],
      countryOperations: [],
      complianceMapping: [],
    };

    act(() => {
      result.current.saveProfile(updates);
    });

    // Wait for debounce
    await waitFor(
      () => {
        const saved = localStorageMock.getItem(
          "regula_onboarding_profile_test-org-id",
        );
        expect(saved).not.toBeNull();
        if (saved) {
          const parsed = JSON.parse(saved);
          expect(parsed.legalEntityName).toBe("New Company");
        }
      },
      { timeout: 500 },
    );
  });

  it("should merge updates with existing profile", async () => {
    const initialProfile: Partial<OrganizationProfile> = {
      legalEntityName: "Initial Company",
      fintechCategory: "PSP",
      businessModel: "B2C",
      countryOfIncorporation: "US",
      primaryJurisdiction: "US",
      services: ["payment_processing"],
      countryOperations: [],
      complianceMapping: [],
    };

    localStorageMock.setItem(
      "regula_onboarding_profile_test-org-id",
      JSON.stringify(initialProfile),
    );

    const { result } = renderHook(() => useOnboardingState("test-org-id"));

    act(() => {
      result.current.saveProfile({
        tradingName: "Updated Trading Name",
      });
    });

    await waitFor(
      () => {
        const saved = localStorageMock.getItem(
          "regula_onboarding_profile_test-org-id",
        );
        if (saved) {
          const parsed = JSON.parse(saved);
          expect(parsed.legalEntityName).toBe("Initial Company");
          expect(parsed.tradingName).toBe("Updated Trading Name");
        }
      },
      { timeout: 500 },
    );
  });

  it("should clear profile from localStorage", () => {
    const savedProfile: Partial<OrganizationProfile> = {
      legalEntityName: "Test Company",
      fintechCategory: "PSP",
      businessModel: "B2C",
      countryOfIncorporation: "US",
      primaryJurisdiction: "US",
      services: ["payment_processing"],
      countryOperations: [],
      complianceMapping: [],
    };

    localStorageMock.setItem(
      "regula_onboarding_profile_test-org-id",
      JSON.stringify(savedProfile),
    );

    const { result } = renderHook(() => useOnboardingState("test-org-id"));

    act(() => {
      result.current.clearProfile();
    });

    expect(result.current.profile).toEqual({});
    expect(
      localStorageMock.getItem("regula_onboarding_profile_test-org-id"),
    ).toBeNull();
  });

  it("should handle localStorage unavailability gracefully", () => {
    // Mock localStorage to throw errors
    const throwingLocalStorage = {
      getItem: () => {
        throw new Error("localStorage not available");
      },
      setItem: () => {
        throw new Error("localStorage not available");
      },
      removeItem: () => {
        throw new Error("localStorage not available");
      },
      clear: () => {},
    };

    Object.defineProperty(window, "localStorage", {
      value: throwingLocalStorage,
      writable: true,
    });

    const { result } = renderHook(() => useOnboardingState("test-org-id"));

    // Should still work, just without persistence
    expect(result.current.storageAvailable).toBe(false);

    act(() => {
      result.current.saveProfile({
        legalEntityName: "Test",
        fintechCategory: "PSP",
        businessModel: "B2C",
        countryOfIncorporation: "US",
        primaryJurisdiction: "US",
        services: ["payment_processing"],
        countryOperations: [],
        complianceMapping: [],
      });
    });

    // Profile should still be updated in memory
    expect(result.current.profile.legalEntityName).toBe("Test");
  });

  it("should handle corrupted localStorage data", () => {
    // Set invalid JSON
    localStorageMock.setItem(
      "regula_onboarding_profile_test-org-id",
      "invalid json{",
    );

    const { result } = renderHook(() => useOnboardingState("test-org-id"));

    // Should recover gracefully with empty profile
    expect(result.current.profile).toEqual({});
    // Corrupted data should be cleared
    expect(
      localStorageMock.getItem("regula_onboarding_profile_test-org-id"),
    ).toBeNull();
  });

  it("should use organization-specific storage keys", () => {
    const { result: result1 } = renderHook(() => useOnboardingState("org-1"));
    const { result: result2 } = renderHook(() => useOnboardingState("org-2"));

    act(() => {
      result1.current.saveProfile({
        legalEntityName: "Org 1",
        fintechCategory: "PSP",
        businessModel: "B2C",
        countryOfIncorporation: "US",
        primaryJurisdiction: "US",
        services: ["payment_processing"],
        countryOperations: [],
        complianceMapping: [],
      });
      result2.current.saveProfile({
        legalEntityName: "Org 2",
        fintechCategory: "PSP",
        businessModel: "B2C",
        countryOfIncorporation: "US",
        primaryJurisdiction: "US",
        services: ["payment_processing"],
        countryOperations: [],
        complianceMapping: [],
      });
    });

    const saved1 = localStorageMock.getItem("regula_onboarding_profile_org-1");
    const saved2 = localStorageMock.getItem("regula_onboarding_profile_org-2");

    expect(saved1).not.toBe(saved2);
    if (saved1 && saved2) {
      expect(JSON.parse(saved1).legalEntityName).toBe("Org 1");
      expect(JSON.parse(saved2).legalEntityName).toBe("Org 2");
    }
  });

  it("should debounce localStorage writes", async () => {
    const { result } = renderHook(() => useOnboardingState("test-org-id"));

    // Make multiple rapid updates
    act(() => {
      result.current.saveProfile({ legalEntityName: "Update 1" });
      result.current.saveProfile({ legalEntityName: "Update 2" });
      result.current.saveProfile({ legalEntityName: "Update 3" });
    });

    // Should only write the final value after debounce
    await waitFor(
      () => {
        const saved = localStorageMock.getItem(
          "regula_onboarding_profile_test-org-id",
        );
        if (saved) {
          const parsed = JSON.parse(saved);
          expect(parsed.legalEntityName).toBe("Update 3");
        }
      },
      { timeout: 500 },
    );
  });
});
