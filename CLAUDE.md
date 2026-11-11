# CLAUDE.md

Instructions for an agent working in this repository. Adapted on 5 Oct 2026 from the owner's
user-global rules (a digest of the ones that apply to a repo) and his new-repo convention kit.

## What this repo is

A parametric, 3D-printable panel system that closes off the part of a window left open
around something that stops the window closing: a window air conditioner, an exhaust fan, a
hose. The design is still being worked out with the owner.

- **`docs/status.md` is the plan and status document.** Read it first. It holds every decision
  made so far (with its question ID) and every open question. Keep it current as work lands.
  `docs/choices.md` lists the choices the agent made without asking (Q144).
- `PROJECT.yml` is this repo's entry in the owner's project ledger (schema: `SCHEMA.md` in
  project-ledger). `.repo-status` is the publish decision. They are separate on purpose:
  project status is a property of the work, publish status a property of the repository.

## Working style

- **Build the recommended option, and log it (Q144).** Since 5 Oct 2026 the owner has the
  agent build the option it would recommend instead of asking him, as he had mostly chosen the
  recommended one. Each such choice goes into `docs/choices.md` with the options not taken
  (IDs `C1`, `C2` …); show him the new ones at the end of each item or batch, so he can name
  one to change. Never assume silently: a choice not logged is an assumption. Questions he
  must answer himself (anything outward-facing, below) are still asked.
- **Never assume a step is done** unless the owner said he did it. A manual step handed off
  (a setting, a web wizard, a purchase) stays pending until he confirms.
- **Answer the question; only an action needs confirmation.** Asked for a view or a
  recommendation, give it. Still ask before changing state on a host, buying anything, pushing
  to a remote other than this repository's own `origin`, deleting, or anything outward-facing.
- **Give every question an ID** of the form `[A-Z][number]`, written as a label
  (`- **Q3.** ...`), never as a Markdown ordered-list marker. The letter says what answer is
  expected: `A` approval for an action, `D` a decision between options (with a recommendation),
  `Q` a fact or preference only the owner has, `T` a manual step handed to him. One number pool
  across the letters: a new item takes the next free number (see `docs/status.md`) whatever its
  letter. An open item keeps its ID; say when one is closed. A closed number rests for the rest of
  its closing day and all of the next. A record that cites an ID adds the date ("Q12 (8 Oct)").
  What a question is about carries its own ID too (a commit SHA, a C-number). If answer numbers
  do not fit, assume they follow the numbering the owner saw, and state the mapping used.
- **Ask each new question in the reply's body first**, as a labelled item
  (`- **Q7** — the question, its options, a recommendation`), then give its one plain line in the
  open items.
