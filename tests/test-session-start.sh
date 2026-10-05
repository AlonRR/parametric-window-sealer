#!/usr/bin/env bash
# Positive and negative controls for .claude/hooks/session-start.sh, the startup hook
# that sets up a cloud session for this repo (owner's decision Q19, 5 Oct 2026).
#
# Runs the hook against a fresh CLONE of this repo, which is what a new cloud session
# starts from: a clone carries no repo-local git config, so its commits would get the
# machine's default identity and no hooks would be wired.
#
#   bash tests/test-session-start.sh
#
# Needs uv (the hook installs its tools with it), so it runs locally, not in CI.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK="$HERE/.claude/hooks/session-start.sh"
NAME="Alon A. Rabinowitz"
EMAIL="45129051+AlonRR@users.noreply.github.com"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

check() { # check <label> <command...>: the command must succeed
  local label=$1
  shift
  if "$@" > /dev/null 2>&1; then
    pass=$((pass + 1))
    printf '  ok    %s\n' "$label"
  else
    fail=$((fail + 1))
    printf '  FAIL  %s\n' "$label"
  fi
}
local_cfg() { git -C "$C" config --local --get "$1"; }
is() { [ "$1" = "$2" ]; }
isnt_set() { ! local_cfg "$1"; }

C="$TMP/clone"
git clone -q "$HERE" "$C"
run_hook() { # run_hook <env file> [VAR=value ...]
  local envfile=$1
  shift
  (cd "$C" && env -u CLAUDE_CODE_REMOTE "$@" CLAUDE_PROJECT_DIR="$C" \
    CLAUDE_ENV_FILE="$envfile" bash "$HOOK")
}

echo "outside a cloud session -- must change nothing:"
run_hook "$TMP/env-local" > /dev/null 2>&1
check "exits 0" is "$?" 0
check "no repo-local user.email" isnt_set user.email
check "no repo-local hooks.expectEmail" isnt_set hooks.expectEmail
check "no commit-msg hook wired" test ! -e "$C/.git/hooks/commit-msg"
check "nothing written to the env file" test ! -s "$TMP/env-local"

echo "in a cloud session -- must set the session up:"
run_hook "$TMP/env-cloud" CLAUDE_CODE_REMOTE=true > /dev/null 2>&1
check "exits 0" is "$?" 0
check "user.name is the owner's" is "$(local_cfg user.name)" "$NAME"
check "user.email is the owner's noreply" is "$(local_cfg user.email)" "$EMAIL"
check "hooks.expectName set" is "$(local_cfg hooks.expectName)" "$NAME"
check "hooks.expectEmail set" is "$(local_cfg hooks.expectEmail)" "$EMAIL"
check "user.useConfigOnly set" is "$(local_cfg user.useConfigOnly)" true
check "pre-commit hook wired" grep -q pre-commit "$C/.git/hooks/pre-commit"
check "commit-msg hook wired" grep -q pre-commit "$C/.git/hooks/commit-msg"
check "pre-push hook wired" grep -q pre-commit "$C/.git/hooks/pre-push"
check "tools put on PATH for the session" grep -q '.local/bin' "$TMP/env-cloud"

echo "end to end in the set-up clone:"
(cd "$C" && git commit -q --allow-empty -m 'test(session): a valid commit' > /dev/null 2>&1)
check "a valid commit lands" is "$(git -C "$C" log -1 --format=%s)" "test(session): a valid commit"
check "with the owner's identity, author and committer" \
  is "$(git -C "$C" log -1 --format='%an <%ae> | %cn <%ce>')" "$NAME <$EMAIL> | $NAME <$EMAIL>"
before=$(git -C "$C" rev-list --count HEAD)
(cd "$C" && git commit -q --allow-empty -m 'docs: no scope' > /dev/null 2>&1)
check "a bare 'docs: no scope' is refused" is "$(git -C "$C" rev-list --count HEAD)" "$before"

echo "run again -- must be safe to repeat:"
run_hook "$TMP/env-cloud-2" CLAUDE_CODE_REMOTE=true > /dev/null 2>&1
check "exits 0 the second time" is "$?" 0
check "identity unchanged" is "$(local_cfg user.email)" "$EMAIL"

printf '\n%s\n' "$pass passed, $fail failed"
if [ $((pass + fail)) -eq 0 ]; then
  echo "no checks ran -- that is a failure, not a pass" >&2
  exit 1
fi
[ "$fail" -eq 0 ]
