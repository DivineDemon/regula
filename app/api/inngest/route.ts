import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { crawlTarget, scheduleCrawls } from "@/lib/inngest/functions/crawl";

/**
 * Inngest API route handler for background job processing
 * This endpoint receives events from Inngest and executes the appropriate functions
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [crawlTarget, scheduleCrawls],
});
