# Parametric window sealer

A parametric, 3D-printable panel system that closes off the part of a window left open when
something stops it closing: a window air conditioner, an exhaust fan, a hose.

You enter the size of the open area and the largest part your printer can make, choose the
panel style, and get a set of printable pieces that join together and fit the gap.

## Status

**Requirements settled; there is no model yet.** Every decision so far is in
[`docs/status.md`](docs/status.md). The geometry will be built in TypeScript on the
[Manifold](https://github.com/elalish/manifold) library, chosen by measurement
([`spikes/engine-benchmark/`](spikes/engine-benchmark/README.md)).

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

## Licence

- The design and the documentation: [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt)
- Code (scripts, hooks, tests, CI and tool configuration): [MPL-2.0](LICENSES/MPL-2.0.txt)

Which licence covers which file is recorded in [`REUSE.toml`](REUSE.toml)
([REUSE](https://reuse.software) layout).

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
