import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { adaptiveCrawlBackground } from "@/lib/inngest/functions/adaptive-crawl";
import { crawlTarget, scheduleCrawls } from "@/lib/inngest/functions/crawl";
import { dataRetentionCleanup } from "@/lib/inngest/functions/data-retention";
import {
  sendDailyDigests,
  sendWeeklyDigests,
} from "@/lib/inngest/functions/digest";

/**
 * Inngest API route handler for background job processing
 * This endpoint receives events from Inngest and executes the appropriate functions
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    crawlTarget,
    scheduleCrawls,
    adaptiveCrawlBackground,
    sendDailyDigests,
    sendWeeklyDigests,
    dataRetentionCleanup,
  ],
});
