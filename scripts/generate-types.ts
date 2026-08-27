/**
 * Regenerates `src/generated/openapi.ts` from Atlassian's published OpenAPI 3 spec.
 *
 *   pnpm run generate:types          regenerate
 *   pnpm run generate:types:check    exit 1 if the upstream spec has changed
 *
 * The output is committed. That keeps `tsc` and `tsdown` off the network in CI, keeps a
 * 1.4 MB fetch out of `prepublishOnly`, and makes the regeneration diff the review
 * artifact when Atlassian changes something.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import openapiTS, { astToString } from "openapi-typescript";

const execFileAsync = promisify(execFile);

const SPEC_URL = "https://dac-static.atlassian.com/cloud/bitbucket/swagger.v3.json";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = resolve(ROOT, "src/generated/openapi.ts");
const META_FILE = resolve(ROOT, "src/generated/openapi.meta.json");

type Meta = {
  url: string;
  sha256: string;
  specVersion: string;
  fetchedAt: string;
};

const readMeta = async (): Promise<Meta | undefined> => {
  try {
    return JSON.parse(await readFile(META_FILE, "utf8")) as Meta;
  } catch {
    return undefined;
  }
};

const main = async (): Promise<void> => {
  const checkOnly = process.argv.includes("--check");

  console.log(`Fetching ${SPEC_URL}`);
  const response = await fetch(SPEC_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch the spec: ${response.status} ${response.statusText}`);
  }
  const body = await response.text();
  const sha256 = createHash("sha256").update(body).digest("hex");

  const previous = await readMeta();
  if (previous?.sha256 === sha256) {
    console.log(`Spec unchanged (sha256 ${sha256.slice(0, 12)}…)`);
    return;
  }

  if (checkOnly) {
    console.error(
      `::error::The Bitbucket OpenAPI spec changed.\n` +
        `  was: ${previous?.sha256 ?? "(none)"}\n` +
        `  now: ${sha256}\n` +
        `Run \`pnpm run generate:types\` and review the diff.`,
    );
    process.exit(1);
  }

  const spec = JSON.parse(body) as { info: { version: string }; paths?: unknown };
  const specVersion = spec.info.version;

  // Generate `components.schemas` only.
  //
  // The spec under-declares query parameters — `GET /pullrequests` declares `state` and
  // omits `q`, `sort`, `fields`, `page` and `pagelen`, all of which we rely on. A
  // `paths`-typed client would therefore reject correct code and force casts at every
  // real call site, so the generated `paths` object is worse than nothing here. We take
  // the schemas and hand-write the request layer on top.
  delete spec.paths;

  console.log(`Generating types from spec version ${specVersion}`);
  const ast = await openapiTS(spec as never, { alphabetize: true });
  const contents = [
    "/* eslint-disable */",
    "/**",
    " * Generated from Atlassian's Bitbucket Cloud OpenAPI 3 spec. Do not edit by hand.",
    " * Run `pnpm run generate:types` to refresh.",
    " *",
    ` * Spec version: ${specVersion}`,
    ` * Source:       ${SPEC_URL}`,
    " */",
    "",
    astToString(ast),
  ].join("\n");

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, contents, "utf8");

  // Format with oxfmt so regeneration diffs stay minimal and reviewable.
  await execFileAsync("pnpm", ["exec", "oxfmt", "--write", OUT_FILE], { cwd: ROOT });

  const meta: Meta = { url: SPEC_URL, sha256, specVersion, fetchedAt: new Date().toISOString() };
  await writeFile(META_FILE, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`Wrote ${META_FILE} (sha256 ${sha256.slice(0, 12)}…)`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
