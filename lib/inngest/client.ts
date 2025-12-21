import { Inngest } from "inngest";

/**
 * Inngest client for background job processing
 * When sending events from server-side code, we need to provide the event key
 */
export const inngest = new Inngest({
  id: "regula",
  name: "Regula",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
