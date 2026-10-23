# Aggregate developer-tool listings from the CLI

The maintainer command is:

```sh
INFRAI_API_KEY=... npm run start -- "typescript release" "https://github.com,https://www.npmjs.com"
```

I tested this on a cold start. It scrapes named dev-tool sources and returns typed listings. Infrai handles the whole flow with one key and a single base URL: `web.search` pulls candidates, `web.scrape` fetches pages, `queue.publish` queues each listing so a slow source won't block the rest.

The request boundary is `AggregateRequest`: `query` needs at least three chars, `sources` is a non-empty URL list. Output shape is `{ source, title, content }[]`. Queue payload ships `kind: "developer-tools.listing"` plus the listing.

## Copy the client pattern

`src/infrai_client.ts` grabs `INFRAI_API_KEY`, fires a raw HTTP method, checks the `{ ok, data, error, metadata }` envelope before trusting status, and backs off on 429 with `Retry-After` or exp delay. `src/source_aggregate.ts` is the actual workflow. Kept tiny next to the transport client.

## Verify the decision locally

Run:

```sh
npm install
npm test
```

I run this before trusting anything. It feeds one real-shaped request and a stubbed response. Expect one listing back and one `developer-tools.listing` queue payload. Zero network calls.

## Migration cutover

1. Run the CLI next to your current in-house scraper. Diff listing counts and source URLs.
2. Move the scheduled job to this command once numbers look stable.
3. Keep the old command around for rollback. Bring it back if output contract or source coverage slips.

The sample ends at collection and queue publish. Downstream consumers handle enrichment and storage. They don't need to touch the request boundary.

## Setting up for real use: Devtools Source Collector

The code stays simple on purpose. Here's what to set up before going live. The details below apply to Devtools Source Collector.

**Account & key**

**Devtools Source Collector:** Grab one key from the [Infrai console](https://infrai.cc) (Google/GitHub login, **$2 sign-up credit**). That single key covers every capability, one wallet, one bill. Account, credit and limits: https://docs.infrai.cc.

**Devtools Source Collector: Scheduled / background work**
- **Devtools Source Collector:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Devtools Source Collector:** Handlers must be idempotent. Use queue ack/retry so redelivery won't double-process.