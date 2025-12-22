import {
  getVersion,
  getVersionContent,
  updateVersionDiffMetadata,
  type VersionMetadata,
} from "./versions";

/**
 * Types of changes detected
 */
export type ChangeType =
  | "added"
  | "removed"
  | "modified"
  | "structural_change"
  | "attachment_added"
  | "attachment_removed"
  | "attachment_modified";

/**
 * Structural element types
 */
type StructuralElement = {
  type: "heading" | "paragraph" | "list" | "table";
  level?: number; // For headings (h1, h2, etc.)
  content: string;
  position: number; // Approximate position in document
};

/**
 * Diff result metadata
 */
export interface DiffMetadata {
  hasChanges: boolean;
  changeTypes: ChangeType[];
  structuralChanges: Array<{
    type: StructuralElement["type"];
    action: "added" | "removed" | "modified";
    position?: number;
    content?: string;
  }>;
  attachmentChanges: Array<{
    url: string;
    filename: string;
    action: "added" | "removed" | "modified";
  }>;
  affectedSections: string[]; // Section names/headings that were affected
  contentSizeChange?: number; // Change in content size (bytes)
  similarityScore?: number; // 0-1 score indicating how similar the versions are
  [key: string]: unknown; // Index signature for Record<string, unknown>
}

/**
 * Detect changes between two versions
 */
export async function detectChanges(params: {
  currentVersionId: string;
  previousVersionId: string;
  organizationId: string;
  targetId: string;
}): Promise<DiffMetadata> {
  const { currentVersionId, previousVersionId, organizationId } = params;

  // Get both versions with organizationId verification
  const [currentVersion, previousVersion] = await Promise.all([
    getVersion(currentVersionId, organizationId),
    getVersion(previousVersionId, organizationId),
  ]);

  if (!currentVersion || !previousVersion) {
    throw new Error("One or both versions not found");
  }

  // Get content for both versions
  const [currentContent, previousContent] = await Promise.all([
    getVersionContent(currentVersionId, organizationId),
    getVersionContent(previousVersionId, organizationId),
  ]);

  if (!currentContent || !previousContent) {
    throw new Error("Could not retrieve content for one or both versions");
  }

  // Parse metadata
  const currentMetadata = currentVersion.metadata
    ? (JSON.parse(currentVersion.metadata) as VersionMetadata)
    : null;
  const previousMetadata = previousVersion.metadata
    ? (JSON.parse(previousVersion.metadata) as VersionMetadata)
    : null;

  // Initialize diff metadata
  const diffMetadata: DiffMetadata = {
    hasChanges: false,
    changeTypes: [],
    structuralChanges: [],
    attachmentChanges: [],
    affectedSections: [],
  };

  // 1. Compare content hashes (already done, but we need to detect specific changes)
  const hasContentChanged =
    currentVersion.contentHash !== previousVersion.contentHash;

  if (!hasContentChanged) {
    // No changes detected
    await updateVersionDiffMetadata(
      currentVersionId,
      organizationId,
      false,
      diffMetadata,
    );
    return diffMetadata;
  }

  diffMetadata.hasChanges = true;

  // 2. Detect structural changes
  const structuralDiff = detectStructuralChanges(
    currentContent,
    previousContent,
  );
  diffMetadata.structuralChanges = structuralDiff.changes;
  diffMetadata.affectedSections = structuralDiff.affectedSections;

  // Add change types based on structural changes
  if (structuralDiff.changes.length > 0) {
    diffMetadata.changeTypes.push("structural_change");
    if (structuralDiff.changes.some((c) => c.action === "added")) {
      diffMetadata.changeTypes.push("added");
    }
    if (structuralDiff.changes.some((c) => c.action === "removed")) {
      diffMetadata.changeTypes.push("removed");
    }
    if (structuralDiff.changes.some((c) => c.action === "modified")) {
      diffMetadata.changeTypes.push("modified");
    }
  }

  // 3. Detect attachment changes
  if (currentMetadata?.attachments || previousMetadata?.attachments) {
    const attachmentDiff = detectAttachmentChanges(
      currentMetadata?.attachments || [],
      previousMetadata?.attachments || [],
    );
    diffMetadata.attachmentChanges = attachmentDiff;

    if (attachmentDiff.length > 0) {
      if (attachmentDiff.some((a) => a.action === "added")) {
        diffMetadata.changeTypes.push("attachment_added");
      }
      if (attachmentDiff.some((a) => a.action === "removed")) {
        diffMetadata.changeTypes.push("attachment_removed");
      }
      if (attachmentDiff.some((a) => a.action === "modified")) {
        diffMetadata.changeTypes.push("attachment_modified");
      }
    }
  }

  // 4. Calculate content size change
  diffMetadata.contentSizeChange =
    currentContent.length - previousContent.length;

  // 5. Calculate similarity score (simple implementation)
  diffMetadata.similarityScore = calculateSimilarity(
    currentContent,
    previousContent,
  );

  // Store diff metadata in database
  await updateVersionDiffMetadata(
    currentVersionId,
    organizationId,
    true,
    diffMetadata,
  );

  return diffMetadata;
}

/**
 * Detect structural changes (headings, paragraphs, etc.)
 */
