export type RobotsRule = {
  type: "allow" | "disallow";
  path: string;
};

export type RobotsPolicy = {
  userAgent: string;
  isAllowed: (url: string) => boolean;
};

function stripComment(line: string): string {
  const idx = line.indexOf("#");
  return idx >= 0 ? line.slice(0, idx) : line;
}

function normalizeRulePath(p: string): string {
  const trimmed = p.trim();
  // Empty Disallow means "allow all" per common robots conventions.
  if (!trimmed) return "";
  // Rules are typically path-prefixes; normalize to start with "/".
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
}

type RobotsSection = {
  agents: string[]; // lowercased
  rules: RobotsRule[];
};

function parseRobotsTxt(txt: string): RobotsSection[] {
  const sections: RobotsSection[] = [];
  let currentAgents: string[] = [];
  let currentRules: RobotsRule[] = [];

  const lines = txt.split(/\r?\n/g);
  for (const raw of lines) {
    const line = stripComment(raw).trim();
    if (!line) continue;

    const m = line.match(/^([a-zA-Z_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = (m[1] ?? "").trim().toLowerCase();
    const value = (m[2] ?? "").trim();

    if (key === "user-agent") {
      // A new UA after rules starts a new section.
      if (currentAgents.length > 0 && currentRules.length > 0) {
        sections.push({ agents: currentAgents, rules: currentRules });
        currentAgents = [];
        currentRules = [];
      }
      const agent = value.toLowerCase();
      if (agent) currentAgents.push(agent);
      continue;
    }

    if (key === "allow" || key === "disallow") {
      if (currentAgents.length === 0) continue;
      currentRules.push({
        type: key as RobotsRule["type"],
        path: normalizeRulePath(value),
      });
    }
  }

  if (currentAgents.length > 0) {
    sections.push({ agents: currentAgents, rules: currentRules });
  }

  return sections;
}

function pickRulesForUserAgent(
  sections: RobotsSection[],
  userAgent: string,
): RobotsRule[] {
  const ua = userAgent.toLowerCase();
  const exact = sections.filter((s) => s.agents.includes(ua));
  if (exact.length > 0) return exact.flatMap((s) => s.rules);

  const star = sections.filter((s) => s.agents.includes("*"));
  if (star.length > 0) return star.flatMap((s) => s.rules);

  return [];
}

function bestRuleMatch(
  rules: RobotsRule[],
  requestPath: string,
): RobotsRule | null {
  let best: RobotsRule | null = null;
  let bestLen = -1;

  for (const r of rules) {
    const p = r.path;
    if (!p) continue;
    if (!requestPath.startsWith(p)) continue;
    const len = p.length;
    if (len > bestLen) {
      best = r;
      bestLen = len;
      continue;
    }
    if (len === bestLen && best) {
      // Tie-breaker: Allow wins over Disallow for equal-length matches.
      if (best.type === "disallow" && r.type === "allow") best = r;
    }
  }

  return best;
}

function isAllowedByRules(rules: RobotsRule[], url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return true;
  }

  const requestPath = `${u.pathname || "/"}${u.search || ""}`;
  const match = bestRuleMatch(rules, requestPath);
  if (!match) return true;
  return match.type === "allow";
}

async function fetchText(
  url: string,
  timeoutMs: number,
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    return { status: res.status, text };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch + parse robots.txt for an origin, returning a lightweight policy checker.
 *
 * If robots.txt is missing or cannot be fetched, this returns a policy that allows all.
 */
export async function loadRobotsPolicy(
  origin: string,
  opts: { userAgent: string; timeoutMs: number },
): Promise<RobotsPolicy> {
  const robotsUrl = `${origin.replace(/\/+$/g, "")}/robots.txt`;

  try {
    const { status, text } = await fetchText(robotsUrl, opts.timeoutMs);
    // Treat missing/forbidden robots as "allow all" for this prototype.
    if (status >= 400 || !text.trim()) {
      return { userAgent: opts.userAgent, isAllowed: () => true };
    }

    const sections = parseRobotsTxt(text);
    const rules = pickRulesForUserAgent(sections, opts.userAgent);
    // If no matching sections/rules, allow all.
    if (rules.length === 0)
      return { userAgent: opts.userAgent, isAllowed: () => true };

    return {
      userAgent: opts.userAgent,
      isAllowed: (url: string) => isAllowedByRules(rules, url),
    };
  } catch {
    return { userAgent: opts.userAgent, isAllowed: () => true };
  }
}
