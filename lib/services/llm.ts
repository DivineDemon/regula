import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

/**
 * Google Gemini API client instance
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Regulatory content categories
 */
export type RegulatoryCategory =
  | "aml" // Anti-Money Laundering
  | "kyc" // Know Your Customer
  | "licensing" // Licensing requirements
  | "fees" // Fee structures and pricing
  | "regulations" // General regulations
  | "compliance" // Compliance requirements
  | "reporting" // Reporting obligations
  | "penalties" // Penalties and fines
  | "other"; // Other/uncategorized

/**
 * Extracted entities from regulatory content
 */
export interface ExtractedEntities {
  dates: string[]; // Important dates (deadlines, effective dates, etc.)
  fines: Array<{
    amount: string;
    currency?: string;
    description?: string;
  }>; // Fines and penalties mentioned
  statuteIds: string[]; // Statute IDs, regulation numbers, section references
  jurisdictions: string[]; // Jurisdictions mentioned
  organizations?: string[]; // Regulatory organizations mentioned
  deadlines?: string[]; // Specific deadlines
  [key: string]: unknown; // Allow additional fields
}

/**
 * Classification result
 */
export interface ClassificationResult {
  category: RegulatoryCategory;
  subcategories?: string[];
  confidence: number; // 0-1
  reasoning?: string;
}

/**
 * Summarization result
 */
export interface SummarizationResult {
  summary: string;
  keyPoints: string[];
  category: RegulatoryCategory;
  entities: ExtractedEntities;
  classification: ClassificationResult;
}

/**
 * Get the Gemini model instance
 * Uses gemini-pro as the default (most stable and widely available)
 * Can be overridden with GEMINI_MODEL_NAME environment variable
 *
 * Available models (try in order if one fails):
 * - gemini-pro (stable, widely available, works with v1 API)
 * - gemini-1.5-pro-latest (if available in your region/API)
 * - gemini-1.5-flash-latest (if available in your region/API)
 *
 * Note: If you get 404 errors, your API key might not have access to newer models.
 * Try using gemini-pro or check your Google Cloud Console for model access.
 */
function getModel() {
  // Use gemini-pro as default - most stable and available across all regions
  // This model works with the v1 API which is more widely supported
  const modelName = process.env.GEMINI_MODEL_NAME || "gemini-pro";

  try {
    return genAI.getGenerativeModel({ model: modelName });
  } catch (error) {
    // If the specified model fails, log error but still return it
    // The error will be caught by the retry logic in callLLMWithRetry
    console.error(`Failed to get model ${modelName}:`, error);
    throw error;
  }
}

/**
 * Generate a summary of regulatory content changes
 */
export async function summarizeRegulatoryContent(params: {
  previousContent: string;
  currentContent: string;
  targetUrl: string;
  targetLabel: string;
  jurisdiction?: string;
  category?: string;
  diffMetadata?: {
    changeTypes?: string[];
    affectedSections?: string[];
    structuralChanges?: Array<{
      type: string;
      action: string;
      content?: string;
    }>;
  };
}): Promise<SummarizationResult> {
  const {
    previousContent,
    currentContent,
    targetUrl,
    targetLabel,
    jurisdiction,
    category,
    diffMetadata,
  } = params;

  const model = getModel();

  // Build the prompt for summarization
  const prompt = buildSummarizationPrompt({
    previousContent,
    currentContent,
    targetUrl,
    targetLabel,
    jurisdiction,
    category,
    diffMetadata,
  });

  return callLLMWithRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the structured response
    return parseSummarizationResponse(text);
  }, "Content summarization");
}

/**
 * Classify regulatory content into categories
 */
export async function classifyRegulatoryContent(params: {
  content: string;
  targetUrl: string;
  targetLabel: string;
  jurisdiction?: string;
}): Promise<ClassificationResult> {
  const { content, targetUrl, targetLabel, jurisdiction } = params;

  const model = getModel();

  const prompt = buildClassificationPrompt({
    content,
    targetUrl,
    targetLabel,
    jurisdiction,
  });

  return callLLMWithRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseClassificationResponse(text);
  }, "Content classification");
}

/**
 * Extract named entities from regulatory content
 */
export async function extractEntities(params: {
  content: string;
  jurisdiction?: string;
}): Promise<ExtractedEntities> {
  const { content, jurisdiction } = params;

  const model = getModel();

  const prompt = buildEntityExtractionPrompt({ content, jurisdiction });

  return callLLMWithRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseEntityExtractionResponse(text);
  }, "Entity extraction");
}

