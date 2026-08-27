# @mgcrea/bitbucket-cli

`bb` — a Bitbucket CLI in the shape of GitHub's `gh`, plus the typed Bitbucket Cloud
client it is built on.

```console
$ bb pr list
ID  TITLE                     BRANCH             STATE
42  Add OAuth support         feature/oauth      OPEN
39  Cache workspace lookups   perf/ws-cache      OPEN
12  Fix pagination edge case  fix/pagination     MERGED
```

## Why this exists

Atlassian ships a first-party CLI, `acli`, and it covers Jira but **not Bitbucket**.
The TypeScript ecosystem has no maintained Bitbucket CLI either. Three things here that
the alternatives don't have:

**Server-side field projection.** Bitbucket's `fields=` parameter lets the *server* do
the projection, so `bb repo list --json fullName,isPrivate` asks for two fields and gets
two fields. `gh` structurally cannot do this — GitHub's REST API has no partial-response
parameter, so it fetches whole objects and throws most of them away client-side.
Measured against a real workspace, listing 50 repositories:

| | bytes over the wire |
|---|---|
| unprojected | 162,330 |
| `--json fullName,isPrivate` | 3,683 |

**44x less data, identical output.**

**`--jq` and `--template`** with `gh`'s helper set, and no `jq` binary required.

**An importable typed client** — something a Go binary cannot offer.

## Install

Not published yet. To run the working tree:

```bash
pnpm install
make install          # builds, then symlinks `bb` onto your PATH
```

`make uninstall` removes it, `make link-status` shows where `bb` resolves. See
[Development](#development) for details.

## Getting started

```bash
bb auth login
```

Prompts for everything, including the part that trips people up — Bitbucket needs an
API token **created with scopes**, not the classic unscoped kind. For CI, pipe it:

```bash
bb auth login --with-token --email you@example.com < token.txt
# or skip storage entirely and just set BB_TOKEN + BB_EMAIL
```

Then:

```bash
bb workspace list                 # which workspaces your token can reach
bb repo list -W acme
bb pr list
bb pr view 42
bb pr diff 42 --patch | git apply
bb pipeline list
```

## Commands

| | |
|---|---|
| `bb auth` | `login` · `logout` · `status` |
| `bb pr` | `list` · `view` · `diff` |
| `bb repo` | `list` · `view` |
| `bb workspace` | `list` |
| `bb pipeline` | `list` · `view` · `log` |
| `bb api` | any endpoint, with `--paginate` / `--flatten` |

Everything not wrapped yet is reachable through `bb api`:

```bash
bb api /repositories/{workspace}/{repo}/pullrequests --paginate --flatten
bb api /user --jq .display_name
```

`{workspace}` and `{repo}` resolve from your git remote.

## Output

Every list command speaks four formats, and **piped output is TSV** — no header, no
padding, no colour, no truncation — so it composes with ordinary shell tools:

```bash
bb pr list | awk -F'\t' '{print $1}'                   # just the ids
bb pr list --json                                       # discover the field names
bb pr list --json id,title --jq '.[] | "\(.id) \(.title)"'
bb pr list --template '{{range .}}{{tablerow .id .title}}{{end}}{{tablerender}}'
```

`--jq` runs real jq 1.8.2 compiled to WebAssembly, loaded only when you use it.
`--template` implements a subset of Go's `text/template` with `gh`'s helpers —
`tablerow`, `tablerender`, `timeago`, `truncate`, `color`, `autocolor`, `hyperlink`,
`join`, `pluck`, `timefmt`, plus the usual builtins — so existing `gh --template`
snippets paste in and work.

`--jq` and `--template` imply `--json`, so you rarely need both.

## As a library

```ts
import { createBitbucketClient } from "@mgcrea/bitbucket-cli";

const bb = createBitbucketClient();

for await (const pr of bb.pullRequests.list({ workspace: "acme", repository: "api", limit: 20 })) {
  console.log(pr.id, pr.title);
}
```

Resources return async iterables, so `break` genuinely stops the HTTP chain — `limit: 5`
costs one request, not forty. Auth, retry with jitter, rate-limit parsing and the
two pagination envelope shapes are all handled underneath.

## Environment

| | |
|---|---|
| `BB_TOKEN` `BB_EMAIL` `BB_TOKEN_TYPE` | credential; always wins over stored, never written to disk |
| `BB_ACCESS_TOKEN` | repository/project/workspace access token |
| `BB_REPO` `BB_WORKSPACE` | override the git-remote inference |
| `BB_CONFIG_DIR` `BB_API_BASE_URL` | config location, API root |
| `BB_DEBUG=api` | request tracing on stderr |
| `BB_FORCE_TTY` `NO_COLOR` | force or suppress terminal rendering |

`BITBUCKET_*` works as an alias throughout. Because an environment credential is never
persisted, CI needs no setup step.

## Three things that will surprise you

**There is no `bb issue`.** Atlassian removed the Bitbucket issue tracker API — the
endpoints return HTTP 410 and the schema is gone from the published OpenAPI spec. There
is no replacement short of Jira. `bb issue` exists only to say so, because "unknown
command" would send you hunting for a flag you didn't get wrong.

**App passwords are gone** (removed 28 July 2026). Use an Atlassian API token created at
[id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens) via
**"Create API token with scopes"**, selecting Bitbucket as the app. A plain unscoped
token authenticates but every Bitbucket call fails with *"API Token provided has no
Bitbucket scopes"*. Bitbucket also has **no device-code grant**, so there is no
browser-based login on a headless box — pasting a token is the path.

**Every listing is workspace-scoped.** `GET /workspaces` and the cross-workspace
`GET /repositories` were both removed under CHANGE-2770, which is why `bb repo list`
requires `-W` and why `bb workspace list` exists at all.

Also worth knowing: repository, project and workspace access tokens are not tied to an
Atlassian account, so `GET /user` fails for them. `bb` detects that before making a
request and tells you which commands are unavailable instead of surfacing a bare 401.

## Credential storage

Credentials live in `~/.config/bb/hosts.yml` at mode `0600`, written atomically — the
same as `gh`. Plainly: that keeps the token out of a screenshare and out of a dotfile
sync, and does nothing against a local attacker. An "encrypted" file whose key is
derivable on the same machine is obfuscation dressed as security, so this doesn't ship
one. OS keychain support is planned as an opt-in, and will be described just as
honestly.

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

`pnpm run install:local` does the same without make. The link points at
`dist/bin/cli.cjs`, so `pnpm run build` alone picks up a change — no relink. It installs
to `$(npm prefix -g)/bin`, because pnpm's global bin directory is often missing from
`PATH` until `pnpm setup` has been run. Override with `make install BIN_DIR=~/.local/bin`.

`install` refuses to overwrite anything that isn't a symlink, and `uninstall` refuses to
remove a symlink pointing outside this checkout.

### Generated types

`pnpm run generate:types` regenerates `src/generated/openapi.ts` from Atlassian's
published spec. The output is committed so CI never hits the network, and drift is
checked on a weekly cron rather than in PR CI — an upstream edit shouldn't redden an
unrelated pull request.

Only `components.schemas` is generated. The spec under-declares query parameters
(`GET /pullrequests` omits `q`, `sort`, `fields`, `page` and `pagelen`), so a
`paths`-typed client would reject correct code.

## Not there yet

`pr create` · `pr checkout` · `pr merge` · `pr review` · `repo clone` · `browse` ·
`completion` · aliases · extensions · OAuth login · Data Center support.

The client is designed behind a resource-level flavor interface so Data Center can be
added without a rewrite, but only Bitbucket Cloud is implemented.

## License

MIT
