# Parametric window sealer

A parametric, 3D-printable panel system that closes off the part of a window left open when
something stops it closing: a window air conditioner, an exhaust fan, a hose.

You enter the size of the open area and the largest part your printer can make, choose the
panel style, and get a set of printable pieces that join together and fit the gap.

## Status

**Version 0.3.0: the wall with its fittings, seals and patterns, as a page and as an API; not
yet test printed.** The page in `web/` takes the opening you can see and your window type,
divides the opening into pieces your printer can make, joins them with connector strips and
cross pieces, fits edge strips into the window's tracks, shows the wall in 3D and downloads
every part as STL or 3MF. It fits a hose port, a measured cutout, an exhaust fan or a window air conditioner,
seals the edges with foam tape or printed TPU, fills the pieces with a pattern or a tile of your
own drawing ([`docs/svg-tiles.md`](docs/svg-tiles.md)), and has a measuring guide; it can also be saved as one file that works offline.
The same geometry is a library for Node.js and browsers, the `window-sealer` command and the
`window-sealer-mcp` server for LLM agents (see [Developing](#developing)). The joint's fit and the
example track sizes are starting values that a test print still has to confirm. The site is
built on every push but not published yet (see [Publishing the site](#publishing-the-site));
to run it on your own computer, see [Developing](#developing).

Every decision so far is in [`docs/status.md`](docs/status.md). The geometry is built in
TypeScript on the [Manifold](https://github.com/elalish/manifold) library, chosen by
measurement ([`spikes/engine-benchmark/`](spikes/engine-benchmark/README.md)).
What gets built, in what order, is in [`docs/backlog.md`](docs/backlog.md) and its GitHub
issues; what has changed is in [`CHANGELOG.md`](CHANGELOG.md).

Planned next:

- **Appliances**: adjustable clamps gripping the appliance.
- **Panel styles**: organiser patterns (pegboard-style), beside the grid, hexagon, brick and
  diamond patterns.
- **Fit**: a guided test print that adjusts the joint's fit after each print.

## Developing

```bash
git config user.useConfigOnly true
uv tool install pre-commit
pre-commit install
bash tests/test-hooks.sh
pre-commit run --all-files
```

The commit hooks check the commit identity and message form; `CLAUDE.md` lists the rules.
Adding a setting, a line of the plan or a part of the page: [`docs/extending.md`](docs/extending.md)
says where each goes and which test fails if a step is missed.

The geometry is a library in `packages/core`, the npm package `parametric-window-sealer`; the
`window-sealer` command is in `packages/cli`, and the `window-sealer-mcp` server for LLM agents
in `packages/mcp`. None is on the registry yet; each README ([library](packages/core/README.md),
[command](packages/cli/README.md), [MCP server](packages/mcp/README.md)) says how to use it.
The page lives in `web/`. The four are one npm workspace and need Node.js 22.12 or later:

```bash
npm ci                                              # at the repo root
npm run lint                                        # oxlint, with type-checked rules (.oxlintrc.jsonc)
npm run format                                      # Prettier; CI runs npm run format:check
npm test --workspaces                               # unit tests: library, command, server, page
npm run dev -w parametric-window-sealer-web         # the page, reloading as you edit
npm run build -w parametric-window-sealer-web       # the static site and the offline file, into web/out/site
```

## Publishing the site

`.github/workflows/pages.yml` builds the site on every push and keeps it as the run's
downloadable `github-pages` artifact. It goes live only when the repository owner switches it
on (decision Q43 in `docs/status.md`):

1. **Settings → Pages**, under "Build and deployment", set **Source** to **GitHub Actions**
   ([GitHub's steps](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)).
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**: name
   `PAGES_PUBLISH`, value `true`
   ([GitHub's steps](https://docs.github.com/en/actions/learn-github-actions/variables)).
3. Push to `main`, or run the `pages` workflow from the Actions tab.

Until both are set, the deploy job is skipped and the run stays green. GitHub's documentation
notes that a Pages site is public on the internet even when its repository is private, where
the plan allows Pages for a private repository.

## Licence

**Your generated files are yours.** The STL and other files this tool generates, and anything
you print from them, are yours to use, change, share or sell for any purpose, with no
conditions from this project.

The repository itself:

- Code, including the code that defines the pieces' shapes, and the scripts, hooks, tests, CI
  and tool configuration: [MPL-2.0](LICENSES/MPL-2.0.txt)
- The documentation: [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt)

Which licence covers which file is recorded in [`REUSE.toml`](REUSE.toml)
([REUSE](https://reuse.software) layout).

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