/**
 * Build the prompt for regulatory content summarization
 */
function buildSummarizationPrompt(params: {
  previousContent: string;
  currentContent: string;
  targetUrl: string;
  targetLabel: string;
  jurisdiction?: string;
  category?: string;
  diffMetadata?: {
    changeTypes?: string[];
    affectedSections?: string[];
    structuralChanges?: Array<{
      type: string;
      action: string;
      content?: string;
    }>;
  };
}): string {
  const {
    previousContent,
    currentContent,
    targetUrl,
    targetLabel,
    jurisdiction,
    category,
    diffMetadata,
  } = params;

  // Truncate content if too long (Gemini has token limits)
  const MAX_CONTENT_LENGTH = 50000; // Approximate character limit
  const truncateContent = (text: string): string => {
    if (text.length <= MAX_CONTENT_LENGTH) return text;
    return `${text.substring(0, MAX_CONTENT_LENGTH)}\n\n[Content truncated...]`;
  };

  const prevContent = truncateContent(previousContent);
  const currContent = truncateContent(currentContent);

  const prompt = `You are an expert regulatory compliance analyst. Analyze the changes between two versions of regulatory content and provide a comprehensive summary.

TARGET INFORMATION:
- URL: ${targetUrl}
- Label: ${targetLabel}
${jurisdiction ? `- Jurisdiction: ${jurisdiction}` : ""}
${category ? `- Category: ${category}` : ""}

${
  diffMetadata?.affectedSections && diffMetadata.affectedSections.length > 0
    ? `AFFECTED SECTIONS: ${diffMetadata.affectedSections.join(", ")}\n`
    : ""
}
${
  diffMetadata?.changeTypes && diffMetadata.changeTypes.length > 0
    ? `CHANGE TYPES: ${diffMetadata.changeTypes.join(", ")}\n`
    : ""
}

PREVIOUS VERSION:
${prevContent}

CURRENT VERSION:
${currContent}

INSTRUCTIONS:
1. Compare the two versions and identify what has changed
2. Generate a concise summary (2-3 paragraphs) highlighting the key regulatory changes
3. Extract the primary regulatory category (AML, KYC, licensing, fees, regulations, compliance, reporting, penalties, or other)
4. List 3-5 key points about the changes
5. Extract important entities: dates, fines, statute IDs, jurisdictions, deadlines
6. Classify the content into the most appropriate regulatory category with confidence

Return your response as a JSON object with this exact structure:
{
  "summary": "A comprehensive 2-3 paragraph summary of the regulatory changes...",
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "category": "aml" | "kyc" | "licensing" | "fees" | "regulations" | "compliance" | "reporting" | "penalties" | "other",
  "entities": {
    "dates": ["date1", "date2"],
    "fines": [
      {
        "amount": "10000",
        "currency": "USD",
        "description": "Fine description"
      }
    ],
    "statuteIds": ["Statute ID 1", "Regulation 2.5"],
    "jurisdictions": ["US", "UK"],
    "deadlines": ["2024-01-15"]
  },
  "classification": {
    "category": "aml",
    "subcategories": ["subcategory1", "subcategory2"],
    "confidence": 0.95,
    "reasoning": "Brief reasoning for the classification"
  }
}

ONLY return the JSON object, no additional text or markdown formatting.`;

  return prompt;
}

/**
 * Build the prompt for content classification
 */
function buildClassificationPrompt(params: {
  content: string;
  targetUrl: string;
  targetLabel: string;
  jurisdiction?: string;
}): string {
  const { content, targetUrl, targetLabel, jurisdiction } = params;

  const MAX_CONTENT_LENGTH = 30000;
  const truncatedContent =
    content.length > MAX_CONTENT_LENGTH
      ? `${content.substring(0, MAX_CONTENT_LENGTH)}\n\n[Content truncated...]`
      : content;

  return `You are an expert regulatory compliance classifier. Classify the following regulatory content into the most appropriate category.

TARGET INFORMATION:
- URL: ${targetUrl}
- Label: ${targetLabel}
${jurisdiction ? `- Jurisdiction: ${jurisdiction}` : ""}

CONTENT:
${truncatedContent}

CATEGORIES:
- aml: Anti-Money Laundering regulations and requirements
- kyc: Know Your Customer requirements and procedures
- licensing: Licensing requirements, applications, and renewals
- fees: Fee structures, pricing, and payment requirements
- regulations: General regulatory rules and guidelines
- compliance: Compliance obligations and frameworks
- reporting: Reporting requirements and deadlines
- penalties: Penalties, fines, and enforcement actions
- other: Other regulatory content not fitting the above categories

Return your response as a JSON object with this exact structure:
{
  "category": "aml" | "kyc" | "licensing" | "fees" | "regulations" | "compliance" | "reporting" | "penalties" | "other",
  "subcategories": ["optional subcategory 1", "optional subcategory 2"],
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this category was chosen"
}

ONLY return the JSON object, no additional text or markdown formatting.`;
}

