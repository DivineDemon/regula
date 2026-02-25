import { canonicalizeUrl } from "./url";

type Crawl4AIMarkdown =
  | string
  | {
      raw_markdown?: string;
      fit_markdown?: string;
    };

export type Crawl4AIResponseResult = {
  markdown?: Crawl4AIMarkdown;
  html?: string;
  content?: string;
  url?: string;
  status_code?: number;
  metadata?: Record<string, unknown> & {
    title?: string;
    description?: string;
    author?: string;
    published_time?: string;
    language?: string;
    // Best-effort redirect/final URL hints from various Crawl4AI builds/providers.
    final_url?: string;
    finalUrl?: string;
    redirect_chain?: unknown;
    redirectChain?: unknown;
    redirects?: unknown;
    redirected_urls?: unknown;
    redirectUrls?: unknown;
  };
};

export type Crawl4AIResult = {
  /**
   * The URL we asked Crawl4AI to crawl.
   */
  requestedUrl: string;
  /**
   * A canonical/final URL if Crawl4AI reports one (often post-redirect).
   */
  finalUrl?: string;
  /**
   * Best-effort redirect chain (canonicalized URLs), including requested and final when known.
   */
  redirectChain?: string[];
  /**
   * HTTP-ish status code reported by Crawl4AI (when available).
   */
  statusCode?: number;
  /**
   * Raw HTML returned by Crawl4AI (when available).
   */
  html?: string;
  /**
   * Best-effort markdown string normalized from Crawl4AI's `markdown` field.
   */
  markdown?: string;
  /**
   * Fallback textual content returned by Crawl4AI (when available).
   */
  content?: string;
  /**
   * Metadata Crawl4AI returns (title, language, etc).
   */
  metadata?: Crawl4AIResponseResult["metadata"];
};

export type Crawl4AIClientOptions = {
  /**
   * Override Crawl4AI base URL (defaults to `process.env.CRAWL4AI_API_URL`).
   */
  baseUrl?: string;

  /**
   * Per-request timeout for HTTP calls to Crawl4AI.
   */
  requestTimeoutMs?: number;

  /**
   * Retry attempts for transient errors (network errors, 429, 5xx, etc).
   */
  maxAttempts?: number;

  /**
   * Exponential backoff base delay (ms) for retries.
   */
  retryBaseDelayMs?: number;

  /**
   * Maximum delay (ms) for retry backoff.
   */
  retryMaxDelayMs?: number;

  /**
   * Polling interval (ms) for async Crawl4AI tasks.
   */
  pollIntervalMs?: number;

  /**
   * Max polls before giving up on an async task.
   */
  maxPolls?: number;

  /**
   * Enable verbose debug logs.
   * Defaults to `process.env.CRAWL4AI_DEBUG === "1"`.
   */
  debug?: boolean;
};

export type Crawl4AICrawlOptions = {
  /**
   * Crawl4AI `/crawl` request body extras.
   * We always include `urls: [url]`.
   */
  body?: Record<string, unknown>;
};

type CrawlInitResponse = { results: unknown[] } | { task_id: string };
type CrawlTaskResponse = {
  status: string;
  results?: unknown[];
  error?: string;
};

type LogLevel = "debug" | "info" | "warn" | "error";

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  // Strip trailing slashes so `${base}/crawl` never becomes `//crawl`.
  return trimmed.replace(/\/+$/g, "");
}

function getDefaultedOptions(
  opts?: Crawl4AIClientOptions,
): Required<Crawl4AIClientOptions> {
  return {
    baseUrl: opts?.baseUrl ?? process.env.CRAWL4AI_API_URL ?? "",
    requestTimeoutMs: opts?.requestTimeoutMs ?? 60_000,
    maxAttempts: opts?.maxAttempts ?? 3,
    retryBaseDelayMs: opts?.retryBaseDelayMs ?? 750,
    retryMaxDelayMs: opts?.retryMaxDelayMs ?? 10_000,
    pollIntervalMs: opts?.pollIntervalMs ?? 5_000,
    maxPolls: opts?.maxPolls ?? 60, // 60 polls * 5s = 5 minutes by default
    debug: opts?.debug ?? process.env.CRAWL4AI_DEBUG === "1",
  };
}

