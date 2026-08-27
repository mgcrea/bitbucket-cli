# @mgcrea/bitbucket-cli

A Bitbucket equivalent of GitHub's `gh` — shipped as both a typed Bitbucket Cloud
client and the `bb` command-line tool.

> Status: early development. Nothing is published yet.

## Why

Atlassian's own `acli` does not cover Bitbucket, and the TypeScript ecosystem has no
maintained Bitbucket CLI. This aims to be a `gh`-shaped tool for Bitbucket Cloud that
is also importable as a library.

Three things here that `gh` and the existing Go CLIs do not have:

- **Server-side field projection.** Bitbucket's `fields=` parameter lets the server do
  the projection, so `bb pr list --json id,title` transfers a fraction of the payload.
  `gh` cannot do this — GitHub's REST API has no partial-response parameter.
- **`--jq` and `--template`**, with `gh`'s helper set, and no `jq` required on `PATH`.
- **An importable typed client**, which a Go binary structurally cannot offer.

## Notes on the Bitbucket API

Two things surprise people coming from `gh`:

- **There is no `bb issue`.** Atlassian removed the Bitbucket issue tracker API — the
  endpoints return HTTP 410 and the schema is gone from the published OpenAPI spec.
  There is no replacement short of Jira. `bb issue` exists only as an explicit error.
- **App passwords are gone** (removed 28 Jul 2026). Authentication is via Atlassian API
  tokens, resource access tokens, or OAuth 2.0. Bitbucket has no device-code grant, so
  `bb auth login` on a headless machine means pasting a token.

## Development

```bash
pnpm install
pnpm run test     # lint && check && spec && format:check
pnpm run build
```

`pnpm run generate:types` regenerates `src/generated/openapi.ts` from Atlassian's
published spec. The output is committed so CI never hits the network.

## License

MIT
