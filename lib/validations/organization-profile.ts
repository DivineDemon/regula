/**
 * Zod validation schemas for organization profile data
 * Used for validating profile data on both client and server side
 */

import { z } from "zod";

// Enum schemas matching the TypeScript types
const fintechCategorySchema = z.enum([
  "EMI",
  "Neobank",
  "PSP",
  "Remittance",
  "Cryptocurrency",
  "Lending",
  "Investment",
  "Insurance",
  "Wealth Management",
  "Trading Platform",
  "Other",
]);

const businessModelSchema = z.enum(["B2C", "B2B", "B2B2C"]);

const companySizeSchema = z.enum([
  "startup",
  "small",
  "medium",
  "large",
  "enterprise",
]);

const fintechServiceSchema = z.enum([
  "money_transfer",
  "payment_processing",
  "card_issuance",
  "wallet_services",
  "remittance",
  "fx_services",
  "crypto_exchange",
  "crypto_wallet",
  "lending",
  "investment_platform",
  "savings_account",
  "current_account",
  "bnpl",
  "crowdfunding",
  "p2p_lending",
  "robo_advisor",
  "insurance_distribution",
  "other",
]);

const operationTypeSchema = z.enum(["direct", "indirect", "data_processing"]);

const regulatoryStatusSchema = z.enum([
  "licensed",
  "applying",
  "exempt",
  "not_required",
  "unlicensed",
]);

const complianceRequirementSchema = z.enum([
  "AML",
  "KYC",
  "CTF",
  "GDPR",
  "PCI_DSS",
  "PSD2",
  "EMI_License",
  "PSP_License",
  "Banking_License",
  "Remittance_License",
  "Crypto_License",
  "Securities_License",
  "Insurance_License",
  "Data_Protection",
  "Consumer_Protection",
  "Capital_Requirements",
  "Reporting_Requirements",
  "Audit_Requirements",
  "Other",
]);

// ISO 3166-1 alpha-2 country code validation (2 uppercase letters)
const countryCodeSchema = z
  .string()
  .length(2, "Country code must be 2 characters")
  .regex(
    /^[A-Z]{2}$/,
    "Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)",
  );

// ISO date string validation (accepts YYYY-MM-DD or full ISO 8601)
const isoDateStringSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
    "Date must be a valid ISO date string (YYYY-MM-DD or ISO 8601)",
  )
  .refine((date) => !Number.isNaN(Date.parse(date)), {
    message: "Date must be a valid date",
  });

// URL validation (allows optional URLs or empty strings)
const urlSchema = z
  .union([z.string().url("Must be a valid URL"), z.literal("")])
  .optional();

/**
 * Regulatory license validation schema
 */
export const licenseSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  issuingAuthority: z.string().min(1, "Issuing authority is required"),
  issueDate: isoDateStringSchema,
  expiryDate: isoDateStringSchema.optional(),
  capitalRequirement: z.string().optional(),
  status: regulatoryStatusSchema,
});

/**
 * Country operation validation schema
 */
export const countryOperationSchema = z.object({
  countryCode: countryCodeSchema,
  operationType: operationTypeSchema,
  services: z
    .array(fintechServiceSchema)
    .min(1, "At least one service is required"),
  licenseStatus: regulatoryStatusSchema,
  licenses: z.array(licenseSchema).optional(),
});

/**
 * Service-country-compliance mapping validation schema
 */
export const complianceMappingSchema = z.object({
  service: fintechServiceSchema,
  countryCode: countryCodeSchema,
  complianceRequirements: z
    .array(complianceRequirementSchema)
    .min(1, "At least one compliance requirement is required"),
  context: z.string().optional(),
});

/**
 * Partnership validation schema
 */
export const partnershipSchema = z.object({
  type: z.enum([
    "banking_partner",
    "payment_network",
    "payment_system",
    "remittance_partner",
    "technology_partner",
    "other",
  ]),
  name: z.string().optional(),
  details: z
    .object({
      network: z.string().optional(),
      system: z.string().optional(),
      corridors: z.array(countryCodeSchema).optional(),
      count: z.number().int().positive().optional(),
    })
    .optional(),
});

/**
 * Compliance framework validation schema
 */
export const complianceFrameworkSchema = z.object({
  amlFramework: z.string().optional(),
  kycProcedures: z.string().optional(),
  dataProtectionFramework: z.string().optional(),
  privacyPolicyUrl: urlSchema,
  termsOfServiceUrl: urlSchema,
  certifications: z.array(z.string()).optional(),
});

/**
 * Main organization profile validation schema
 */
export const companyProfileSchema = z.object({
  // Company Information
  legalEntityName: z
    .string()
    .min(1, "Legal entity name is required")
    .max(200, "Legal entity name is too long"),
  tradingName: z.string().max(200, "Trading name is too long").optional(),
  companyRegistrationNumber: z
    .string()
    .max(100, "Company registration number is too long")
    .optional(),
  dateOfIncorporation: isoDateStringSchema.optional(),
  countryOfIncorporation: countryCodeSchema,
  websiteUrl: urlSchema,
  companySize: companySizeSchema.optional(),
  fintechCategory: fintechCategorySchema,
  businessModel: businessModelSchema,
  primaryJurisdiction: countryCodeSchema,

  // Services & Products
  services: z
    .array(fintechServiceSchema)
    .min(1, "At least one service is required"),

  // Geographic Operations
  countryOperations: z
    .array(countryOperationSchema)
    .min(1, "At least one country operation is required"),

  // Compliance Mapping
  complianceMapping: z.array(complianceMappingSchema).optional(),
  complianceFramework: complianceFrameworkSchema.optional(),

  // Partnerships
  partnerships: z.array(partnershipSchema).optional(),

  // Metadata (typically set by the system, not user input)
  createdAt: isoDateStringSchema.optional(),
  updatedAt: isoDateStringSchema.optional(),
});

// Export type inference for use in TypeScript
export type CompanyProfileInput = z.input<typeof companyProfileSchema>;
export type CompanyProfileOutput = z.output<typeof companyProfileSchema>;
