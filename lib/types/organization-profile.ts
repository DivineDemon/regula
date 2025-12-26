/**
 * Type definitions for organization profile data
 * Used to store comprehensive fintech company information
 */

/**
 * Fintech category classification
 */
export type FintechCategory =
  | "EMI" // Electronic Money Institution
  | "Neobank"
  | "PSP" // Payment Service Provider
  | "Remittance"
  | "Cryptocurrency"
  | "Lending"
  | "Investment"
  | "Insurance"
  | "Wealth Management"
  | "Trading Platform"
  | "Other";

/**
 * Business model type
 */
export type BusinessModel = "B2C" | "B2B" | "B2B2C";

/**
 * Company size classification
 */
export type CompanySize =
  | "startup" // < 10 employees
  | "small" // 10-50 employees
  | "medium" // 50-250 employees
  | "large" // 250-1000 employees
  | "enterprise"; // > 1000 employees

/**
 * Fintech service types
 */
export type FintechService =
  | "money_transfer" // Domestic and cross-border money transfers
  | "payment_processing" // Payment processing services
  | "card_issuance" // Debit/credit card issuance
  | "wallet_services" // Digital wallet services
  | "remittance" // Remittance services
  | "fx_services" // Foreign exchange services
  | "crypto_exchange" // Cryptocurrency exchange
  | "crypto_wallet" // Cryptocurrency wallet
  | "lending" // Lending services
  | "investment_platform" // Investment platform
  | "savings_account" // Savings account services
  | "current_account" // Current account services
  | "bnpl" // Buy now pay later
  | "crowdfunding" // Crowdfunding platform
  | "p2p_lending" // Peer-to-peer lending
  | "robo_advisor" // Robo-advisory services
  | "insurance_distribution" // Insurance distribution
  | "other";

/**
 * Operation type in a country
 */
export type OperationType =
  | "direct" // Direct operations (licensed entity)
  | "indirect" // Indirect operations (via partners)
  | "data_processing"; // Data processing only

/**
 * Regulatory license status
 */
export type RegulatoryStatus =
  | "licensed" // Fully licensed
  | "applying" // License application in progress
  | "exempt" // Exempt from licensing
  | "not_required" // License not required
  | "unlicensed"; // Operating without license

/**
 * Compliance requirement types
 */
export type ComplianceRequirement =
  | "AML" // Anti-Money Laundering
  | "KYC" // Know Your Customer
  | "CTF" // Counter-Terrorism Financing
  | "GDPR" // General Data Protection Regulation
  | "PCI_DSS" // Payment Card Industry Data Security Standard
  | "PSD2" // Payment Services Directive 2
  | "EMI_License" // Electronic Money Institution License
  | "PSP_License" // Payment Service Provider License
  | "Banking_License" // Banking License
  | "Remittance_License" // Remittance License
  | "Crypto_License" // Cryptocurrency License
  | "Securities_License" // Securities License
  | "Insurance_License" // Insurance License
  | "Data_Protection" // Data Protection Compliance
  | "Consumer_Protection" // Consumer Protection
  | "Capital_Requirements" // Capital Requirements
  | "Reporting_Requirements" // Regulatory Reporting
  | "Audit_Requirements" // Audit Requirements
  | "Other";

/**
 * Regulatory license information
 */
export interface RegulatoryLicense {
  licenseNumber: string;
  issuingAuthority: string;
  issueDate: string; // ISO date string
  expiryDate?: string; // ISO date string, optional
  capitalRequirement?: string; // Capital requirement amount
  status: RegulatoryStatus;
}

/**
 * Country operation details
 */
export interface CountryOperation {
  countryCode: string; // ISO 3166-1 alpha-2
  operationType: OperationType;
  services: FintechService[]; // Services offered in this country
  licenseStatus: RegulatoryStatus;
  licenses?: RegulatoryLicense[]; // License details if licensed
}

/**
 * Service-country-compliance mapping
 */
export interface ServiceCountryCompliance {
  service: FintechService;
  countryCode: string;
  complianceRequirements: ComplianceRequirement[];
  context?: string; // Additional context or notes
}

/**
 * Partnership information
 */
export interface Partnership {
  type:
    | "banking_partner"
    | "payment_network"
    | "payment_system"
    | "remittance_partner"
    | "technology_partner"
    | "other";
  name?: string; // Partner name (optional for some types)
  details?: {
    // Type-specific details
    network?: string; // For payment networks (Visa, Mastercard, etc.)
    system?: string; // For payment systems (Raast, UPI, etc.)
    corridors?: string[]; // For remittance partners (country codes)
    count?: number; // For remittance partners (number of partners)
  };
}

/**
 * Compliance framework information
 */
export interface ComplianceFramework {
  amlFramework?: string; // AML framework name
  kycProcedures?: string; // KYC procedures description
  dataProtectionFramework?: string; // Data protection framework
  privacyPolicyUrl?: string; // Privacy policy URL
  termsOfServiceUrl?: string; // Terms of service URL
  certifications?: string[]; // Regulatory certifications (PCI DSS, ISO 27001, etc.)
}

/**
 * Main organization profile interface
 */
export interface OrganizationProfile {
  // Company Information
  legalEntityName: string;
  tradingName?: string;
  companyRegistrationNumber?: string;
  dateOfIncorporation?: string; // ISO date string
  countryOfIncorporation: string; // ISO 3166-1 alpha-2
  websiteUrl?: string;
  companySize?: CompanySize;
  fintechCategory: FintechCategory;
  businessModel: BusinessModel;
  primaryJurisdiction: string; // ISO 3166-1 alpha-2

  // Services & Products
  services: FintechService[];

  // Geographic Operations
  countryOperations: CountryOperation[];

  // Compliance Mapping
  complianceMapping: ServiceCountryCompliance[];
  complianceFramework?: ComplianceFramework;

  // Partnerships
  partnerships?: Partnership[];

  // Metadata
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}
