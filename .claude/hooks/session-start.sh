#!/usr/bin/env bash
# Set up a Claude Code cloud session for this repo (owner's decision Q19, 5 Oct 2026).
#
# A cloud session starts from a fresh clone in a fresh container: the tools the checks
# need are not installed, no git hooks are wired, and git's identity is the container's
# default, which is wrong for this repo (CLAUDE.md, "Git"). This hook fixes all three.
#
# Cloud sessions only: on the owner's own machines it exits at once and changes nothing.
# tests/test-session-start.sh holds it to both sides of that.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR is not set}"

# 1. The tools the checks need, through uv (never pip). Both installs are idempotent.
export PATH="$HOME/.local/bin:$PATH"
uv tool install 'pre-commit>=4.5.1'
uv tool install reuse
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi

# 2. The commit identity, repo-local, and the expected identity the hooks check against.
git config user.name "Alon A. Rabinowitz"
git config user.email "45129051+AlonRR@users.noreply.github.com"
git config hooks.expectName "Alon A. Rabinowitz"
git config hooks.expectEmail "45129051+AlonRR@users.noreply.github.com"
git config user.useConfigOnly true

# 3. Wire the git hooks from .pre-commit-config.yaml, and build their environments now,
#    so the first commit of the session does not stall on it.
pre-commit install --install-hooks
