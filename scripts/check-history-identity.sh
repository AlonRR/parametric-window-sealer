#!/usr/bin/env bash
# Check that every commit in a range was authored AND committed by the expected
# identity. CI runs this in place of .githooks/pre-commit's identity check.
#
# Why CI needs its own check: the pre-commit hook compares the identity CONFIGURED on
# the machine making a commit. A CI runner makes no commit, so there that hook either
# refuses (nothing configured) or, configured to match itself, compares the runner
# with the runner and can never fail. What CI can see is the history that was pushed,
# so this checks the identity recorded in each commit.
#
# usage: check-history-identity.sh <expected name> <expected email> [<revision range>]
#        (the range defaults to HEAD: every commit reachable from it)
#
# The address is compared case-insensitively and the name exactly, as the pre-commit
# hook does. A commit made in a forge's web UI carries the forge as committer and is
# refused here; that is deliberate, because it is a commit nobody checked locally.
set -uo pipefail

if [ $# -lt 2 ] || [ -z "$1" ] || [ -z "$2" ]; then
  echo "usage: $0 <expected name> <expected email> [<revision range>]" >&2
  exit 1
fi
EXPECT_NAME=$1
EXPECT_EMAIL=$2
RANGE=${3:-HEAD}

lc() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
expect_lc=$(lc "$EXPECT_EMAIL")

if ! log=$(git log --format='%H%x09%an%x09%ae%x09%cn%x09%ce' "$RANGE" --); then
  echo "check-history-identity: git log failed for range '$RANGE'" >&2
  exit 1
fi

checked=0
bad=0
while IFS=$'\t' read -r sha an ae cn ce; do
  [ -n "$sha" ] || continue
  checked=$((checked + 1))
  if [ "$an" != "$EXPECT_NAME" ] || [ "$(lc "$ae")" != "$expect_lc" ] ||
    [ "$cn" != "$EXPECT_NAME" ] || [ "$(lc "$ce")" != "$expect_lc" ]; then
    echo "WRONG IDENTITY ${sha:0:12}: author '$an <$ae>', committer '$cn <$ce>'" >&2
    bad=$((bad + 1))
  fi
done <<< "$log"

# A range with no commits in it has checked nothing, which is not a pass.
if [ "$checked" -eq 0 ]; then
  echo "check-history-identity: no commits in range '$RANGE'; nothing was checked" >&2
  exit 1
fi

echo "$checked commits checked, $bad with the wrong identity (expected '$EXPECT_NAME <$EXPECT_EMAIL>')"
[ "$bad" -eq 0 ] || exit 1
