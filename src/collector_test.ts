import assert from "node:assert/strict";
import { aggregateListings } from "./source_aggregate";

const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
const client = {
  search: async () => ({ results: [{ url: "https://example.com/tool", title: "Tool" }] }),
  scrape: async (url: string) => ({ content: `release at ${url}` }),
  publish: async (payload: Record<string, unknown>) => { calls.push({ path: "/v1/queue/publish", body: { payload } }); return { message_id: "m1" }; }
} as any;

const result = await aggregateListings({ query: "typescript devtools", sources: ["https://example.com"] }, client);
assert.equal(result[0].title, "Tool");
assert.equal(calls.length, 1);
assert.equal((calls[0].body.payload as any).kind, "developer-tools.listing");
console.log("collector decision: one scraped listing is published for queue processing");