/**
 * Build the prompt for entity extraction
 */
function buildEntityExtractionPrompt(params: {
  content: string;
  jurisdiction?: string;
}): string {
  const { content, jurisdiction } = params;

  const MAX_CONTENT_LENGTH = 30000;
  const truncatedContent =
    content.length > MAX_CONTENT_LENGTH
      ? `${content.substring(0, MAX_CONTENT_LENGTH)}\n\n[Content truncated...]`
      : content;

  return `You are an expert at extracting structured information from regulatory documents. Extract important entities from the following regulatory content.

${jurisdiction ? `JURISDICTION: ${jurisdiction}\n` : ""}
CONTENT:
${truncatedContent}

Extract the following entities:
1. Dates: Important dates including effective dates, deadlines, compliance dates, expiration dates
2. Fines: Monetary penalties, fines, and their amounts (include currency if specified)
3. Statute IDs: Regulation numbers, statute references, section IDs, rule numbers (e.g., "Section 2.5", "Regulation 1234", "FINRA Rule 2111")
4. Jurisdictions: Geographic jurisdictions, countries, states, or regions mentioned
5. Deadlines: Specific deadline dates mentioned in the content

Return your response as a JSON object with this exact structure:
{
  "dates": ["2024-01-15", "Effective immediately"],
  "fines": [
    {
      "amount": "10000",
      "currency": "USD",
      "description": "Maximum fine for non-compliance"
    }
  ],
  "statuteIds": ["Section 2.5", "Regulation 1234"],
  "jurisdictions": ["United States", "California"],
  "deadlines": ["2024-03-01"]
}

ONLY return the JSON object, no additional text or markdown formatting.`;
}

/**
 * Parse the summarization response from Gemini
 */
function parseSummarizationResponse(text: string): SummarizationResult {
  try {
    // Try to extract JSON from the response (might be wrapped in markdown code blocks)
    let jsonText = text.trim();

    // Remove markdown code block formatting if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText) as SummarizationResult;

    // Validate required fields
    if (!parsed.summary || !parsed.category || !parsed.entities) {
      throw new Error("Invalid response structure: missing required fields");
    }

    // Ensure all required fields have defaults
    return {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints || [],
      category: parsed.category as RegulatoryCategory,
      entities: parsed.entities || {
        dates: [],
        fines: [],
        statuteIds: [],
        jurisdictions: [],
      },
      classification: parsed.classification || {
        category: parsed.category as RegulatoryCategory,
        confidence: 0.8,
      },
    };
  } catch (error) {
    console.error("Error parsing summarization response:", error);
    console.error("Response text:", text);

    // Return a fallback response
    return {
      summary:
        "Unable to generate summary. Please review the content changes manually.",
      keyPoints: ["Changes detected in regulatory content"],
      category: "other",
      entities: {
        dates: [],
        fines: [],
        statuteIds: [],
        jurisdictions: [],
      },
      classification: {
        category: "other",
        confidence: 0.5,
        reasoning: "Fallback classification due to parsing error",
      },
    };
  }
}

/**
 * Parse the classification response from Gemini
 */
