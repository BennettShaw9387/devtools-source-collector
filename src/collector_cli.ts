import { InfraiClient } from "./infrai_client";
import { aggregateListings } from "./source_aggregate";

const query = process.argv[2] ?? "developer tools release";
const sources = (process.argv[3] ?? "https://github.com,https://www.npmjs.com").split(",");
const listings = await aggregateListings({ query, sources }, new InfraiClient());
console.log(JSON.stringify({ query, count: listings.length, listings }, null, 2));
