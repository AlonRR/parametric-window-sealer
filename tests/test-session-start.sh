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
# Needs uv (the hook installs its tools with it) and ssh-keygen (to make a test signing
# key), so it runs locally, not in CI.
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
  (cd "$C" && env -u CLAUDE_CODE_REMOTE -u WINDOW_SEALER_SIGNING_KEY_B64 "$@" CLAUDE_PROJECT_DIR="$C" \
    CLAUDE_ENV_FILE="$envfile" bash "$HOOK")
}
export -f run_hook
export HOOK

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

echo "no signing key in the environment -- signing stays the platform's:"
check "no repo-local gpg.ssh.program" isnt_set gpg.ssh.program
check "no repo-local user.signingkey" isnt_set user.signingkey
check "no key file written" test ! -e "$C/.git/window-sealer-signing-key"

echo "run again -- must be safe to repeat:"
run_hook "$TMP/env-cloud-2" CLAUDE_CODE_REMOTE=true > /dev/null 2>&1
check "exits 0 the second time" is "$?" 0
check "identity unchanged" is "$(local_cfg user.email)" "$EMAIL"

# Q77: the owner's dedicated signing key, given as WINDOW_SEALER_SIGNING_KEY_B64.
echo "with the owner's signing key -- commits are signed with it:"
ssh-keygen -q -t ed25519 -N '' -C 'test signing key' -f "$TMP/test-key"
K="$TMP/signed"
git clone -q "$HERE" "$K"
C="$K" run_hook "$TMP/env-signed" CLAUDE_CODE_REMOTE=true \
  WINDOW_SEALER_SIGNING_KEY_B64="$(base64 -w0 "$TMP/test-key")" > "$TMP/signed.log" 2>&1
check "exits 0" is "$?" 0
key_cfg() { git -C "$K" config --local --get "$1"; }
check "gpg.format is ssh" is "$(key_cfg gpg.format)" ssh
check "signs with ssh-keygen, not the platform's helper" is "$(key_cfg gpg.ssh.program)" ssh-keygen
check "commit.gpgsign set" is "$(key_cfg commit.gpgsign)" true
check "the key sits in .git, not the work tree" is "$(key_cfg user.signingkey)" \
  "$K/.git/window-sealer-signing-key"
check "the key file is the given key" cmp -s "$TMP/test-key" "$K/.git/window-sealer-signing-key"
check "the key file is private (600)" is "$(stat -c %a "$K/.git/window-sealer-signing-key")" 600
check "the key is never printed" sh -c "! grep -q 'PRIVATE KEY' '$TMP/signed.log'"
check "git status is clean: nothing to commit by accident" is "$(git -C "$K" status --porcelain)" ""
(cd "$K" && git commit -q --allow-empty -m 'test(session): a signed commit' > /dev/null 2>&1)
check "a commit lands" is "$(git -C "$K" log -1 --format=%s)" "test(session): a signed commit"
check "and verifies as signed by that key (G)" is "$(git -C "$K" log -1 --format=%G?)" G
check "the signature's key is the test key" is "$(git -C "$K" log -1 --format=%GK)" \
  "$(ssh-keygen -lf "$TMP/test-key.pub" | awk '{print $2}')"

echo "with a broken key -- warns, keeps the platform's signing, sets the rest up:"
B="$TMP/broken"
git clone -q "$HERE" "$B"
C="$B" run_hook "$TMP/env-broken" CLAUDE_CODE_REMOTE=true \
  WINDOW_SEALER_SIGNING_KEY_B64="$(printf 'not a key' | base64)" > "$TMP/broken.log" 2>&1
check "exits 0" is "$?" 0
check "says the key is unusable" grep -q 'WINDOW_SEALER_SIGNING_KEY_B64' "$TMP/broken.log"
check "no repo-local user.signingkey" sh -c "! git -C '$B' config --local --get user.signingkey"
check "no key file left behind" test ! -e "$B/.git/window-sealer-signing-key"
check "the identity is still set" is "$(git -C "$B" config --local --get user.email)" "$EMAIL"

echo "with a key that needs a passphrase -- refused at once, never waits for one:"
ssh-keygen -q -t ed25519 -N 'secret' -C 'test key with a passphrase' -f "$TMP/locked-key"
L="$TMP/locked"
git clone -q "$HERE" "$L"
C="$L" timeout 120 bash -c 'run_hook "$@"' _ "$TMP/env-locked" CLAUDE_CODE_REMOTE=true \
  WINDOW_SEALER_SIGNING_KEY_B64="$(base64 -w0 "$TMP/locked-key")" < /dev/null > "$TMP/locked.log" 2>&1
check "exits 0 (not killed by the timeout)" is "$?" 0
check "says the key is unusable" grep -q 'WINDOW_SEALER_SIGNING_KEY_B64' "$TMP/locked.log"
check "no key file left behind" test ! -e "$L/.git/window-sealer-signing-key"

printf '\n%s\n' "$pass passed, $fail failed"
if [ $((pass + fail)) -eq 0 ]; then
  echo "no checks ran -- that is a failure, not a pass" >&2
  exit 1
fi
[ "$fail" -eq 0 ]
