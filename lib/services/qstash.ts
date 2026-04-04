import { Client } from "@upstash/qstash";

if (!process.env.QSTASH_TOKEN) {
  throw new Error(
    "QSTASH_TOKEN must be set (QSTASH_URL is optional; defaults to https://qstash.upstash.io)",
  );
}

/**
 * QStash client for reliable HTTP callbacks, schedules, and background delivery.
 * @see https://upstash.com/docs/qstash/overall/getstarted
 */
export const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
  baseUrl: process.env.QSTASH_URL,
});
