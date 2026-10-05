#!/usr/bin/env bash
# Positive and negative controls for the two house hooks in .githooks/.
#
# Every rule is tested from both sides: a message or identity that MUST pass and one
# that MUST be refused. A hook that only ever saw passing input cannot be told apart
# from a hook that passes everything.
#
# Run from anywhere:  bash tests/test-hooks.sh
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
COMMIT_MSG="$ROOT/.githooks/commit-msg"
PRE_COMMIT="$ROOT/.githooks/pre-commit"

ran=0
failed=0

# expect <pass|refuse> <label> <exit code>
expect() {
  want=$1
  label=$2
  code=$3
  ran=$((ran + 1))
  if { [ "$want" = pass ] && [ "$code" -eq 0 ]; } ||
    { [ "$want" = refuse ] && [ "$code" -ne 0 ]; }; then
    printf 'ok    %-7s %s\n' "$want" "$label"
  else
    printf 'FAIL  %-7s %s (exit %s)\n' "$want" "$label" "$code"
    failed=$((failed + 1))
  fi
}

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Isolate from the machine's own git config, so a global identity cannot leak in.
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_NOSYSTEM=1

git init -q "$WORK/repo"
cd "$WORK/repo" || exit 1

# --- commit-msg ----------------------------------------------------------------

# msg <pass|refuse> <label> <message text>
msg() {
  printf '%s\n' "$3" > "$WORK/msg"
  sh "$COMMIT_MSG" "$WORK/msg" 2> /dev/null
  expect "$1" "commit-msg: $2" $?
}

len72="docs(readme): $(printf 'x%.0s' $(seq 1 58))"
len73="docs(readme): $(printf 'x%.0s' $(seq 1 59))"

msg pass "type(scope): summary" "docs(readme): add usage section"
msg refuse "bare type: summary (scope is required)" "docs: add usage section"
msg refuse "uppercase type" "Docs(readme): add usage section"
msg refuse "no colon" "docs(readme) add usage section"
msg refuse "empty scope" "docs(): add usage section"
msg pass "breaking-change marker" "feat(model)!: rename the panel parameters"
msg pass "subject of exactly 72 chars" "$len72"
msg refuse "subject of 73 chars" "$len73"
msg pass "blank line 2, then a body" "$(printf 'fix(joint): widen clearance\n\nMeasured on a test print.')"
msg refuse "non-blank line 2" "$(printf 'fix(joint): widen clearance\nMeasured on a test print.')"
msg refuse "Co-Authored-By trailer" "$(printf 'docs(readme): x\n\nCo-Authored-By: Someone <a@b.c>')"
msg refuse "Claude-Session trailer" "$(printf 'docs(readme): x\n\nClaude-Session: https://example.com/s')"
msg refuse "generated-with footer" "$(printf 'docs(readme): x\n\n🤖 Generated with [Tool](https://example.com)')"
msg pass "prose that mentions 'generated with' mid-line" "$(printf 'docs(readme): x\n\nThe STL is generated with the defaults.')"
msg pass "git's own merge message" "Merge branch 'topic'"

# --- pre-commit (identity) -----------------------------------------------------

GOOD_NAME="Expected Name"
GOOD_EMAIL="expected@example.com"
git config user.name "$GOOD_NAME"
git config user.email "$GOOD_EMAIL"
git config hooks.expectName "$GOOD_NAME"
git config hooks.expectEmail "$GOOD_EMAIL"

bash "$PRE_COMMIT" 2> /dev/null
expect pass "identity: configured identity matches" $?

GIT_AUTHOR_EMAIL=other@example.com bash "$PRE_COMMIT" 2> /dev/null
expect refuse "identity: wrong author address" $?

GIT_COMMITTER_EMAIL=other@example.com bash "$PRE_COMMIT" 2> /dev/null
expect refuse "identity: wrong committer address" $?

GIT_COMMITTER_NAME="Other Name" bash "$PRE_COMMIT" 2> /dev/null
expect refuse "identity: wrong committer name" $?

GIT_AUTHOR_EMAIL=EXPECTED@example.com bash "$PRE_COMMIT" 2> /dev/null
expect pass "identity: address differing only in case" $?

# The verdict must survive a closed output pipe (the 18 Sep 2026 regression).
GIT_AUTHOR_EMAIL=other@example.com bash "$PRE_COMMIT" 2>&1 | head -1 > /dev/null
expect refuse "identity: wrong address, output piped to head -1" "${PIPESTATUS[0]}"

git config --unset hooks.expectEmail
bash "$PRE_COMMIT" 2> /dev/null
expect refuse "identity: nothing configured to compare against" $?

# --- summary -------------------------------------------------------------------

echo
echo "$ran cases run, $((ran - failed)) passed, $failed failed"
if [ "$ran" -eq 0 ]; then
  echo "no cases ran -- that is a failure, not a pass" >&2
  exit 1
fi
[ "$failed" -eq 0 ]