function parseClassificationResponse(text: string): ClassificationResult {
  try {
    let jsonText = text.trim();

    // Remove markdown code block formatting if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText) as ClassificationResult;

    // Validate and return
    if (!parsed.category) {
      throw new Error("Invalid response: missing category");
    }

    return {
      category: parsed.category as RegulatoryCategory,
      subcategories: parsed.subcategories,
      confidence: parsed.confidence ?? 0.8,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error("Error parsing classification response:", error);
    console.error("Response text:", text);

    // Return fallback
    return {
      category: "other",
      confidence: 0.5,
      reasoning: "Fallback classification due to parsing error",
    };
  }
}

/**
 * Parse the entity extraction response from Gemini
 */
function parseEntityExtractionResponse(text: string): ExtractedEntities {
  try {
    let jsonText = text.trim();

    // Remove markdown code block formatting if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText) as ExtractedEntities;

    // Ensure all required fields exist
    return {
      dates: parsed.dates || [],
      fines: parsed.fines || [],
      statuteIds: parsed.statuteIds || [],
      jurisdictions: parsed.jurisdictions || [],
      deadlines: parsed.deadlines || [],
      organizations: parsed.organizations,
    };
  } catch (error) {
    console.error("Error parsing entity extraction response:", error);
    console.error("Response text:", text);

    // Return empty entities as fallback
    return {
      dates: [],
      fines: [],
      statuteIds: [],
      jurisdictions: [],
    };
  }
}

/**
 * Suggested target from LLM discovery
 */
export interface SuggestedTarget {
  url: string;
  label: string;
  jurisdiction?: string;
  category?: "aml" | "kyc" | "licensing" | "fees" | "regulations" | "other";
  confidence: number; // 0-1
  reasoning: string;
  relevantServices?: string[];
  relevantCountries?: string[];
}

/**
 * Retry configuration for LLM operations
 */
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const LLM_TIMEOUT_MS = 60000; // 60 seconds timeout

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY_MS * 2 ** attempt;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call LLM with timeout and retry logic
 */
async function callLLMWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(`${operationName} timed out after ${LLM_TIMEOUT_MS}ms`),
            ),
          LLM_TIMEOUT_MS,
        );
      });

      // Race between the operation and timeout
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors (e.g., validation errors, auth errors)
      if (
        error instanceof Error &&
        (error.message.includes("API key") ||
          error.message.includes("unauthorized") ||
          error.message.includes("permission") ||
          error.message.includes("quota") ||
          error.message.includes("rate limit"))
      ) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Calculate delay for next retry (exponential backoff)
      const delay = getRetryDelay(attempt);
      console.warn(
        `${operationName} failed (attempt ${attempt + 1}/${
          MAX_RETRIES + 1
        }), retrying in ${delay}ms...`,
        error instanceof Error ? error.message : String(error),
      );
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw new Error(
    `${operationName} failed after ${MAX_RETRIES + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

/**
 * Discover relevant regulatory targets from organization profile
 */
export async function discoverRelevantTargetsFromProfile(
  profile: OrganizationProfile,
): Promise<SuggestedTarget[]> {
  const model = getModel();
  const prompt = buildTargetDiscoveryPrompt(profile);

  return callLLMWithRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const targets = parseTargetDiscoveryResponse(text);

    // Validate that we got at least some results
    if (targets.length === 0) {
      console.warn(
        "LLM returned empty target list - this may indicate an issue",
      );
    }

    return targets;
  }, "Target discovery");
}

/**
 * Build the prompt for target discovery
 */
function buildTargetDiscoveryPrompt(profile: OrganizationProfile): string {
  // Build structured prompt from profile data
  const promptSections: string[] = [];

  // Organization Overview
  promptSections.push("ORGANIZATION OVERVIEW:");
  promptSections.push(`- Legal Entity Name: ${profile.legalEntityName}`);
  if (profile.tradingName) {
    promptSections.push(`- Trading Name: ${profile.tradingName}`);
  }
  promptSections.push(`- Fintech Category: ${profile.fintechCategory}`);
  promptSections.push(`- Business Model: ${profile.businessModel}`);
  promptSections.push(
    `- Country of Incorporation: ${profile.countryOfIncorporation}`,
  );
  promptSections.push(`- Primary Jurisdiction: ${profile.primaryJurisdiction}`);
  if (profile.companySize) {
    promptSections.push(`- Company Size: ${profile.companySize}`);
  }
  if (profile.websiteUrl) {
    promptSections.push(`- Website: ${profile.websiteUrl}`);
  }
  promptSections.push("");

  // Services & Products
  promptSections.push("SERVICES & PRODUCTS:");
  if (profile.services && profile.services.length > 0) {
    profile.services.forEach((service) => {
      promptSections.push(`- ${service}`);
    });
  } else {
    promptSections.push("- No specific services listed");
  }
  promptSections.push("");

  // Geographic Operations
  promptSections.push("GEOGRAPHIC OPERATIONS:");
  if (profile.countryOperations && profile.countryOperations.length > 0) {
    profile.countryOperations.forEach((operation) => {
      promptSections.push(`- ${operation.countryCode}:`);
      promptSections.push(`  - Operation Type: ${operation.operationType}`);
      promptSections.push(`  - License Status: ${operation.licenseStatus}`);
      if (operation.services && operation.services.length > 0) {
        promptSections.push(`  - Services: ${operation.services.join(", ")}`);
      }
      if (operation.licenses && operation.licenses.length > 0) {
        operation.licenses.forEach((license) => {
          promptSections.push(
            `  - License: ${license.licenseNumber} (${license.issuingAuthority})`,
          );
        });
      }
    });
  } else {
    promptSections.push("- No geographic operations specified");
  }
  promptSections.push("");

  // Compliance Mapping
  if (profile.complianceMapping && profile.complianceMapping.length > 0) {
    promptSections.push("COMPLIANCE REQUIREMENTS:");
    profile.complianceMapping.forEach((mapping) => {
      promptSections.push(`- ${mapping.service} in ${mapping.countryCode}:`);
      if (
        mapping.complianceRequirements &&
        mapping.complianceRequirements.length > 0
      ) {
        promptSections.push(
          `  - Requirements: ${mapping.complianceRequirements.join(", ")}`,
        );
      }
      if (mapping.context) {
        promptSections.push(`  - Context: ${mapping.context}`);
      }
    });
    promptSections.push("");
  }

  // Compliance Framework
  if (profile.complianceFramework) {
    promptSections.push("COMPLIANCE FRAMEWORK:");
    const framework = profile.complianceFramework;
    if (framework.amlFramework) {
      promptSections.push(`- AML Framework: ${framework.amlFramework}`);
    }
    if (framework.kycProcedures) {
      promptSections.push(`- KYC Procedures: ${framework.kycProcedures}`);
    }
    if (framework.dataProtectionFramework) {
      promptSections.push(
        `- Data Protection Framework: ${framework.dataProtectionFramework}`,
      );
    }
    if (framework.certifications && framework.certifications.length > 0) {
      promptSections.push(
        `- Certifications: ${framework.certifications.join(", ")}`,
      );
    }
    promptSections.push("");
  }

  // Partnerships
  if (profile.partnerships && profile.partnerships.length > 0) {
    promptSections.push("PARTNERSHIPS:");
    profile.partnerships.forEach((partnership) => {
      promptSections.push(`- ${partnership.type}`);
      if (partnership.name) {
        promptSections.push(`  - Name: ${partnership.name}`);
      }
      if (partnership.details) {
        if (partnership.details.network) {
          promptSections.push(`  - Network: ${partnership.details.network}`);
        }
        if (partnership.details.system) {
          promptSections.push(`  - System: ${partnership.details.system}`);
        }
        if (
          partnership.details.corridors &&
          partnership.details.corridors.length > 0
        ) {
          promptSections.push(
            `  - Corridors: ${partnership.details.corridors.join(", ")}`,
          );
        }
      }
    });
    promptSections.push("");
  }

  const profileText = promptSections.join("\n");

  return `You are an expert regulatory compliance analyst specializing in fintech regulations. Based on the provided organization profile, identify relevant regulatory targets (websites, documents, or pages) that this organization should monitor for regulatory changes.

${profileText}

INSTRUCTIONS FOR TARGET DISCOVERY:
1. Analyze the organization's services, geographic operations, compliance requirements, and partnerships
2. Identify relevant regulatory authorities, agencies, or organizations that publish regulatory updates for each jurisdiction
3. For each jurisdiction where the organization operates (from Geographic Operations), suggest the primary regulatory websites and regulatory bodies
4. Consider the organization's specific services and suggest specialized regulatory bodies:
   - Payment services: Payment regulators, central banks, payment system operators
   - Banking services: Banking authorities, financial services regulators
   - Crypto services: Cryptocurrency regulators, financial crime units
   - Remittance: Money transfer regulators, anti-money laundering units
   - Data processing: Data protection authorities, privacy regulators
5. Based on compliance requirements, suggest relevant regulatory bodies:
   - AML requirements: Financial intelligence units, anti-money laundering authorities
   - KYC requirements: Identity verification authorities, customer due diligence regulators
   - Licensing requirements: License-issuing authorities for the relevant services
   - Data protection: Data protection authorities, privacy commissioners
6. Include both general regulatory sites (central banks, financial authorities) and service-specific regulatory sites
7. Consider partnerships - if the organization uses payment networks or systems, include relevant regulatory bodies for those networks
8. Provide URLs that are likely to contain regulatory updates, policy changes, compliance requirements, or licensing information
9. Assign a confidence score (0-1) based on how directly relevant the target is to the organization's operations
10. Provide clear reasoning for each suggested target explaining why it's relevant
11. Map relevant services and countries to each target to show the connection

Return your response as a JSON array with this exact structure:
[
  {
    "url": "https://example.com/regulatory-updates",
    "label": "Regulatory Authority Name - Updates Page",
    "jurisdiction": "US",
    "category": "regulations",
    "confidence": 0.95,
    "reasoning": "This is the primary regulatory authority for payment services in the US and regularly publishes updates relevant to PSPs operating in this jurisdiction",
    "relevantServices": ["payment_processing", "money_transfer"],
    "relevantCountries": ["US"]
  }
]

CATEGORIES (use the most appropriate):
- aml: Anti-Money Laundering regulations and requirements
- kyc: Know Your Customer requirements and procedures
- licensing: Licensing requirements, applications, and renewals
- fees: Fee structures, pricing, and payment requirements
- regulations: General regulatory rules and guidelines
- other: Other regulatory content

IMPORTANT GUIDELINES:
- Only suggest real, publicly accessible regulatory websites (verify these are actual official sites)
- Focus on official government or regulatory authority websites
- Prioritize targets that are likely to have regular updates (news sections, regulatory updates pages, policy changes)
- Include targets for ALL jurisdictions where the organization operates
- Consider both primary regulatory bodies (central banks, main financial regulators) and secondary/ specialized bodies (data protection, consumer protection, etc.)
- For services requiring licenses, prioritize the licensing authority websites
- For services with specific compliance requirements (AML, KYC, GDPR), include the relevant enforcement authorities
- Return at least 5-10 relevant targets, but aim for 10-30 high-quality targets
- Ensure targets cover all key jurisdictions and services mentioned in the profile

ONLY return the JSON array, no additional text or markdown formatting.`;
}

/**
 * Parse the target discovery response from Gemini
 */
function parseTargetDiscoveryResponse(text: string): SuggestedTarget[] {
  try {
    let jsonText = text.trim();

    // Remove markdown code block formatting if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    // Try to extract JSON array from the text if it's embedded in other text
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Validate and filter results
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    // Validate each target and filter invalid ones
    const validTargets = parsed
      .filter((target) => {
        // Validate required fields
        if (!target || typeof target !== "object") {
          return false;
        }

        // URL is required and must be a valid string
        if (
          !target.url ||
          typeof target.url !== "string" ||
          target.url.trim().length === 0
        ) {
          return false;
        }

        // Label is required and must be a valid string
        if (
          !target.label ||
          typeof target.label !== "string" ||
          target.label.trim().length === 0
        ) {
          return false;
        }

        // Confidence is required and must be a number between 0 and 1
        if (
          typeof target.confidence !== "number" ||
          target.confidence < 0 ||
          target.confidence > 1 ||
          Number.isNaN(target.confidence)
        ) {
          return false;
        }

        // Reasoning is required
        if (typeof target.reasoning !== "string") {
          return false;
        }

        return true;
      })
      .map((target) => {
        // Normalize and clean the target data
        const normalized: SuggestedTarget = {
          url: target.url.trim(),
          label: target.label.trim(),
          confidence: Math.max(0, Math.min(1, target.confidence)), // Clamp between 0 and 1
          reasoning: target.reasoning?.trim() || "",
        };

        // Optional fields
        if (target.jurisdiction && typeof target.jurisdiction === "string") {
          normalized.jurisdiction = target.jurisdiction.trim();
        }

        // Validate category if provided
        const validCategories = [
          "aml",
          "kyc",
          "licensing",
          "fees",
          "regulations",
          "other",
        ];
        if (
          target.category &&
          typeof target.category === "string" &&
          validCategories.includes(target.category)
        ) {
          normalized.category = target.category as SuggestedTarget["category"];
        }

        // Validate and normalize relevant services if provided
        if (
          target.relevantServices &&
          Array.isArray(target.relevantServices) &&
          target.relevantServices.length > 0
        ) {
          normalized.relevantServices = target.relevantServices
            .filter((s: unknown) => typeof s === "string")
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        }

        // Validate and normalize relevant countries if provided
        if (
          target.relevantCountries &&
          Array.isArray(target.relevantCountries) &&
          target.relevantCountries.length > 0
        ) {
          normalized.relevantCountries = target.relevantCountries
            .filter((c: unknown) => typeof c === "string")
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);
        }

        return normalized;
      });

    return validTargets;
  } catch (error) {
    console.error("Error parsing target discovery response:", error);
    console.error("Response text:", text.substring(0, 1000)); // Log first 1000 chars

    // Return empty array as fallback
    return [];
  }
}
