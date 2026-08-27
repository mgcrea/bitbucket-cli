import { createAnonymousAuth } from "../auth/anonymous.js";
import type { AuthStrategy } from "../auth/types.js";
import { BASE_URL, DEFAULT_TIMEOUT_MS } from "./const.js";
import { createDebug, redact } from "./debug.js";
import {
  type BitbucketErrorEnvelope,
  NetworkError,
  ResponseParseError,
  TimeoutError,
  errorForStatus,
} from "./errors.js";
import { type RateLimitSnapshot, parseRateLimit } from "./rate-limit.js";
import { type RequestSpec, buildUrl } from "./request.js";
import {
  DEFAULT_RETRY,
  type RetryOptions,
  computeDelay,
  isRetryableMethod,
  parseRetryAfter,
  shouldRetryStatus,
} from "./retry.js";

export type RequestEvent = { method: string; url: string; attempt: number };
export type ResponseEvent = { method: string; url: string; status: number; attempt: number };
export type RetryEvent = ResponseEvent & { delayMs: number; reason: "status" | "network" };

export type HttpClientOptions = {
  baseUrl?: string;
  auth?: AuthStrategy;
  /** Injection seam for tests. */
  fetchImpl?: typeof fetch;
  /** Per attempt, not per request. */
  timeoutMs?: number;
  retry?: Partial<RetryOptions>;
  userAgent?: string;
  onRequest?: (event: RequestEvent) => void;
  onResponse?: (event: ResponseEvent) => void;
  onRetry?: (event: RetryEvent) => void;
  onRateLimit?: (snapshot: RateLimitSnapshot) => void;
};

const debug = createDebug("api");

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(signal.reason as Error);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason as Error);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

export class HttpClient {
  readonly baseUrl: string;
  readonly auth: AuthStrategy;
  #fetch: typeof fetch;
  #timeoutMs: number;
  #retry: RetryOptions;
  #userAgent: string;
  #options: HttpClientOptions;
  #rateLimit: RateLimitSnapshot | undefined;

  constructor(options: HttpClientOptions = {}) {
    this.#options = options;
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.auth = options.auth ?? createAnonymousAuth();
    this.#fetch = options.fetchImpl ?? globalThis.fetch;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#retry = { ...DEFAULT_RETRY, ...options.retry };
    this.#userAgent = options.userAgent ?? "bb (+https://github.com/mgcrea/bitbucket-cli)";
  }

  /** Last-seen rate-limit headers. Often undefined — they are not always sent. */
  get rateLimit(): RateLimitSnapshot | undefined {
    return this.#rateLimit;
  }