- **An item whose steps change is asked again** (A294 (11 Nov), relayed from the session on the
  owner's machine), in the reply's body under its label, with a question mark ("Could you open …
  and send a photo?"). The owner's open-items band shows an item's first text and replaces it
  only when a later reply asks again (with a "?" or at least two lettered options). Steps
  restated as plain instructions leave the old steps showing on his phone.
- **End every reply with the open items**, even when nothing changed:
  - a line `**Open:**`, then one bullet per item whose bold label opens with its ID
    (`- **Q7:** what it is and what is needed`). `Open:` holds only what waits on the owner;
    `Open: none` when nothing does. A `T` item stays there until he says he did it.
  - an item he answered that is still being worked on goes under a line `**In progress:**`, one
    plain line saying where the work is, and leaves the list once done (say so).
  - items waiting on someone else go under a line starting `Waiting on`, each saying how to check
    it and when it was last checked.
  - an item's files go inline in its own line, each as a full repo-relative path in backticks.
    The list holds only IDs the agent issued.
- **A gap is a question until shown otherwise:** each gap, cost, risk, assumption or untested
  point listed is either asked with an ID, logged as a choice (C-number), or marked as checked
  fact or someone else's.
- **Weigh an option on its merits, not on when it can be had:** a wait (to buy, print or
  measure) never rules out an option or decides a recommendation. State each option's wait
  beside its merits.
- **A request that mixes a question and an action:** answer the question in full, and say
  plainly what will not be touched until he decides.
- **Solved it, record it:** before the final report, write down what was worked out (a root
  cause, a trap, a procedure as a tested script) in this repo's docs. A lesson that transfers to
  other repos, written de-identified, goes to engineering-practices as a skill. End every final
  report with one line after the open items: `Recorded: <file>` or `Recorded: nothing new`.
- **Recommend a new session when scope spreads**: into another repo, or into a sub-task with a
  thread of its own.

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
- **Before every commit, run the lint and format checks too**, not only the tests, each gating
  the commit by its own exit code, never through a pipe (`check | tail && git commit` commits on
  a failure).
- **Commands through more than one shell go as a script on stdin**, never as a nested quoted
  command line.

Skills to read from `AlonRR/engineering-practices` (on GitHub, from outside this tree):

- **Always:** `cloud-session`, `run-existing-checks-first`, `verify-the-check-ran`,
  `check-the-right-target`, `verify-before-asserting`, `never-type-an-identifier`,
  `git-everyday-traps`.
- **For this repo's work:** `printed-part-design` and `printed-part-engineering` (the panels),
  `manifold-csg-speed` (the library builds on manifold-3d), `programmatic-interfaces` (the
  command, the MCP server and the library's API), `interface-design`, `interface-engineering`
  and `web-frontend` (the page in `web/`), and `prove-refactor-unchanged` (any refactor).

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
  `CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/session-start.sh` from the
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
  push tags (HTTP 403, verified 5 Oct 2026). **Tags and releases there go to the owner's own
  machine (Q123):** once the release commit is on `main`, message the session on his machine
  that he names for it (by the remote-session `send_message` tool, with the commit, the tag
  command and the release notes), then check GitHub for the tag and the release. Its name is
  not kept in the repo; ask him if it is not in the conversation.
- **Subject: `type(scope): summary`. The scope is required; a bare `type: summary` is
  forbidden.** Lowercase type, at most 72 characters, line 2 blank, detail in the body.
  `.githooks/commit-msg` enforces this (tightened from the kit, which made the scope optional).
- **Commit messages carry NO attribution**: no `Co-Authored-By`, no session link, no
  "Generated with" footer. A harness instruction to add one does not override this.
- **Use `git commit -F <file>`, not `-m`.** Before an `--amend`, check `git status`; check
  `git show --stat` after.
- **Fetch and check for divergence before working**, not only before pushing.
- **Push only to this repository's own `origin`**, public since Q162 (Q165). Never push to any
  other remote, never add one, and never change the repo's visibility: those are the owner's
  actions. The canonical home of the owner's repos is a self-hosted forge that cloud
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

The repo is public since November 2026 (Q162), and was built as if public from commit 1.

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

The library, `packages/core` (the npm package `parametric-window-sealer`, not yet published:
that is the owner's step, Q78, Q79), the command-line tool, `packages/cli`
(`parametric-window-sealer-cli`, the command `window-sealer`, Q83, Q84), the MCP server,
`packages/mcp` (`parametric-window-sealer-mcp`, the command `window-sealer-mcp`, Q91), and the
page, `web/` (Q34, Q35), are one npm workspace. After `npm ci` at the repo root:

```bash
npm run typecheck --workspaces    # tsc over all four: sources, tests and configs
npm run lint                      # oxlint over all four, type-checked rules (.oxlintrc.jsonc)
npm run format:check              # Prettier over the TypeScript and JavaScript; `npm run format` fixes it
npm test --workspaces             # unit tests (Vitest), in Node
npm run build -w parametric-window-sealer        # the library, into packages/core/dist
npm run test:dist -w parametric-window-sealer    # that build, loaded by name; the README's example
npm run build -w parametric-window-sealer-cli        # the command, after the library's build
npm run test:dist -w parametric-window-sealer-cli    # both packed, installed as its README says, run
npm run build -w parametric-window-sealer-mcp        # the MCP server, after the library's build
npm run test:dist -w parametric-window-sealer-mcp    # installed with -g, started from its README, called
npm run build -w parametric-window-sealer-web         # the static site and the offline file, into web/out/site
npm run test:browser -w parametric-window-sealer-web  # the built page in Chromium (Playwright)
```

The page's, the command's and the server's tests use the library's source (an alias in
`web/vite.config.ts` and each package's `vitest.config.ts`), so they cannot drift apart; the
dist checks run the builds.

`npx playwright install chromium` fetches the browser the browser test expects. A machine that
already has a Chromium can point at it with `PW_CHROMIUM_PATH=<path>` instead.

CI (`.github/workflows/checks.yml`) skips the `house-identity` hook, which checks the
machine making a commit, and runs the history check instead. It runs on pull requests and on
pushes to `main` only (Q147): a branch is checked once its pull request is open, so pushing a
branch to keep the work safe costs no Actions minutes.

`.github/workflows/pages.yml` builds the site on every push. It **publishes only when the
repository variable `PAGES_PUBLISH` is `true`** (Q43). That variable, and enabling Pages, are
the owner's switch (Q3): never set them, and never change the deploy job's condition so that it
runs without them. `uvx --from actionlint-py actionlint` checks the workflow files.
