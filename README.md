# Parametric window sealer

A parametric, 3D-printable panel system that closes off the part of a window left open when
something stops it closing: a window air conditioner, an exhaust fan, a hose.

You enter the size of the open area and the largest part your printer can make, choose the
panel style, and get a set of printable pieces that join together and fit the gap.

## Status

**Building the first version; there are no printable pieces yet.** Every decision so far is in
[`docs/status.md`](docs/status.md). The geometry will be built in TypeScript on the
[Manifold](https://github.com/elalish/manifold) library, chosen by measurement
([`spikes/engine-benchmark/`](spikes/engine-benchmark/README.md)).
What gets built, in what order, is in [`docs/backlog.md`](docs/backlog.md) and its GitHub
issues; what has changed is in [`CHANGELOG.md`](CHANGELOG.md).

Planned:

- **Panel styles**: sealed or open, organiser patterns (pegboard-style), and decorative
  patterns such as brick, diamond or grid.
- **Splitting**: the opening is divided into pieces no bigger than your printer can make,
  either all the same size or as many full-size pieces as fit plus one filler.
- **Fitting**: joints between pieces, mounting in the window, and an adjustable interface to the
  appliance.
- **Windows**: horizontal sliders and single- or double-hung windows first.
- **Running it**: a web page where you set the parameters, preview the result and download the
  pieces, with no software to install.

## Developing

```bash
git config user.useConfigOnly true
uv tool install pre-commit
pre-commit install
bash tests/test-hooks.sh
pre-commit run --all-files
```

The commit hooks check the commit identity and message form; `CLAUDE.md` lists the rules.

The page lives in `web/` and needs Node.js 22.12 or later:

```bash
cd web
npm ci
npm run dev                       # a local server that reloads as you edit
npm test                          # unit tests
npm run build                     # the static site, into web/out/site
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