  withOptions(patch: Partial<HttpClientOptions>): HttpClient {
    return new HttpClient({ ...this.#options, ...patch });
  }

  async request<T>(spec: RequestSpec): Promise<T> {
    return (await this.requestWithResponse<T>(spec)).data;
  }

  async requestText(spec: RequestSpec): Promise<string> {
    const { response } = await this.#send({ ...spec, accept: "text" });
    return response.text();
  }

  /**
   * Keeps the `Response` alongside the parsed body.
   *
   * Needed because a pull-request merge returns either 200 with the merged PR or 202
   * with a `Location` pointing at a task to poll. Discarding the response would force a
   * parallel code path for that one endpoint.
   */
  async requestWithResponse<T>(spec: RequestSpec): Promise<{ data: T; response: Response }> {
    const { response } = await this.#send(spec);

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return { data: undefined as T, response };
    }
    const text = await response.text();
    if (text === "") {
      return { data: undefined as T, response };
    }
    try {
      return { data: JSON.parse(text) as T, response };
    } catch (cause) {
      throw new ResponseParseError(
        `Expected JSON from ${spec.method ?? "GET"} ${redact(buildUrl(spec, this.baseUrl))}`,
        { cause },
      );
    }
  }

  async #send(spec: RequestSpec): Promise<{ response: Response }> {
    const method = spec.method ?? "GET";
    const url = buildUrl(spec, this.baseUrl);
    const idempotent = spec.idempotent ?? false;
    let lastError: unknown;

    for (let attempt = 0; attempt < this.#retry.maxAttempts; attempt += 1) {
      // A fresh timeout signal per attempt; the caller's signal spans all of them.
      const timeout = AbortSignal.timeout(spec.timeoutMs ?? this.#timeoutMs);
      const signal = spec.signal === undefined ? timeout : AbortSignal.any([spec.signal, timeout]);

      const authHeaders = await this.auth.authorize({ method, url });
      const headers = new Headers({
        accept: spec.accept === "text" ? "text/plain, */*" : "application/json",
        "user-agent": this.#userAgent,
        ...authHeaders,
        ...spec.headers,
      });
      if (spec.body !== undefined) {
        headers.set("content-type", "application/json");
      }

      this.#options.onRequest?.({ method, url, attempt });
      debug(`→ ${method} ${url}`);

      let response: Response;
      try {
        response = await this.#fetch(url, {
          method,
          headers,
          ...(spec.body === undefined ? {} : { body: JSON.stringify(spec.body) }),
          signal,
          redirect: "follow",
        });
      } catch (cause) {
        // Distinguish the caller's abort from our own timeout: the caller's must not be
        // retried, and must surface as their abort rather than as a network failure.
        if (spec.signal?.aborted === true) {
          throw spec.signal.reason as Error;
        }
        lastError =
          timeout.aborted === true
            ? new TimeoutError(`${method} ${redact(url)} timed out`, { cause })
            : new NetworkError(`${method} ${redact(url)} failed`, { cause });

        if (lastError instanceof TimeoutError || attempt === this.#retry.maxAttempts - 1) {
          throw lastError;
        }
        const delayMs = computeDelay(attempt, this.#retry);
        this.#options.onRetry?.({ method, url, status: 0, attempt, delayMs, reason: "network" });
        debug(`retrying after network error in ${delayMs}ms`);
        await sleep(delayMs, spec.signal);
        continue;
      }

      const snapshot = parseRateLimit(response.headers);
      if (snapshot !== undefined) {
        this.#rateLimit = snapshot;
        this.#options.onRateLimit?.(snapshot);
      }
      this.#options.onResponse?.({ method, url, status: response.status, attempt });
      debug(`← ${response.status} ${method} ${url}`);

      if (response.ok) {
        return { response };
      }

      // A 401 may just mean an expired token; give the strategy one chance to refresh.
      if (response.status === 401 && attempt === 0 && (await this.auth.invalidate())) {
        debug("credential invalidated after 401, retrying once");
        continue;
      }

      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      const canRetry =
        attempt < this.#retry.maxAttempts - 1 &&
        shouldRetryStatus(response.status, this.#retry) &&
        isRetryableMethod(method, response.status, idempotent) &&
        (retryAfterMs === undefined || retryAfterMs <= this.#retry.maxRetryAfterMs);

      if (!canRetry) {
        const envelope = await this.#readEnvelope(response);
        const requestId = response.headers.get("x-request-id");
        throw errorForStatus(
          {
            status: response.status,
            method,
            url: redact(url),
            ...(envelope === undefined ? {} : { envelope }),
            ...(requestId === null ? {} : { requestId }),
            ...(snapshot === undefined ? {} : { rateLimit: snapshot }),
          },
          retryAfterMs,
        );
      }

      const delayMs = computeDelay(attempt, this.#retry, retryAfterMs);
      this.#options.onRetry?.({
        method,
        url,
        status: response.status,
        attempt,
        delayMs,
        reason: "status",
      });
      debug(`retrying ${response.status} in ${delayMs}ms`);
      await sleep(delayMs, spec.signal);
    }

    throw lastError ?? new NetworkError(`${method} ${redact(url)} exhausted retries`);
  }

  /**
   * Tolerant on purpose: error bodies in the wild include HTML gateway pages, empty
   * bodies, and `{"type":"error"}` with no `error` key.
   */
  async #readEnvelope(response: Response): Promise<BitbucketErrorEnvelope | undefined> {
    try {
      const text = await response.text();
      if (text === "") {
        return undefined;
      }
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null && "type" in parsed) {
        return parsed as BitbucketErrorEnvelope;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
}
