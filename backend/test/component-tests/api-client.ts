export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type QueryParams = Record<string, string | number | boolean | undefined>;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly authorizationHeader?: string;

  constructor(baseUrl: string, authorizationHeader?: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.authorizationHeader = authorizationHeader;
  }

  get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>("GET", path, undefined, query);
  }

  post<T>(path: string, body: unknown, query?: QueryParams): Promise<T> {
    return this.request<T>("POST", path, body, query);
  }

  patch<T>(path: string, body: unknown, query?: QueryParams): Promise<T> {
    return this.request<T>("PATCH", path, body, query);
  }

  delete<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>("DELETE", path, undefined, query);
  }

  buildUrl(path: string, query?: QueryParams): string {
    return buildUrl(this.baseUrl, path, query);
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown, query?: QueryParams): Promise<T> {
    const url = this.buildUrl(path, query);
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.authorizationHeader) {
      headers.Authorization = this.authorizationHeader;
    }

    let payload: BodyInit | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: payload,
    });

    const parsedBody = await parseBody(response);

    if (!response.ok) {
      throw new ApiError(
        `Request failed: ${method} ${url} (${response.status} - ${response.statusText}): ${JSON.stringify(parsedBody)}`,
        response.status,
        parsedBody,
      );
    }

    return parsedBody as T;
  }
}

export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const normalized = normalizeBaseUrl(baseUrl);
  const trimmedPath = path.replace(/^\/+/, "");
  const url = new URL(trimmedPath, normalized);

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      params.set(key, String(value));
    }
    const queryString = params.toString();
    if (queryString) {
      url.search = queryString;
    }
  }

  return url.toString();
}

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) {
    throw new Error("API base URL is required");
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
