import { resolveAuthFromEnv } from "../auth/resolve.js";
import type { AuthStrategy } from "../auth/types.js";
import { createCloudFlavor } from "../cloud/flavor.js";
import type { Flavor } from "../flavor/types.js";
import { HttpClient, type HttpClientOptions } from "../http/http-client.js";
import type { RequestSpec } from "../http/request.js";
import type { Page, PaginateOptions } from "../pagination/paginate.js";
import { paginate, paginatePages } from "../pagination/paginate.js";

export type ClientOptions = Omit<HttpClientOptions, "auth"> & {
  /** Defaults to whatever `resolveAuthFromEnv()` finds. */
  auth?: AuthStrategy | undefined;
};

export type BitbucketClient = Flavor & {
  /** The underlying HTTP client. Powers `bb api` and any unmodelled endpoint. */
  readonly http: HttpClient;
  /** Raw request against any endpoint, with the client's auth and retry applied. */
  request<T>(spec: RequestSpec): Promise<T>;
  /** Page through any paginated endpoint, yielding items. */
  paginate<T>(spec: RequestSpec, options?: PaginateOptions): AsyncIterable<T>;
  /** Page through any paginated endpoint, yielding whole page envelopes. */
  paginatePages<T>(spec: RequestSpec, options?: PaginateOptions): AsyncIterable<Page<T>>;
};

export const createBitbucketClient = (options: ClientOptions = {}): BitbucketClient => {
  const auth = options.auth ?? resolveAuthFromEnv();
  const http = new HttpClient({ ...options, auth });
  const flavor = createCloudFlavor(http, auth);

  return {
    ...flavor,
    http,
    request: (spec) => http.request(spec),
    paginate: (spec, paginateOptions) => paginate(http, spec, paginateOptions),
    paginatePages: (spec, paginateOptions) => paginatePages(http, spec, paginateOptions),
  };
};
