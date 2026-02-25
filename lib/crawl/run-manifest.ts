import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
  crawlOutDir,
  ensureDir,
  formatTimestampForPath,
  logInfo,
  nowIso,
  slugFromUrl,
} from "./utils";

export const RUN_MANIFEST_VERSION = 1 as const;

export type CrawlBudgets = {
  maxPages?: number;
  maxDepth?: number;
  maxWallTimeMs?: number;
  maxDocs?: number;
};

export type RunManifest = {
  version: typeof RUN_MANIFEST_VERSION;
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;

  inputs: {
    rootUrl: string;
    relevanceConfig?: unknown;
  };

  budgets: CrawlBudgets;

  stats: {
    pagesCrawled: number;
    docsDiscovered: number;
    docsFetched: number;
    docsSkipped?: number;
    /**
     * Graph size summary (useful for sanity checks / diffing).
     */
    nodes?: number;
    edges?: number;
    /**
     * Error counts.
     */
    pageErrors?: number;
    docErrors?: number;
    /**
     * How many docs had a `docs/<hash>.txt` written.
     */
    docsWrittenTxt?: number;
  };

  stopReason: string;

  output: {
    runDir: string;
    runJson: string;
    graphJson: string;
    docsJsonl: string;
    docsDir: string;
  };
};

export type RunContext = {
  runDir: string;
  runJsonPath: string;
  graphJsonPath: string;
  docsJsonlPath: string;
  docsDir: string;
};

export async function createRunContext(
  rootUrl: string,
  startedAt = new Date(),
): Promise<RunContext> {
  const slug = slugFromUrl(rootUrl);
  const ts = formatTimestampForPath(startedAt);
  const runDir = path.join(crawlOutDir(), slug, ts);

  const ctx: RunContext = {
    runDir,
    runJsonPath: path.join(runDir, "run.json"),
    graphJsonPath: path.join(runDir, "graph.json"),
    docsJsonlPath: path.join(runDir, "docs.jsonl"),
    docsDir: path.join(runDir, "docs"),
  };

  await ensureDir(ctx.docsDir);
  return ctx;
}

export async function writeRunManifest(params: {
  ctx: RunContext;
  rootUrl: string;
  relevanceConfig?: unknown;
  startedAtMs: number;
  budgets?: CrawlBudgets;
  stats?: Partial<RunManifest["stats"]>;
  stopReason?: string;
}): Promise<RunManifest> {
  const finishedAtMs = Date.now();
  const durationMs = Math.max(0, finishedAtMs - params.startedAtMs);

  const manifest: RunManifest = {
    version: RUN_MANIFEST_VERSION,
    runId: path.basename(params.ctx.runDir),
    startedAt: new Date(params.startedAtMs).toISOString(),
    finishedAt: nowIso(),
    durationMs,
    inputs: {
      rootUrl: params.rootUrl,
      relevanceConfig: params.relevanceConfig,
    },
    budgets: params.budgets ?? {},
    stats: {
      pagesCrawled: params.stats?.pagesCrawled ?? 0,
      docsDiscovered: params.stats?.docsDiscovered ?? 0,
      docsFetched: params.stats?.docsFetched ?? 0,
      docsSkipped: params.stats?.docsSkipped,
      nodes: params.stats?.nodes,
      edges: params.stats?.edges,
      pageErrors: params.stats?.pageErrors,
      docErrors: params.stats?.docErrors,
      docsWrittenTxt: params.stats?.docsWrittenTxt,
    },
    stopReason: params.stopReason ?? "phase0_scaffold_only",
    output: {
      runDir: params.ctx.runDir,
      runJson: params.ctx.runJsonPath,
      graphJson: params.ctx.graphJsonPath,
      docsJsonl: params.ctx.docsJsonlPath,
      docsDir: params.ctx.docsDir,
    },
  };

  await writeFile(
    params.ctx.runJsonPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  logInfo("Wrote run manifest", { runJson: params.ctx.runJsonPath });
  return manifest;
}
