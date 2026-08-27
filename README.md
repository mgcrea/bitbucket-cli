# @mgcrea/bitbucket-cli

A Bitbucket equivalent of GitHub's `gh` — shipped as both a typed Bitbucket Cloud
client and the `bb` command-line tool.

> Early development. Not published yet.

## Why

Atlassian's own `acli` does not cover Bitbucket, and there is no maintained Bitbucket
CLI in the TypeScript ecosystem. Three things here that the alternatives do not have:

**Server-side field projection.** Bitbucket's `fields=` parameter lets the server do the
projection, so `bb pr list --json id,title` asks for exactly two fields and transfers a
fraction of the payload. **`gh` cannot do this** — GitHub's REST API has no
partial-response parameter, so it fetches whole objects and discards most of them
client-side.

```console
$ bb pr list --json id,title
# GET .../pullrequests?fields=next,page,pagelen,size,values.id,values.title
```

**`--jq` and `--template`**, with `gh`'s helper set and no `jq` required on `PATH`.

**An importable typed client**, which a Go binary structurally cannot offer.

## Usage

```bash
# Authenticate. The token is read from stdin only — never argv, which leaks to `ps`,
# shell history and CI logs.
bb auth login --with-token --email you@example.com < token.txt
bb auth status

# Pull requests
bb pr list
bb pr list --state all --limit 50
bb pr view 42
bb pr diff 42 --patch | git apply

# Repositories
bb repo list --workspace acme
bb repo view acme/api

# Any endpoint at all
bb api /repositories/{workspace}/{repo}/pullrequests --paginate --flatten
```

### Output

Every list command speaks four formats. Piped output is TSV with no header, no padding
and no colour, so it composes with ordinary shell tools:

```bash
bb pr list | awk -F'\t' '{print $1}'          # ids
bb pr list --json                              # list the available fields
bb pr list --json id,title --jq '.[] | .title'
bb pr list --template '{{range .}}{{tablerow .id .title}}{{end}}{{tablerender}}'
```

`--jq` runs real jq 1.8.2 compiled to WebAssembly, loaded only when you actually use it.
`--template` implements a subset of Go's `text/template` with `gh`'s helper set, so
existing `gh --template` snippets paste in unchanged.

### As a library

```ts
import { createBitbucketClient } from "@mgcrea/bitbucket-cli";

const bb = createBitbucketClient();
for await (const pr of bb.pullRequests.list({ workspace: "acme", repository: "api", limit: 20 })) {
  console.log(pr.id, pr.title);
}
```

Resources return async iterables, so `break` genuinely stops the HTTP chain —
`--limit 5` costs one request, not forty.

### Environment

`BB_TOKEN` · `BB_EMAIL` · `BB_ACCESS_TOKEN` · `BB_TOKEN_TYPE` · `BB_REPO` ·
`BB_WORKSPACE` · `BB_CONFIG_DIR` · `BB_API_BASE_URL` · `BB_DEBUG=api` ·
`BB_FORCE_TTY` · `NO_COLOR`. The `BITBUCKET_*` spellings work as aliases.

An environment credential always wins over a stored one and is never written to disk,
which is what makes CI work with no setup step.

## Two things that will surprise you

**There is no `bb issue`.** Atlassian removed the Bitbucket issue tracker API — the
endpoints return HTTP 410 and the schema is gone from the published OpenAPI spec. There
is no replacement short of Jira. `bb issue` exists only to say so, because "unknown
command" would send you looking for a flag you did not get wrong.

**App passwords are gone** (removed 28 July 2026). Authentication is via Atlassian API
tokens, resource access tokens, or OAuth 2.0. Two consequences:

- Create your token at
  [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens) and
  **select "Bitbucket" as the app** — a plain unscoped Atlassian token authenticates but
  is rejected by the Bitbucket API.
- Bitbucket has **no device-code grant**, so there is no `gh auth login`-style browser
  flow on a headless machine. Pasting a token is the path.

Note also that repository, project and workspace access tokens are not tied to an
Atlassian account, so `GET /user` fails for them. `bb` detects this before making a
request and tells you which commands are unavailable rather than surfacing a 401.

## Credential storage

Credentials live in `~/.config/bb/hosts.yml` at mode `0600`, the same as `gh`. Stated
plainly: that keeps the token out of a screenshare and out of a dotfile sync, and does
nothing against a local attacker. An "encrypted" file whose key is derivable on the same
machine would be obfuscation dressed as security, so this does not offer one. OS
keychain support is planned as an opt-in.

## Development

```bash
pnpm install
pnpm run test     # lint && check && spec && format:check
pnpm run build
```

### Running the working tree as `bb`

```bash
make install      # build, then symlink dist/bin/cli.cjs onto your PATH
make link-status  # show where `bb` currently resolves
make uninstall    # remove the symlink
```

`pnpm run install:local` does the same thing if you would rather not use make.

The link points at `dist/bin/cli.cjs`, so `pnpm run build` is enough to pick up a
change — no relink needed. It installs to `$(npm prefix -g)/bin` by default, because
pnpm's global bin directory is often absent from `PATH` until you run `pnpm setup`.
Override it if you keep binaries elsewhere:

```bash
make install BIN_DIR=~/.local/bin
```

`install` refuses to overwrite anything that is not a symlink, and `uninstall` refuses
to remove a symlink pointing somewhere other than this checkout.

`pnpm run generate:types` regenerates `src/generated/openapi.ts` from Atlassian's
published spec. The output is committed so CI never hits the network, and drift is
checked on a weekly cron rather than in PR CI — an upstream edit should not redden an
unrelated pull request.

## License

MIT
