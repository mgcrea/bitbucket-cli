import { DEFAULT_PAGE_LEN, MAX_PAGE_LEN, MAX_PAGES, MIN_PAGE_LEN } from "../http/const.js";
import { createDebug } from "../http/debug.js";
import type { HttpClient } from "../http/http-client.js";
import { type RequestSpec, assertSameOrigin } from "../http/request.js";

/**
 * Bitbucket returns two different envelope shapes.
 *
 * List-based endpoints send `size`, `page` and `previous`. Iterator-based ones — most
 * notably `/commits` — send only `values`, `pagelen` and a `next` carrying an opaque
 * cursor. Atlassian documents that only `values` and `next` are guaranteed, so nothing
 * here may depend on the rest.
 */
export type Page<T> = {
  values: T[];
  /** Opaque absolute URL. The only reliable termination signal. */
  next?: string | undefined;
  /** Absent on several endpoints. Never depend on it. */
  size?: number | undefined;
  page?: number | undefined;
  pagelen?: number | undefined;
  previous?: string | undefined;
};

export type PageMeta = {
  index: number;
  count: number;
  /** Only when the endpoint returned `size`. */
  total?: number | undefined;
  hasNext: boolean;
};

export type PaginateOptions = {
  /** Stop after this many items in total. */
  limit?: number | undefined;
  /** Requested page size, clamped to Bitbucket's [10, 100]. */
  pageSize?: number | undefined;
  signal?: AbortSignal | undefined;
  maxPages?: number | undefined;
  onPage?: ((meta: PageMeta) => void) | undefined;
};

const debug = createDebug("paginate");

const clampPageLen = (value: number | undefined): number | undefined =>
  value === undefined ? undefined : Math.min(MAX_PAGE_LEN, Math.max(MIN_PAGE_LEN, value));

export async function* paginatePages<T>(
  http: HttpClient,
  spec: RequestSpec,
  options: PaginateOptions = {},
): AsyncGenerator<Page<T>> {
  const { limit, pageSize, signal, maxPages = MAX_PAGES, onPage } = options;

  // Shrink the first page when the caller wants fewer items than a default page holds,
  // so `--limit 1` does not pull fifty rows. `pagelen` is only ever set on the first
  // request: `next` already carries it, along with q/sort/fields and any opaque cursor.
  const requested = clampPageLen(
    limit !== undefined && limit < (pageSize ?? DEFAULT_PAGE_LEN) ? limit : pageSize,
  );
  let request: RequestSpec | undefined =
    requested === undefined ? spec : { ...spec, query: { ...spec.query, pagelen: requested } };

  let yielded = 0;
  for (let index = 0; request !== undefined && index < maxPages; index += 1) {
    const page: Page<T> = await http.request<Page<T>>(
      signal === undefined ? request : { ...request, signal },
    );
    const values = Array.isArray(page.values) ? page.values : [];
    const next = typeof page.next === "string" && page.next.length > 0 ? page.next : undefined;

    // A full page with no `next` almost always means a `fields` projection stripped the
    // `next` key, which truncates the result set silently. Loud in debug only, because
    // it is also legitimately the last page when the count divides exactly.
    if (next === undefined && requested !== undefined && values.length === requested) {
      debug("page was full but carried no `next` — check the fields projection");
    }

    onPage?.({ index, count: values.length, total: page.size, hasNext: next !== undefined });
    yield { ...page, values, next };

    yielded += values.length;
    if (limit !== undefined && yielded >= limit) {
      return;
    }
    // Followed verbatim. Never parsed and rebuilt, never given a `page=`: on
    // iterator-based endpoints it carries a cursor we cannot reconstruct.
    request =
      next === undefined
        ? undefined
        : { method: "GET", path: assertSameOrigin(next, http.baseUrl) };
  }
}

export async function* paginate<T>(
  http: HttpClient,
  spec: RequestSpec,
  options: PaginateOptions = {},
): AsyncGenerator<T> {
  const { limit } = options;
  let count = 0;
  for await (const page of paginatePages<T>(http, spec, options)) {
    for (const value of page.values) {
      yield value;
      count += 1;
      // Terminating inside the item loop is what stops the HTTP chain: the generator's
      // `return()` runs, so no further page is ever requested.
      if (limit !== undefined && count >= limit) {
        return;
      }
    }
  }
}
