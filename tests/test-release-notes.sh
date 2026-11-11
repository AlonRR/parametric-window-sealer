#!/usr/bin/env bash
# Positive and negative controls for scripts/check-release-notes.sh, which compares a GitHub
# release's notes with the CHANGELOG section of its version, byte for byte.
#
# The case it exists for: notes whose UTF-8 was read as Windows-1252 on the way and sent on
# as UTF-8, so "…" arrives as "â€¦" and "°" as "Â°". A comparison that decodes both sides
# the same way calls them equal; this one must refuse them.
#
# A refusal must be exit 1 EXACTLY and a usage error exit 2: "any non-zero" would also
# accept 127 (script not found), so a missing check would pass every refuse case.
#
# Run from anywhere:  bash tests/test-release-notes.sh
# Needs git, jq and iconv; no network (each case hands the script a release as a file).
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
CHECK="$ROOT/scripts/check-release-notes.sh"

ran=0
failed=0

# expect <pass|refuse|usage> <label> <exit code>
expect() {
  local want=$1 label=$2 code=$3 ok=0
  ran=$((ran + 1))
  case $want in
    pass) [ "$code" -eq 0 ] && ok=1 ;;
    refuse) [ "$code" -eq 1 ] && ok=1 ;;
    usage) [ "$code" -eq 2 ] && ok=1 ;;
  esac
  if [ "$ok" -eq 1 ]; then
    printf 'ok    %-7s %s\n' "$want" "$label"
  else
    printf 'FAIL  %-7s %s (exit %s)\n' "$want" "$label" "$code"
    failed=$((failed + 1))
  fi
}

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_NOSYSTEM=1

# A repo with a changelog of two versions, the newer one holding "…" and "°", tagged.
R="$WORK/repo"
git init -q --template= "$R"
git -C "$R" config user.name "Expected Name"
git -C "$R" config user.email "expected@example.com"
git -C "$R" config commit.gpgsign false
git -C "$R" config tag.gpgsign false
cat > "$R/CHANGELOG.md" << 'EOF'
# Changelog

## [Unreleased]

## [1.2.0] - 2026-11-11

### Added

- A wedge, its files named `wedge-…`, for a pitch of 15 to 90°.

### Fixed

- A test that failed on one platform.

## [1.1.0] - 2026-10-16

### Added

- Something older.
EOF
git -C "$R" add CHANGELOG.md
git -C "$R" commit -q -m "chore(release): 1.2.0"
git -C "$R" tag -a v1.2.0 -m "v1.2.0"
git -C "$R" tag -a v1.3.0 -m "v1.3.0, no section"

# The section as GitHub should hold it, and wrong versions of it.
SECTION="$WORK/section.md"
printf '%s\n' '### Added' '' '- A wedge, its files named `wedge-…`, for a pitch of 15 to 90°.' '' \
  '### Fixed' '' '- A test that failed on one platform.' > "$SECTION"
iconv -f UTF-8 -t CP1252 "$SECTION" | iconv -f CP1252 -t UTF-8 > "$WORK/same.md" # round trip: unchanged
iconv -f CP1252 -t UTF-8 "$SECTION" > "$WORK/mojibake.md"                        # the fault
sed 's/$/\r/' "$SECTION" > "$WORK/crlf.md"
grep -v 'one platform' "$SECTION" > "$WORK/short.md"
printf '%s\n' '### Added' '' '- Something older.' > "$WORK/older.md"

# release <name> <body file | null>: a release as GitHub's API returns it
release() {
  if [ "$2" = null ]; then
    jq -n '{tag_name: "v1.2.0", name: "v1.2.0", prerelease: true, body: null}' > "$WORK/$1.json"
  else
    jq -n --rawfile b "$2" '{tag_name: "v1.2.0", name: "v1.2.0", prerelease: true, body: $b}' > "$WORK/$1.json"
  fi
  printf '%s' "$WORK/$1.json"
}

run() { (cd "$R" && bash "$CHECK" "$@") > "$WORK/out.txt" 2>&1; }

# The fixture itself, so a pass below means what it says: the mojibake file really differs.
cmp -s "$SECTION" "$WORK/mojibake.md"
expect refuse "fixture: the mojibake body differs from the section (cmp)" "$(($? == 0 ? 0 : 1))"
grep -q 'â€¦' "$WORK/mojibake.md" && grep -q 'Â°' "$WORK/mojibake.md"
expect pass "fixture: the mojibake body holds â€¦ and Â°" $?

run v1.2.0 "$(release good "$SECTION")"
expect pass "the notes are the section" $?
run v1.2.0 "$(release same "$WORK/same.md")"
expect pass "the notes are the section after a lossless round trip" $?
run v1.2.0 "$(release crlf "$WORK/crlf.md")"
expect pass "the notes are the section with CRLF line ends, as a browser sends them" $?
printf '\n\n' | cat - "$SECTION" > "$WORK/padded.md" && printf '\n' >> "$WORK/padded.md"
run v1.2.0 "$(release padded "$WORK/padded.md")"
expect pass "the notes are the section with blank lines before and after" $?

run v1.2.0 "$(release mojibake "$WORK/mojibake.md")"
expect refuse "UTF-8 read as Windows-1252: … as â€¦ and ° as Â°" $?
grep -q 'â€¦' "$WORK/out.txt"
expect pass "the refusal shows the differing line" $?
run v1.2.0 "$(release short "$WORK/short.md")"
expect refuse "a line missing" $?
run v1.2.0 "$(release older "$WORK/older.md")"
expect refuse "another version's section" $?
run v1.2.0 "$(release nobody null)"
expect refuse "no notes at all" $?
grep -q 'has no notes' "$WORK/out.txt"
expect pass "the refusal says the release has no notes" $?
run v1.3.0 "$(release good13 "$SECTION")"
expect refuse "a tag whose changelog has no section for it" $?

run
expect usage "no arguments" $?
run v1.2.0 "$WORK/does-not-exist.json"
expect usage "a release file that does not exist" $?
run not-a-tag "$(release good2 "$SECTION")"
expect usage "a tag that does not exist" $?

echo
echo "$ran cases run, $((ran - failed)) passed, $failed failed"
[ "$failed" -eq 0 ]
