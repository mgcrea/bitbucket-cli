import { collectRepeated } from "../bin/repeated.js";
import { defineBbCommand } from "../command.js";
import { UsageError } from "../errors.js";
import { resolveRepoContext } from "../git/context.js";
import type { HttpMethod, QueryInit } from "../http/request.js";
import { getRuntime } from "../runtime.js";

const splitPair = (pair: string): [string, string] => {
  const separator = pair.indexOf("=");
  if (separator === -1) {
    throw new UsageError(`Expected key=value, got ${JSON.stringify(pair)}`);
  }
  return [pair.slice(0, separator), pair.slice(separator + 1)];
};

/** `-F` coerces the way gh does: JSON scalars are parsed, everything else is a string. */
const coerce = (value: string): unknown => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
};

/**
 * Normalises an endpoint into a path this client can request.
 *
 * Accepts `/2.0/repositories/...`, `repositories/...`, or a full URL, and expands the
 * `{workspace}` / `{repo}` placeholders from the current git context so
 * `bb api '/repositories/{workspace}/{repo}/pullrequests'` works inside a clone.
 */
const normalizeEndpoint = async (raw: string, override: string | undefined): Promise<string> => {
  let endpoint = raw;

  if (endpoint.includes("{workspace}") || endpoint.includes("{repo}")) {
    const context = await resolveRepoContext(
      override === undefined || override === "" ? {} : { override },
    );
    endpoint = endpoint
      .replaceAll("{workspace}", context.workspace)
      .replaceAll("{repo}", context.repository)
      .replaceAll("{slug}", context.repository);
  }

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const withSlash = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return withSlash.startsWith("/2.0/") ? withSlash.slice(4) : withSlash;
};

export default defineBbCommand<unknown>({
  meta: { name: "api", description: "Make an authenticated request to any Bitbucket endpoint" },
  args: {
    endpoint: { type: "positional", description: "Path or URL", required: true },
    method: {
      type: "string",
      alias: "X",
      description: "HTTP method (default GET, or POST with fields)",
    },
    "raw-field": {
      type: "string",
      alias: "f",
      description: "String parameter. Body on a write, query string on -X GET (repeatable)",
    },
    field: {
      type: "string",
      alias: "F",
      description: "Typed parameter: true/false/null and integers are parsed (repeatable)",
    },
    header: { type: "string", alias: "H", description: "Add a request header (repeatable)" },
    paginate: { type: "boolean", description: "Follow `next` until the result set is exhausted" },
    flatten: { type: "boolean", description: "With --paginate, concatenate every page's values" },
    limit: { type: "string", description: "With --paginate, stop after this many items" },
  },
  examples: [
    "bb api /repositories/{workspace}/{repo}/pullrequests",
    "bb api /repositories/{workspace}/{repo}/pullrequests -X GET -f 'q=state=\"MERGED\"'",
    "bb api /user --jq .display_name",
    "bb api '/repositories/acme/api/pullrequests' --paginate --flatten",
  ],
  async run({ args }) {
    const bb = await getRuntime().client();
    const endpoint = await normalizeEndpoint(
      String(args["endpoint"]),
      args["repo"] as string | undefined,
    );

    // Read from argv rather than the parsed args: citty collapses a repeated flag to
    // its last value, which would silently drop every parameter but one.
    const { rawArgs } = getRuntime();
    const rawFields = collectRepeated(rawArgs, ["f", "raw-field"]).map(splitPair);
    const typedFields = collectRepeated(rawArgs, ["F", "field"]).map(splitPair);
    const headers = Object.fromEntries(
      collectRepeated(rawArgs, ["H", "header"]).map((header) => {
        const separator = header.indexOf(":");
        if (separator === -1) {
          throw new UsageError(`Expected a header as name:value, got ${JSON.stringify(header)}`);
        }
        return [header.slice(0, separator).trim(), header.slice(separator + 1).trim()];
      }),
    );

    const hasFields = rawFields.length > 0 || typedFields.length > 0;
    const method = ((args["method"] as string | undefined) ??
      (hasFields ? "POST" : "GET")) as HttpMethod;

    // Following gh: parameters imply a write unless the method is stated. On an
    // explicit -X GET they become query parameters instead of a body.
    const isRead = method === "GET" || method === "HEAD";
    const query: QueryInit = isRead ? Object.fromEntries([...rawFields, ...typedFields]) : {};
    const body = isRead
      ? undefined
      : Object.fromEntries([
          ...rawFields,
          ...typedFields.map(([key, value]) => [key, coerce(value)] as const),
        ]);

    if (args["paginate"] === true) {
      const limit = args["limit"] === undefined ? undefined : Number(args["limit"]);
      const spec = { method, path: endpoint, query, headers };
      if (args["flatten"] === true) {
        const values: unknown[] = [];
        for await (const item of bb.paginate<unknown>(spec, limit === undefined ? {} : { limit })) {
          values.push(item);
        }
        return {
          kind: "data",
          data: values,
          render: (rows, io) => io.out(JSON.stringify(rows, null, 2)),
        };
      }
      const pages: unknown[] = [];
      for await (const page of bb.paginatePages<unknown>(
        spec,
        limit === undefined ? {} : { limit },
      )) {
        pages.push(page);
      }
      return {
        kind: "data",
        data: pages,
        render: (rows, io) => {
          for (const page of rows) {
            io.out(JSON.stringify(page, null, 2));
          }
        },
      };
    }

    const data = await bb.request<unknown>({
      method,
      path: endpoint,
      query,
      headers,
      ...(body === undefined ? {} : { body }),
    });

    return {
      kind: "data",
      data: [data],
      single: true,
      render: ([only], io) => io.out(JSON.stringify(only, null, 2)),
    };
  },
});
