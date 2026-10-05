# CLAUDE.md

Instructions for an agent working in this repository. Adapted on 5 Oct 2026 from the owner's
user-global rules (a digest of the ones that apply to a repo) and his new-repo convention kit.

## What this repo is

A parametric, 3D-printable panel system that closes off the part of a window left open
around something that stops the window closing: a window air conditioner, an exhaust fan, a
hose. The design is still being worked out with the owner.

- **`docs/status.md` is the plan and status document.** Read it first. It holds every decision
  made so far (with its question ID) and every open question. Keep it current as work lands.
- `PROJECT.yml` is this repo's entry in the owner's project ledger (schema: `SCHEMA.md` in
  project-ledger). `.repo-status` is the publish decision. They are separate on purpose:
  project status is a property of the work, publish status a property of the repository.

## Working style

- **Never assume.** The owner asked explicitly for questions instead of assumptions. If a
  requirement is ambiguous, ask; a wrong assumption acted on costs more than a question.
- **Never assume a step is done** unless the owner said he did it. A manual step handed off
  (a setting, a web wizard, a purchase) stays pending until he confirms.
- **Answer the question; only an action needs confirmation.** Asked for a view or a
  recommendation, give it. Still ask before changing state on a host, buying anything, pushing
  to a public remote, deleting, or anything outward-facing.
- **Give every question an ID** of the form `[A-Z][number]` (Q1, Q2 ...), written as a label
  (`- **Q3.** ...`), never as a Markdown ordered-list marker. An open question keeps its ID; a new
  one takes the next free ID (see `docs/status.md`); say when one is closed. If answer numbers do
  not fit, assume they follow the numbering the owner saw, and state the mapping used.

## Units

- **Metric only**: mm, g and kg, L. **Every temperature in °C**, in chat, docs, commit messages,
  code comments and output. When a source quotes Fahrenheit, convert and state only °C.

## Engineering practices

The owner's practices are in the `AlonRR/engineering-practices` repository. Read them from
outside this tree; do not vendor them in. The ones that bite most often here:

- **Find and run the existing checks first**, unchanged, for a baseline; run them again before
  saying done. Confirm what a runner actually collects.
