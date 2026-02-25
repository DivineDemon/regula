import type { BuildGraphOptions, BuildGraphResult } from "./graph";
import { buildGraph } from "./graph";
import type { WriteDocsOptions, WriteDocsResult } from "./output";
import { writeDocsJsonlAndTxt, writeGraphJson } from "./output";
import type { RunContext } from "./run-manifest";
import { createRunContext, writeRunManifest } from "./run-manifest";
import { logInfo } from "./utils";

export type RunIsolatedOptions = {
  graph?: BuildGraphOptions;
  docs?: WriteDocsOptions;
  relevanceConfig?: unknown;
};

export type RunIsolatedResult = {
  ctx: RunContext;
  graph: BuildGraphResult;
  docsOut: WriteDocsResult;
};

export async function runIsolated(
  rootUrl: string,
  opts?: RunIsolatedOptions,
): Promise<RunIsolatedResult> {
  const startedAtMs = Date.now();
  const ctx = await createRunContext(rootUrl, new Date(startedAtMs));

  const graph = await buildGraph(rootUrl, opts?.graph);
  await writeGraphJson(ctx, graph);

  const docsOut = await writeDocsJsonlAndTxt(ctx, graph, {
    maxDocsToFetch: graph.budgets.maxDocs,
    writeDocTxt: true,
    concurrency: 4,
    ...(opts?.docs ?? {}),
  });

  await writeRunManifest({
    ctx,
    rootUrl,
    relevanceConfig: opts?.relevanceConfig,
    startedAtMs,
    budgets: graph.budgets,
    stats: {
      pagesCrawled: graph.stats.pagesCrawled,
      docsDiscovered: graph.stats.docsDiscovered,
      docsFetched: docsOut.docsFetched,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      pageErrors: graph.stats.pageErrors,
      docErrors: docsOut.docErrors,
      docsSkipped: docsOut.docsSkipped,
      docsWrittenTxt: docsOut.docsWrittenTxt,
    },
    stopReason: graph.stopReason,
  });

  logInfo("Done", { runDir: ctx.runDir });
  return { ctx, graph, docsOut };
}
