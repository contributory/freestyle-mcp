/**
 * Thin REST client for the Freestyle API.
 *
 * Base URL: https://api.freestyle.sh
 * Auth:     `Authorization: Bearer <FREESTYLE_API_KEY>`
 *
 * Endpoints are documented at https://www.freestyle.sh/docs and mirrored in
 * the `freestyle` npm package (https://www.npmjs.com/package/freestyle).
 */

export const FREESTYLE_API_BASE = "https://api.freestyle.sh";

/** Options for a single API request. */
export interface RequestOptions {
  /** Path parameters, e.g. `{ vm_id }` -> the value. */
  params?: Record<string, string>;
  /** Query string parameters (null/undefined values are skipped). */
  query?: Record<string, unknown>;
  /** JSON request body. */
  body?: unknown;
}

/** A Freestyle API error, with the HTTP status and server-provided message. */
export class FreestyleApiError extends Error {
  status: number;
  traceId?: string;

  constructor(status: number, message: string, traceId?: string) {
    super(message);
    this.name = "FreestyleApiError";
    this.status = status;
    this.traceId = traceId;
  }
}

export class FreestyleClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = FREESTYLE_API_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /** Build the full URL, substituting path params and appending the query. */
  private buildUrl(
    path: string,
    params?: Record<string, string>,
    query?: Record<string, unknown>,
  ): string {
    let url = path;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
      }
    }
    if (query) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }
    return this.baseUrl + url;
  }

  private async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.params, options.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const traceId = res.headers.get("x-freestyle-trace-id") ?? undefined;
      let message = await res.text();
      try {
        const data = JSON.parse(message);
        message = data.error ?? data.message ?? message;
      } catch {
        // Not JSON — keep the raw text.
      }
      if (res.status === 401) {
        message += " (Your Freestyle API key may be invalid.)";
      }
      throw new FreestyleApiError(res.status, message, traceId);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, options);
  }

  put<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }
}