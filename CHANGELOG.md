# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (owner's decision Q29).

The first version is `0.1.0`, tagged when the MVP in [`docs/backlog.md`](docs/backlog.md) is
complete. Until then every change is listed under Unreleased.

## [Unreleased]

### Added

- Repository conventions: commit-identity and commit-message hooks with their tests, CI checks
  (lint, secret scan of the full history, identity of every commit), REUSE licensing
  (CERN-OHL-S-2.0 for the design and documentation, MPL-2.0 for code), and a startup hook that
  sets up cloud sessions.
- The requirements and every decision so far, in [`docs/status.md`](docs/status.md).
- The ranked backlog and the MVP, in [`docs/backlog.md`](docs/backlog.md), mirrored as GitHub
  issues.
- An engine benchmark, Manifold against OpenSCAD, in
  [`spikes/engine-benchmark/`](spikes/engine-benchmark/README.md).
