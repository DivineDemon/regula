import { describe, expect, it } from "vitest";
import {
  companyProfileSchema,
  complianceFrameworkSchema,
  complianceMappingSchema,
  countryOperationSchema,
  licenseSchema,
  partnershipSchema,
} from "@/lib/validations/organization-profile";

describe("Organization Profile Validation Schemas", () => {
  describe("licenseSchema", () => {
    it("should validate a valid license", () => {
      const validLicense = {
        licenseNumber: "LIC-12345",
        issuingAuthority: "Financial Services Authority",
        issueDate: "2023-01-15",
        expiryDate: "2025-01-15",
        capitalRequirement: "€1,000,000",
        status: "licensed" as const,
      };

      const result = licenseSchema.safeParse(validLicense);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validLicense);
      }
    });

    it("should reject license without required fields", () => {
      const invalidLicense = {
        licenseNumber: "LIC-12345",
        // Missing issuingAuthority
        issueDate: "2023-01-15",
        status: "licensed" as const,
      };

      const result = licenseSchema.safeParse(invalidLicense);
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const invalidLicense = {
        licenseNumber: "LIC-12345",
        issuingAuthority: "FSA",
        issueDate: "invalid-date",
        status: "licensed" as const,
      };

      const result = licenseSchema.safeParse(invalidLicense);
      expect(result.success).toBe(false);
    });

    it("should accept optional expiry date", () => {
      const licenseWithoutExpiry = {
        licenseNumber: "LIC-12345",
        issuingAuthority: "FSA",
        issueDate: "2023-01-15",
        status: "licensed" as const,
      };

      const result = licenseSchema.safeParse(licenseWithoutExpiry);
      expect(result.success).toBe(true);
    });
  });

  describe("countryOperationSchema", () => {
    it("should validate a valid country operation", () => {
      const validOperation = {
        countryCode: "US",
        operationType: "direct" as const,
        services: ["payment_processing", "money_transfer"],
        licenseStatus: "licensed" as const,
        licenses: [
          {
            licenseNumber: "LIC-123",
            issuingAuthority: "FSA",
            issueDate: "2023-01-15",
            status: "licensed" as const,
          },
        ],
      };

      const result = countryOperationSchema.safeParse(validOperation);
      expect(result.success).toBe(true);
    });

    it("should reject invalid country code", () => {
      const invalidOperation = {
        countryCode: "USA", // Should be 2 characters
        operationType: "direct" as const,
        services: ["payment_processing"],
        licenseStatus: "licensed" as const,
      };

      const result = countryOperationSchema.safeParse(invalidOperation);
      expect(result.success).toBe(false);
    });

    it("should reject empty services array", () => {
      const invalidOperation = {
        countryCode: "US",
        operationType: "direct" as const,
        services: [],
        licenseStatus: "licensed" as const,
      };

      const result = countryOperationSchema.safeParse(invalidOperation);
      expect(result.success).toBe(false);
    });

    it("should reject invalid operation type", () => {
      const invalidOperation = {
        countryCode: "US",
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid operation type for validation
        operationType: "invalid" as any,
        services: ["payment_processing"],
        licenseStatus: "licensed" as const,
      };

      const result = countryOperationSchema.safeParse(invalidOperation);
      expect(result.success).toBe(false);
    });
  });

  describe("complianceMappingSchema", () => {
    it("should validate a valid compliance mapping", () => {
      const validMapping = {
        service: "payment_processing" as const,
        countryCode: "GB",
        complianceRequirements: ["AML", "KYC", "PSD2"],
        context: "Additional compliance notes",
      };

      const result = complianceMappingSchema.safeParse(validMapping);
      expect(result.success).toBe(true);
    });

    it("should reject empty compliance requirements", () => {
      const invalidMapping = {
        service: "payment_processing" as const,
        countryCode: "GB",
        complianceRequirements: [],
      };

      const result = complianceMappingSchema.safeParse(invalidMapping);
      expect(result.success).toBe(false);
    });

    it("should accept optional context", () => {
      const mappingWithoutContext = {
        service: "payment_processing" as const,
        countryCode: "GB",
        complianceRequirements: ["AML"],
      };

      const result = complianceMappingSchema.safeParse(mappingWithoutContext);
      expect(result.success).toBe(true);
    });
  });

  describe("partnershipSchema", () => {
    it("should validate a valid partnership", () => {
      const validPartnership = {
        type: "banking_partner" as const,
        name: "Bank ABC",
        details: {
          network: "Visa",
        },
      };

      const result = partnershipSchema.safeParse(validPartnership);
      expect(result.success).toBe(true);
    });

    it("should validate partnership with corridors", () => {
      const partnershipWithCorridors = {
        type: "remittance_partner" as const,
        details: {
          corridors: ["US", "GB", "CA"],
          count: 5,
        },
      };

      const result = partnershipSchema.safeParse(partnershipWithCorridors);
      expect(result.success).toBe(true);
    });

    it("should reject invalid partnership type", () => {
      const invalidPartnership = {
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid partnership type for validation
        type: "invalid_type" as any,
        name: "Partner",
      };

      const result = partnershipSchema.safeParse(invalidPartnership);
      expect(result.success).toBe(false);
    });
  });

  describe("complianceFrameworkSchema", () => {
    it("should validate a valid compliance framework", () => {
      const validFramework = {
        amlFramework: "FATF Recommendations",
        kycProcedures: "Enhanced due diligence for high-risk customers",
        dataProtectionFramework: "GDPR",
        privacyPolicyUrl: "https://example.com/privacy",
        termsOfServiceUrl: "https://example.com/terms",
        certifications: ["PCI_DSS", "ISO_27001"],
      };

      const result = complianceFrameworkSchema.safeParse(validFramework);
      expect(result.success).toBe(true);
    });

    it("should accept empty framework", () => {
      const emptyFramework = {};

      const result = complianceFrameworkSchema.safeParse(emptyFramework);
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL", () => {
      const invalidFramework = {
        privacyPolicyUrl: "not-a-valid-url",
      };

      const result = complianceFrameworkSchema.safeParse(invalidFramework);
      expect(result.success).toBe(false);
    });

    it("should accept empty string for optional URLs", () => {
      const frameworkWithEmptyUrl = {
        privacyPolicyUrl: "",
      };

      const result = complianceFrameworkSchema.safeParse(frameworkWithEmptyUrl);
      expect(result.success).toBe(true);
    });
  });

  describe("companyProfileSchema", () => {
    it("should validate a complete valid profile", () => {
      const validProfile = {
        legalEntityName: "Acme Fintech Ltd",
        tradingName: "Acme Pay",
        companyRegistrationNumber: "12345678",
        dateOfIncorporation: "2020-01-15",
        countryOfIncorporation: "GB",
        websiteUrl: "https://acme.com",
        companySize: "medium" as const,
        fintechCategory: "PSP" as const,
        businessModel: "B2C" as const,
        primaryJurisdiction: "GB",
        services: ["payment_processing", "money_transfer"],
        countryOperations: [
          {
            countryCode: "GB",
            operationType: "direct" as const,
            services: ["payment_processing"],
            licenseStatus: "licensed" as const,
          },
        ],
        complianceMapping: [
          {
            service: "payment_processing" as const,
            countryCode: "GB",
            complianceRequirements: ["AML", "KYC"],
          },
        ],
        partnerships: [
          {
            type: "payment_network" as const,
            details: { network: "Visa" },
          },
        ],
      };

      const result = companyProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it("should reject profile without required fields", () => {
      const invalidProfile = {
        // Missing legalEntityName
        countryOfIncorporation: "GB",
        fintechCategory: "PSP" as const,
        businessModel: "B2C" as const,
        primaryJurisdiction: "GB",
        services: ["payment_processing"],
        countryOperations: [],
      };

      const result = companyProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it("should reject profile with empty services array", () => {
      const invalidProfile = {
        legalEntityName: "Acme Fintech Ltd",
        countryOfIncorporation: "GB",
        fintechCategory: "PSP" as const,
        businessModel: "B2C" as const,
        primaryJurisdiction: "GB",
        services: [],
        countryOperations: [
          {
            countryCode: "GB",
            operationType: "direct" as const,
            services: ["payment_processing"],
            licenseStatus: "licensed" as const,
          },
        ],
      };

      const result = companyProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it("should reject profile with empty country operations", () => {
      const invalidProfile = {
        legalEntityName: "Acme Fintech Ltd",
        countryOfIncorporation: "GB",
        fintechCategory: "PSP" as const,
        businessModel: "B2C" as const,
        primaryJurisdiction: "GB",
        services: ["payment_processing"],
        countryOperations: [],
      };

      const result = companyProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it("should reject invalid country code format", () => {
      const invalidProfile = {
        legalEntityName: "Acme Fintech Ltd",
        countryOfIncorporation: "United Kingdom", // Should be ISO code
        fintechCategory: "PSP" as const,
        businessModel: "B2C" as const,
        primaryJurisdiction: "GB",
        services: ["payment_processing"],
        countryOperations: [
          {
            countryCode: "GB",
            operationType: "direct" as const,
            services: ["payment_processing"],
            licenseStatus: "licensed" as const,
          },
        ],
      };

      const result = companyProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const minimalProfile = {
        legalEntityName: "Acme Fintech Ltd",
        countryOfIncorporation: "GB",
        fintechCategory: "PSP" as const,
        businessModel: "B2C" as const,
        primaryJurisdiction: "GB",
        services: ["payment_processing"],
        countryOperations: [
          {
            countryCode: "GB",
            operationType: "direct" as const,
            services: ["payment_processing"],
            licenseStatus: "licensed" as const,
          },
        ],
      };

      const result = companyProfileSchema.safeParse(minimalProfile);
      expect(result.success).toBe(true);
    });

    it("should validate legal entity name length", () => {
      const invalidProfile = {
        legalEntityName: "A".repeat(201), // Too long
        countryOfIncorporation: "GB",
        fintechCategory: "PSP" as const,
        businessModel: "B2C" as const,
        primaryJurisdiction: "GB",
        services: ["payment_processing"],
        countryOperations: [
          {
            countryCode: "GB",
            operationType: "direct" as const,
            services: ["payment_processing"],
            licenseStatus: "licensed" as const,
          },
        ],
      };

      const result = companyProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });
});
