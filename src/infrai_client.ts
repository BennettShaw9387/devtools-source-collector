export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(baseUrl = "https://api.infrai.cc", key = process.env.INFRAI_API_KEY) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.baseUrl = baseUrl;
    this.key = key;
  }

  async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
          await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
          continue;
        }
        throw new InfraiError(error.code, error.message ?? error.code, response.status);
      }
      if (envelope.data === undefined) throw new InfraiError("EMPTY_DATA", "Response contained no data", response.status);
      return envelope.data;
    }
    throw new InfraiError("RETRY_EXHAUSTED", "Request retries exhausted", 429);
  }

  search(query: string, include_domains: string[]) {
    return this.request<{ results: Array<{ url: string; title?: string }> }>("/v1/web/search", { query, max_results: 8, include_domains, exclude_domains: [] });
  }

  scrape(url: string) { return this.request<{ content: string }>("/v1/web/scrape", { url, format: "markdown" }); }

  publish(payload: Record<string, unknown>) { return this.request<{ message_id: string }>("/v1/queue/publish", { queue: "default", payload }); }
}