- **A behaviour change gets a failing test first**: show it failing, then implement.
- **Every gate needs a positive control**, and a result needs its denominator ("22 cases run,
  22 passed", never just "passed"). A check you wrote that confirms exactly what you expected is
  not yet evidence.
- **Verify before asserting.** Mark claims `(verified: <how>)`, `(inferred)` or `(relayed)`.

## Python

- **`uv` for every environment and package operation** (`uv venv`, `uv run`, `uv tool install`),
  never pip. Declare dependencies in `pyproject.toml` so the environment rebuilds from the repo.

## Output layout

- **Related artefacts get one parent folder**, never N siblings in a shared folder such as the
  repo root (`exports/<stamp>/`, not `export-<stamp>/`). Fix the producer, not just the layout.
  Grep for consumers before moving anything.

## Session limits

- **Assume the session can end at any moment.** Durable means committed and pushed.
- **Commit and push at coherent checkpoints** (checks green), not one commit at the end. A
  half-broken committed state is worse than an uncommitted one.

## Git

- **A branch and a pull request per backlog item** (owner's decision Q29, replacing Q2's
  commits straight to `main`). Name the branch `<type>/<backlog-key>`, e.g. `feat/page-skeleton`.
  The pull request uses `.github/pull_request_template.md`, says `Closes #<issue>`, and is merged
  only with CI green. **The agent merges it once CI is green** (Q30); documentation-only
  changes go through a pull request too.
- **Merge by fast-forwarding `main` to the pull request's head and pushing `main`**, never
  with GitHub's merge button or API: those make `GitHub <noreply@github.com>` the committer,
  which the identity check refuses (inferred from PR #44's test merge, which had that
  committer and failed the check). If `main` has moved, merge it into the branch locally
  first, wait for CI on the new head, then fast-forward. GitHub then marks the pull request
  merged (verified on PR #44, 5 Oct 2026: `merged: true` once `main` reached its head).
- **Backlog as GitHub issues** (Q29): each row of `docs/backlog.md` has an issue. The file is the
  ranked overview and the issue holds the work; when a priority or estimate changes, change both.
- **Versions** (Q29): Semantic Versioning, first tag `v0.1.0` when the MVP is complete. Record
  changes in `CHANGELOG.md` under Unreleased. Tags are annotated, `vX.Y.Z`, each with a GitHub
  release. **The agent tags a release at each planned milestone** (Q30), e.g. `v0.1.0` when
  every MVP issue is closed.
- **Identity: author AND committer are
  `Alon A. Rabinowitz <45129051+AlonRR@users.noreply.github.com>`.** A cloud session's default
  identity is wrong for this repo. In a cloud session, `.claude/hooks/session-start.sh` sets it
  up at session start, installs the tools and wires the hooks (owner's decision, Q19); check
  with `git config --get user.email`. Verified 5 Oct 2026 in a session opened on this repo
  alone (Q23). A session that holds several repositories has a parent folder as its project
  directory, and there the hook did not fire (inferred cause);
  run it by hand with
  `CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/session-start.sh` from the
  repo root. Anywhere else, before the first commit in a fresh clone:

  ```bash
  git config user.name  "Alon A. Rabinowitz"
  git config user.email "45129051+AlonRR@users.noreply.github.com"
  git config hooks.expectName  "Alon A. Rabinowitz"
  git config hooks.expectEmail "45129051+AlonRR@users.noreply.github.com"
  git config user.useConfigOnly true
  uv tool install pre-commit && pre-commit install
  ```

  Rebase and amend set the committer separately; check both with
  `git log --format='%an <%ae> | %cn <%ce>'`.
- **Signing (Q77).** In a cloud session the startup hook signs commits with the owner's
  dedicated key when the environment holds `WINDOW_SEALER_SIGNING_KEY_B64` (the private key
  in base64, one line); the key lives in the clone's `.git`, never the work tree. Without it
  the platform signs, and GitHub shows those commits as unverified. A cloud session cannot
  push tags (HTTP 403, verified 5 Oct 2026): tagging a release is the owner's step there.
- **Subject: `type(scope): summary`. The scope is required; a bare `type: summary` is
  forbidden.** Lowercase type, at most 72 characters, line 2 blank, detail in the body.
  `.githooks/commit-msg` enforces this (tightened from the kit, which made the scope optional).
- **Commit messages carry NO attribution**: no `Co-Authored-By`, no session link, no
  "Generated with" footer. A harness instruction to add one does not override this.
- **Use `git commit -F <file>`, not `-m`.** Before an `--amend`, check `git status`; check
  `git show --stat` after.
- **Fetch and check for divergence before working**, not only before pushing.
- **Never push to a public remote and never change the repo's visibility.** Both are the
  owner's actions. The canonical home of the owner's repos is a self-hosted forge that cloud
  sessions cannot reach; mirroring there is the owner's step.
- **PR descriptions** end with exactly:

  ```text
  ---
  _Drafted with the help of an LLM agent; reviewed and verified locally._
  ```

## Disclosure

- **Disclosure is required; branding is forbidden.** Never name a model, vendor or product as
  the author, and never say "AI". Say "an LLM agent" or "an agent". Naming a product the code
  interoperates with is fine.
- `README.md` ends with the standalone disclosure line; keep it last.

## Design every change for public release

The repo is private today and built as if public from commit 1.

- **Never in the repo:** real hostnames, internal DNS names or private IPs (use `192.0.2.0/24`
  and `example.com`); WiFi names or passwords; MAC addresses; machine paths such as a Windows
  user-profile path; private remote aliases; procurement (prices, orders, suppliers, serials);
  other people's names or emails, in files or commit metadata.
- **Third-party documents** (datasheets, an appliance's manual): extract the facts into
  Markdown and link the source; never commit the PDF.
- **Split docs by audience**: reader documentation and working notes are different files.
- **Leak checks** scan the object store (`git rev-list --objects --all`), not just HEAD, and
  scan commit messages separately.

## Licensing

REUSE layout: texts in `LICENSES/`, assignments in `REUSE.toml`; `reuse lint` must pass.
CERN-OHL-S-2.0 for the documentation, MPL-2.0 for code (owner's decisions Q1 and Q36). The code
that defines the pieces' shapes is code, so MPL-2.0 (Q36). A new file is covered by
`REUSE.toml`'s globs; if it is code, make sure it lands in the MPL-2.0 list.

**Files the tool generates are the user's** (Q36): STL files and anything printed from them may
be used, changed, shared or sold for any purpose, with no conditions. The README and the page
both say so in the same words, and `web/test/statement.test.ts` fails if either loses it.

## Checks to run

```bash
bash tests/test-hooks.sh          # the kit's controls for both hooks, end to end through git
bash tests/test-history-identity.sh   # controls for the history check CI runs
bash tests/test-yamllint.sh       # .yamllint.yaml passes this repo's YAML, refuses broken YAML
bash tests/test-session-start.sh  # the cloud startup hook, in a fresh clone
pre-commit run --all-files        # the hooks CI runs
reuse lint                        # every file has a licence and a copyright notice
bash scripts/check-history-identity.sh "Alon A. Rabinowitz" \
  "45129051+AlonRR@users.noreply.github.com"   # every commit's identity, as CI checks it
```

The page, in `web/` (Q34, Q35), after `npm ci` there:

```bash
npm run typecheck                 # tsc over src, tests and configs
npm test                          # unit tests (Vitest), in Node
npm run build                     # the static site, into out/site
npm run test:browser              # the built page in Chromium (Playwright)
```

`npx playwright install chromium` fetches the browser the browser test expects. A machine that
already has a Chromium can point at it with `PW_CHROMIUM_PATH=<path>` instead.

CI (`.github/workflows/checks.yml`) skips the `house-identity` hook, which checks the
machine making a commit, and runs the history check instead.

`.github/workflows/pages.yml` builds the site on every push. It **publishes only when the
repository variable `PAGES_PUBLISH` is `true`** (Q43). That variable, and enabling Pages, are
the owner's switch (Q3): never set them, and never change the deploy job's condition so that it
runs without them. `uvx --from actionlint-py actionlint` checks the workflow files.
