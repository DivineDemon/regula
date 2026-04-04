import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : null;

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only http and https URLs are allowed" },
        { status: 400 },
      );
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Regula/1.0; +https://regula.dev)",
      },
      signal: AbortSignal.timeout(30_000), // 30s
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      const size = Number.parseInt(contentLength, 10);
      if (Number.isNaN(size) || size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Document too large" },
          { status: 413 },
        );
      }
    }

    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/pdf";

    const blob = await res.blob();
    if (blob.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Document too large" },
        { status: 413 },
      );
    }

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Proxy document error:", err);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 502 },
    );
  }
}
