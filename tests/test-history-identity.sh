#!/usr/bin/env bash
# Positive and negative controls for scripts/check-history-identity.sh, which CI runs
# in place of the identity hook (a CI runner makes no commit of its own to check).
#
# Every rule is tested from both sides: a history that MUST pass and one that MUST be
# refused. A refusal must be exit 1 EXACTLY: "any non-zero" would also accept 127
# (script not found), so a missing check would pass every refuse case.
#
# Run from anywhere:  bash tests/test-history-identity.sh
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
CHECK="$ROOT/scripts/check-history-identity.sh"
GOOD_NAME="Expected Name"
GOOD_EMAIL="expected@example.com"

ran=0
failed=0

# expect <pass|refuse> <label> <exit code>
expect() {
  want=$1
  label=$2
  code=$3
  ran=$((ran + 1))
  if { [ "$want" = pass ] && [ "$code" -eq 0 ]; } ||
    { [ "$want" = refuse ] && [ "$code" -eq 1 ]; }; then
    printf 'ok    %-7s %s\n' "$want" "$label"
  else
    printf 'FAIL  %-7s %s (exit %s)\n' "$want" "$label" "$code"
    failed=$((failed + 1))
  fi
}

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Isolate from the machine's own git config (identity, signing), so it cannot leak in.
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_NOSYSTEM=1

git init -q "$WORK/hist"
cd "$WORK/hist" || exit 1

# commit_as <author name> <author email> <committer name> <committer email>
commit_as() {
  GIT_AUTHOR_NAME=$1 GIT_AUTHOR_EMAIL=$2 GIT_COMMITTER_NAME=$3 GIT_COMMITTER_EMAIL=$4 \
    git commit -q --allow-empty --no-verify -m "test(history): commit $ran"
}
history() {
  bash "$CHECK" "$GOOD_NAME" "$GOOD_EMAIL" "$@" > /dev/null 2>&1
}

commit_as "$GOOD_NAME" "$GOOD_EMAIL" "$GOOD_NAME" "$GOOD_EMAIL"
commit_as "$GOOD_NAME" "EXPECTED@EXAMPLE.COM" "$GOOD_NAME" "$GOOD_EMAIL"
history HEAD
expect pass "every commit is the expected identity (address case aside)" $?

history HEAD..HEAD
expect refuse "an empty range checks nothing" $?

bash "$CHECK" > /dev/null 2>&1
expect refuse "no expected identity given" $?

commit_as "$GOOD_NAME" "other@example.com" "$GOOD_NAME" "$GOOD_EMAIL"
history HEAD
expect refuse "one commit with a wrong author address" $?

history HEAD~1
expect pass "a range that stops before the bad commit" $?

git reset -q --hard HEAD~1
commit_as "$GOOD_NAME" "$GOOD_EMAIL" "Other Name" "$GOOD_EMAIL"
history HEAD
expect refuse "one commit with a wrong committer name" $?

echo
echo "$ran cases run, $((ran - failed)) passed, $failed failed"
if [ "$ran" -eq 0 ]; then
  echo "no cases ran -- that is a failure, not a pass" >&2
  exit 1
fi
[ "$failed" -eq 0 ]
