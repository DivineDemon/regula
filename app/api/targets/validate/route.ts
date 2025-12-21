import { NextResponse } from "next/server";
import { z } from "zod";

const validateUrlSchema = z.object({
  url: z.string().url("Invalid URL format"),
});

/**
 * Validates URL format and checks accessibility via HTTP GET request
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = validateUrlSchema.parse(body);

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format", accessible: false },
        { status: 400 },
      );
    }

    // Only allow http and https protocols
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        {
          error: "Only HTTP and HTTPS URLs are supported",
          accessible: false,
        },
        { status: 400 },
      );
    }

    // Check URL accessibility with a HEAD request first (lighter), fallback to GET
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      let response: Response;
      try {
        response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; RegulaBot/1.0; +https://regula.app)",
          },
          redirect: "follow",
        });
        clearTimeout(timeoutId);
      } catch (headError) {
        clearTimeout(timeoutId);
        throw headError;
      }

      // If HEAD is not allowed, try GET
      if (response.status === 405 || response.status === 501) {
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), 10000);

        try {
          const getResponse = await fetch(url, {
            method: "GET",
            signal: getController.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; RegulaBot/1.0; +https://regula.app)",
            },
            redirect: "follow",
          });
          clearTimeout(getTimeoutId);

          if (getResponse.ok || getResponse.status < 500) {
            return NextResponse.json(
              {
                accessible: true,
                status: getResponse.status,
                contentType:
                  getResponse.headers.get("content-type") || "unknown",
              },
              { status: 200 },
            );
          }
        } catch (getError) {
          clearTimeout(getTimeoutId);
          throw getError;
        }
      }

      if (response.ok || response.status < 500) {
        return NextResponse.json(
          {
            accessible: true,
            status: response.status,
            contentType: response.headers.get("content-type") || "unknown",
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          accessible: false,
          error: `URL returned status ${response.status}`,
          status: response.status,
        },
        { status: 200 },
      );
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            accessible: false,
            error: "Request timeout - URL did not respond in time",
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          accessible: false,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to access URL",
        },
        { status: 200 },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues, accessible: false },
        { status: 400 },
      );
    }
    console.error("URL validation error:", error);
    return NextResponse.json(
      {
        error: "Failed to validate URL. Please try again.",
        accessible: false,
      },
      { status: 500 },
    );
  }
}