function detectStructuralChanges(
  currentContent: string,
  previousContent: string,
): {
  changes: DiffMetadata["structuralChanges"];
  affectedSections: string[];
} {
  const changes: DiffMetadata["structuralChanges"] = [];
  const affectedSections = new Set<string>();

  // Extract structural elements from both versions
  const currentElements = extractStructuralElements(currentContent);
  const previousElements = extractStructuralElements(previousContent);

  // Create maps for easier comparison
  const previousElementMap = new Map<string, StructuralElement>();
  for (const elem of previousElements) {
    const key = `${elem.type}-${elem.position}`;
    previousElementMap.set(key, elem);
  }

  const currentElementMap = new Map<string, StructuralElement>();
  for (const elem of currentElements) {
    const key = `${elem.type}-${elem.position}`;
    currentElementMap.set(key, elem);
  }

  // Detect additions and modifications in current version
  for (const currentElem of currentElements) {
    const key = `${currentElem.type}-${currentElem.position}`;
    const previousElem = previousElementMap.get(key);

    if (!previousElem) {
      // New element added
      changes.push({
        type: currentElem.type,
        action: "added",
        position: currentElem.position,
        content: currentElem.content.substring(0, 100), // First 100 chars
      });

      if (currentElem.type === "heading") {
        affectedSections.add(currentElem.content);
      }
    } else if (previousElem.content !== currentElem.content) {
      // Element modified
      changes.push({
        type: currentElem.type,
        action: "modified",
        position: currentElem.position,
        content: currentElem.content.substring(0, 100),
      });

      if (currentElem.type === "heading") {
        affectedSections.add(previousElem.content);
        affectedSections.add(currentElem.content);
      }
    }
  }

  // Detect removals
  for (const previousElem of previousElements) {
    const key = `${previousElem.type}-${previousElem.position}`;
    if (!currentElementMap.has(key)) {
      changes.push({
        type: previousElem.type,
        action: "removed",
        position: previousElem.position,
        content: previousElem.content.substring(0, 100),
      });

      if (previousElem.type === "heading") {
        affectedSections.add(previousElem.content);
      }
    }
  }

  return {
    changes,
    affectedSections: Array.from(affectedSections),
  };
}

/**
 * Extract structural elements (headings, paragraphs) from content
 */
function extractStructuralElements(content: string): StructuralElement[] {
  const elements: StructuralElement[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    // Detect headings (markdown or HTML style)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/); // Markdown heading
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      elements.push({
        type: "heading",
        level,
        content: text,
        position: i,
      });
      continue;
    }

    // Detect HTML headings
    const htmlHeadingMatch = line.match(/^<h([1-6])[^>]*>(.+?)<\/h[1-6]>/i);
    if (htmlHeadingMatch) {
      const level = Number.parseInt(htmlHeadingMatch[1], 10);
      const text = htmlHeadingMatch[2].replace(/<[^>]+>/g, "").trim();
      elements.push({
        type: "heading",
        level,
        content: text,
        position: i,
      });
      continue;
    }

    // Detect paragraphs (non-empty lines that aren't headings)
    if (line.length > 20) {
      // Only consider substantial lines as paragraphs
      elements.push({
        type: "paragraph",
        content: line,
        position: i,
      });
    }

    // Detect lists (lines starting with - or *)
    if (line.match(/^\s*[-*]\s+/)) {
      elements.push({
        type: "list",
        content: line,
        position: i,
      });
    }
  }

  return elements;
}

/**
 * Detect attachment changes (PDFs, documents)
 */
function detectAttachmentChanges(
  currentAttachments: VersionMetadata["attachments"],
  previousAttachments: VersionMetadata["attachments"],
): DiffMetadata["attachmentChanges"] {
  const changes: DiffMetadata["attachmentChanges"] = [];

  if (!currentAttachments) currentAttachments = [];
  if (!previousAttachments) previousAttachments = [];

  // Create maps for easier comparison
  const previousMap = new Map<
    string,
    NonNullable<VersionMetadata["attachments"]>[number]
  >();
  for (const att of previousAttachments) {
    previousMap.set(att.url, att);
  }

  const currentMap = new Map<
    string,
    NonNullable<VersionMetadata["attachments"]>[number]
  >();
  for (const att of currentAttachments) {
    currentMap.set(att.url, att);
  }

  // Detect additions and modifications
  for (const currentAtt of currentAttachments) {
    const previousAtt = previousMap.get(currentAtt.url);

    if (!previousAtt) {
      // New attachment
      changes.push({
        url: currentAtt.url,
        filename: currentAtt.filename,
        action: "added",
      });
    } else if (
      previousAtt.filename !== currentAtt.filename ||
      previousAtt.type !== currentAtt.type
    ) {
      // Modified attachment
      changes.push({
        url: currentAtt.url,
        filename: currentAtt.filename,
        action: "modified",
      });
    }
  }

  // Detect removals
  for (const previousAtt of previousAttachments) {
    if (!currentMap.has(previousAtt.url)) {
      changes.push({
        url: previousAtt.url,
        filename: previousAtt.filename,
        action: "removed",
      });
    }
  }

  return changes;
}

/**
 * Calculate similarity score between two text contents (0-1, where 1 is identical)
 * Uses a simple word overlap approach
 */
function calculateSimilarity(content1: string, content2: string): number {
  // Normalize content
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

  const words1 = new Set(normalize(content1));
  const words2 = new Set(normalize(content2));

  // Calculate intersection and union
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  // Jaccard similarity
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Compare two versions and return whether they have changes
 */
export async function compareVersions(params: {
  versionId1: string;
  versionId2: string;
  organizationId: string;
}): Promise<boolean> {
  const { versionId1, versionId2, organizationId } = params;

  const [version1, version2] = await Promise.all([
    getVersion(versionId1, organizationId),
    getVersion(versionId2, organizationId),
  ]);

  if (!version1 || !version2) {
    return false;
  }

  return version1.contentHash !== version2.contentHash;
}
