import { z } from "zod";
import { InfraiClient } from "./infrai_client";

export const AggregateRequest = z.object({
  query: z.string().min(3),
  sources: z.array(z.string().url()).min(1)
});
export type AggregateRequest = z.infer<typeof AggregateRequest>;

export type Listing = { source: string; title: string; content: string };

export async function aggregateListings(input: unknown, client: InfraiClient): Promise<Listing[]> {
  const request = AggregateRequest.parse(input);
  const search = await client.search(request.query, request.sources.map((source) => new URL(source).hostname));
  const listings: Listing[] = [];
  for (const result of search.results) {
    const page = await client.scrape(result.url);
    const item = { source: result.url, title: result.title ?? result.url, content: page.content };
    listings.push(item);
    await client.publish({ kind: "developer-tools.listing", listing: item });
  }
  return listings;
}