function shouldRetryStatus(status: number): boolean {
  if (status === 408) return true;
  if (status === 425) return true;
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return false;
}

function calcBackoffDelayMs(
  attempt: number,
  baseMs: number,
  maxMs: number,
): number {
  const exp = baseMs * 2 ** Math.max(0, attempt - 1);
  const capped = Math.min(maxMs, exp);
  // +/- 30% jitter
  const jitter = capped * 0.3 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(
  level: LogLevel,
  message: string,
  fields?: Record<string, unknown>,
  debugEnabled = false,
): void {
  if (level === "debug" && !debugEnabled) return;

  const payload = {
    ts: nowIso(),
    level,
    component: "crawl4ai",
    msg: message,
    ...(fields ?? {}),
  };

  if (level === "error") console.error(JSON.stringify(payload));
  else if (level === "warn") console.warn(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

async function fetchJsonWithRetry<T>(
  url: string,
  init: RequestInit,
  opts: Required<Crawl4AIClientOptions>,
  ctx: Record<string, unknown>,
): Promise<T> {
  const requestTimeoutMs = opts.requestTimeoutMs;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const startedAtMs = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      log(
        "debug",
        "HTTP request",
        {
          ...ctx,
          url,
          method: init.method ?? "GET",
          attempt,
          requestTimeoutMs,
        },
        opts.debug,
      );

      const res = await fetch(url, { ...init, signal: controller.signal });
      const durationMs = Date.now() - startedAtMs;

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const err = new Error(`HTTP ${res.status} ${res.statusText}`);

        if (shouldRetryStatus(res.status) && attempt < opts.maxAttempts) {
          const delayMs = calcBackoffDelayMs(
            attempt,
            opts.retryBaseDelayMs,
            opts.retryMaxDelayMs,
          );
          log(
            "warn",
            "HTTP error, will retry",
            {
              ...ctx,
              url,
              status: res.status,
              durationMs,
              attempt,
              delayMs,
              body: bodyText.slice(0, 500),
            },
            opts.debug,
          );
          await sleep(delayMs);
          continue;
        }

        log(
          "error",
          "HTTP error",
          {
            ...ctx,
            url,
            status: res.status,
            durationMs,
            attempt,
            body: bodyText.slice(0, 2000),
          },
          opts.debug,
        );
        throw err;
      }

      const text = await res.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        log(
          "error",
          "Non-JSON response",
          { ...ctx, url, durationMs, attempt, body: text.slice(0, 2000) },
          opts.debug,
        );
        throw new Error("Expected JSON response from Crawl4AI");
      }
    } catch (err) {
      const durationMs = Date.now() - startedAtMs;
      lastErr = err;

      const isAbort = err instanceof Error && err.name === "AbortError";
      const isRetryableNetwork = true; // for fetch, treat unknown/network errors as retryable by default

      if ((isAbort || isRetryableNetwork) && attempt < opts.maxAttempts) {
        const delayMs = calcBackoffDelayMs(
          attempt,
          opts.retryBaseDelayMs,
          opts.retryMaxDelayMs,
        );
        log(
          "warn",
          "Request failed, will retry",
          {
            ...ctx,
            url,
            attempt,
            durationMs,
            delayMs,
            err: err instanceof Error ? err.message : String(err),
            abort: isAbort,
          },
          opts.debug,
        );
        await sleep(delayMs);
        continue;
      }

      log(
        "error",
        "Request failed",
        {
          ...ctx,
          url,
          attempt,
          durationMs,
          err: err instanceof Error ? err.message : String(err),
          abort: isAbort,
        },
        opts.debug,
      );
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function normalizeMarkdown(
  md: Crawl4AIMarkdown | undefined,
): string | undefined {
  if (!md) return undefined;
  if (typeof md === "string") return md;
  if (typeof md === "object") return md.fit_markdown || md.raw_markdown;
  return undefined;
}

function normalizeUrlStable(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return canonicalizeUrl(trimmed) ?? trimmed;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const normalized = normalizeUrlStable(v);
    if (normalized) out.push(normalized);
  }
  return out.length > 0 ? out : null;
}

function dedupeSequential(xs: string[]): string[] {
  const out: string[] = [];
  for (const x of xs) {
    if (out.length > 0 && out[out.length - 1] === x) continue;
    out.push(x);
  }
  return out;
}

function extractRedirectInfo(
  requestedUrl: string,
  result: Crawl4AIResponseResult,
): Pick<Crawl4AIResult, "finalUrl" | "redirectChain"> {
  const requested = normalizeUrlStable(requestedUrl) ?? requestedUrl;
  const meta = result.metadata ?? {};

  const finalCandidate =
    normalizeUrlStable(result.url) ??
    normalizeUrlStable(
      typeof meta.final_url === "string" ? meta.final_url : undefined,
    ) ??
    normalizeUrlStable(
      typeof meta.finalUrl === "string" ? meta.finalUrl : undefined,
    );

  const chainCandidate =
    asStringArray((meta as Record<string, unknown>).redirect_chain) ??
    asStringArray((meta as Record<string, unknown>).redirectChain) ??
    asStringArray((meta as Record<string, unknown>).redirected_urls) ??
    asStringArray((meta as Record<string, unknown>).redirectUrls) ??
    asStringArray((meta as Record<string, unknown>).redirects);

  let chain: string[] | undefined;

  if (chainCandidate && chainCandidate.length > 0) {
    const xs = [...chainCandidate];
    // Ensure requested is first when known.
    if (xs[0] !== requested) xs.unshift(requested);
    // Ensure final is last when known.
    if (finalCandidate && xs[xs.length - 1] !== finalCandidate)
      xs.push(finalCandidate);
    chain = dedupeSequential(xs);
  } else if (finalCandidate && finalCandidate !== requested) {
    chain = [requested, finalCandidate];
  }

  return {
    finalUrl: finalCandidate,
    redirectChain: chain,
  };
}

function asFirstResult(results: unknown[]): Crawl4AIResponseResult {
  const first = results[0] as Crawl4AIResponseResult | undefined;
  if (!first || typeof first !== "object") {
    throw new Error("Crawl4AI returned empty or invalid results");
  }
  return first;
}

/**
 * Crawl a single URL via Crawl4AI.
 *
 * Handles both:
 * - sync responses: `{ results: [...] }`
 * - async responses: `{ task_id }` + polling `/task/:id` until completed
 */
export async function crawl(
  url: string,
  crawlOptions?: Crawl4AICrawlOptions,
  clientOptions?: Crawl4AIClientOptions,
): Promise<Crawl4AIResult> {
  return crawlViaEndpoint("crawl", url, crawlOptions, clientOptions);
}

/**
 * Crawl a single URL via Crawl4AI `/md` endpoint.
 *
 * Prefer this for documents (especially PDFs) where we want extracted text/markdown
 * rather than HTML wrappers (e.g. `<embed type=\"application/pdf\">`).
 */
export async function crawlMd(
  url: string,
  crawlOptions?: Crawl4AICrawlOptions,
  clientOptions?: Crawl4AIClientOptions,
): Promise<Crawl4AIResult> {
  return crawlViaEndpoint("md", url, crawlOptions, clientOptions);
}

async function crawlViaEndpoint(
  endpoint: "crawl" | "md",
  url: string,
  crawlOptions?: Crawl4AICrawlOptions,
  clientOptions?: Crawl4AIClientOptions,
): Promise<Crawl4AIResult> {
  const opts = getDefaultedOptions(clientOptions);
  if (!opts.baseUrl)
    throw new Error("CRAWL4AI_API_URL environment variable is not set");

  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const ctx = { requestId, requestedUrl: url };

  const crawlUrl = `${baseUrl}/${endpoint}`;
  // NOTE: Crawl4AI endpoints do not always share the same request schema:
  // - `/crawl` typically accepts `{ urls: [...] }`
  // - `/md` (in this deployment) expects `{ url: "..." }` (single URL)
  const body =
    endpoint === "md"
      ? {
          url,
          ...(crawlOptions?.body ?? {}),
        }
      : {
          urls: [url],
          // allow callers to override/add Crawl4AI options safely
          ...(crawlOptions?.body ?? {}),
        };

  const initial = await fetchJsonWithRetry<unknown>(
    crawlUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    opts,
    { ...ctx, endpoint: `/${endpoint}` },
  );

  // Some Crawl4AI endpoints may return a direct result object rather than
  // `{ results: [...] }` or `{ task_id }`.
  if (
    initial &&
    typeof initial === "object" &&
    !("task_id" in (initial as Record<string, unknown>)) &&
    !("results" in (initial as Record<string, unknown>))
  ) {
    const direct = initial as Crawl4AIResponseResult;
    const redirect = extractRedirectInfo(url, direct);
    return {
      requestedUrl: url,
      finalUrl: redirect.finalUrl,
      redirectChain: redirect.redirectChain,
      statusCode: direct.status_code,
      html: direct.html,
      markdown: normalizeMarkdown(direct.markdown),
      content: direct.content,
      metadata: direct.metadata,
    };
  }

  const init = initial as CrawlInitResponse;

  // async response: poll /task/:taskId
  if ("task_id" in init) {
    const taskId = init.task_id;
    log("info", "Task created", { ...ctx, taskId }, opts.debug);

    for (let poll = 0; poll < opts.maxPolls; poll++) {
      await sleep(opts.pollIntervalMs);

      const taskData = await fetchJsonWithRetry<CrawlTaskResponse>(
        `${baseUrl}/task/${taskId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
        opts,
        {
          ...ctx,
          endpoint: "/task",
          taskId,
          poll: poll + 1,
          maxPolls: opts.maxPolls,
        },
      );

      if (taskData.status === "completed" && Array.isArray(taskData.results)) {
        const result = asFirstResult(taskData.results);
        const redirect = extractRedirectInfo(url, result);
        return {
          requestedUrl: url,
          finalUrl: redirect.finalUrl,
          redirectChain: redirect.redirectChain,
          statusCode: result.status_code,
          html: result.html,
          markdown: normalizeMarkdown(result.markdown),
          content: result.content,
          metadata: result.metadata,
        };
      }

      if (taskData.status === "failed" || taskData.error) {
        throw new Error(
          `Crawl4AI task failed: ${taskData.error || "Unknown error"}`,
        );
      }

      log(
        "debug",
        "Task pending",
        {
          ...ctx,
          taskId,
          status: taskData.status,
          poll: poll + 1,
          maxPolls: opts.maxPolls,
        },
        opts.debug,
      );
    }

    throw new Error(
      `Crawl4AI task ${taskId} timed out after ${opts.maxPolls} polls (${Math.round(
        (opts.maxPolls * opts.pollIntervalMs) / 1000,
      )}s)`,
    );
  }

  // sync response
  if ("results" in init && Array.isArray(init.results)) {
    const result = asFirstResult(init.results);
    const redirect = extractRedirectInfo(url, result);
    return {
      requestedUrl: url,
      finalUrl: redirect.finalUrl,
      redirectChain: redirect.redirectChain,
      statusCode: result.status_code,
      html: result.html,
      markdown: normalizeMarkdown(result.markdown),
      content: result.content,
      metadata: result.metadata,
    };
  }

  throw new Error("Crawl4AI API returned unexpected response format");
}
