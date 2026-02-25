/**
 * Download a PDF and extract plain text.
 *
 * This is a fallback when the crawler returns HTML embed wrappers instead of
 * extracted PDF content.
 */
export async function extractPdfTextFromUrl(
  url: string,
  opts?: { timeoutMs?: number; maxBytes?: number },
): Promise<string> {
  const timeoutMs = opts?.timeoutMs ?? 60_000;
  const maxBytes = opts?.maxBytes ?? 25 * 1024 * 1024; // 25MB

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Some hosts behave better with a UA.
        "User-Agent": "Regula-Isolated/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(
        `PDF download failed: HTTP ${res.status} ${res.statusText}`,
      );
    }

    const lenHeader = res.headers.get("content-length");
    if (lenHeader) {
      const len = Number(lenHeader);
      if (Number.isFinite(len) && len > maxBytes) {
        throw new Error(`PDF too large: ${len} bytes (limit ${maxBytes})`);
      }
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new Error(
        `PDF too large: ${buf.byteLength} bytes (limit ${maxBytes})`,
      );
    }

    // pdf-parse v2 exposes a `PDFParse` class (no default function export).
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      return (result.text ?? "").trim();
    } finally {
      await parser.destroy().catch(() => {});
    }
  } finally {
    clearTimeout(timeout);
  }
}
