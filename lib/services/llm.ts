import { GoogleGenerativeAI } from "@google/generative-ai";

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
 */
function getModel() {
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the structured response
    return parseSummarizationResponse(text);
  } catch (error) {
    console.error("Error generating regulatory content summary:", error);
    throw new Error(
      `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseClassificationResponse(text);
  } catch (error) {
    console.error("Error classifying regulatory content:", error);
    throw new Error(
      `Failed to classify content: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseEntityExtractionResponse(text);
  } catch (error) {
    console.error("Error extracting entities:", error);
    throw new Error(
      `Failed to extract entities: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
