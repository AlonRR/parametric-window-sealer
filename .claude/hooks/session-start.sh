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

# 4. Sign commits with the owner's own key (Q77) when the environment gives it as
#    WINDOW_SEALER_SIGNING_KEY_B64: the private key file in base64, on one line. The key is
#    written into this clone's .git directory, never the work tree, and never printed.
#    Without the variable, or with a key that does not work, signing stays as the platform
#    set it; the rest of the session is set up either way.
GIT_DIR_ABS=$(git rev-parse --absolute-git-dir)
SIGNING_KEY="$GIT_DIR_ABS/window-sealer-signing-key"
sign_with_owner_key() {
  if ! command -v ssh-keygen > /dev/null 2>&1; then
    { apt-get update -qq && apt-get install -y -qq --no-install-recommends openssh-client; } \
      > /dev/null 2>&1 || return 1
  fi
  (umask 077 && printf '%s' "$WINDOW_SEALER_SIGNING_KEY_B64" | base64 -d > "$SIGNING_KEY") \
    2> /dev/null || return 1
  # An empty passphrase: a key that needs one cannot be used here, and fails at once.
  local public
  public=$(ssh-keygen -y -P '' -f "$SIGNING_KEY" 2> /dev/null) || return 1
  printf '%s %s\n' "$(git config user.email)" "$public" > "$GIT_DIR_ABS/window-sealer-allowed-signers"
  git config gpg.format ssh
  git config gpg.ssh.program ssh-keygen
  git config user.signingkey "$SIGNING_KEY"
  git config gpg.ssh.allowedSignersFile "$GIT_DIR_ABS/window-sealer-allowed-signers"
  git config commit.gpgsign true
}
if [ -n "${WINDOW_SEALER_SIGNING_KEY_B64:-}" ]; then
  if ! sign_with_owner_key; then
    rm -f "$SIGNING_KEY" "$GIT_DIR_ABS/window-sealer-allowed-signers"
    echo "session-start: WINDOW_SEALER_SIGNING_KEY_B64 is set but not a usable key without a" \
      "passphrase; commits keep the platform's signing." >&2
  fi
fi
