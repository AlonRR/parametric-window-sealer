#!/usr/bin/env bash
# Check that a GitHub release's notes are its version's CHANGELOG section, byte for byte.
#
# Why bytes: on 11 Nov 2026 v0.8.0's notes reached GitHub with "…" as "â€¦" and "°" as "Â°",
# UTF-8 read as Windows-1252 on the way (Python on Windows decodes piped stdin with the ANSI
# code page) and sent on as UTF-8. The check made then read the release and the notes file the
# same wrong way and called them equal. Here neither side is decoded: the section comes from
# git, the notes from jq's raw output, and cmp compares the bytes.
#
# usage: check-release-notes.sh <tag> [<release JSON file>]
#   <tag>           vX.Y.Z; the section is CHANGELOG.md's "## [X.Y.Z]" at that tag
#   <release JSON>  the release as GitHub's API returns it; without it, fetched from
#                   https://api.github.com/repos/$RELEASE_REPO/releases/tags/<tag>
#                   (RELEASE_REPO defaults to AlonRR/parametric-window-sealer)
#
# Line ends are compared as LF, and blank lines before and after are ignored on both sides:
# GitHub keeps the CRLF a browser sends, and the section's surroundings are not part of it.
# Exit 0: the notes are the section. 1: they differ, or either is missing. 2: usage, or a
# tag, file or tool that cannot be read.
set -uo pipefail
export LC_ALL=C

if [ $# -lt 1 ] || [ $# -gt 2 ] || [ -z "$1" ]; then
  echo "usage: $0 <tag> [<release JSON file>]" >&2
  exit 2
fi
TAG=$1
for tool in git jq cmp; do
  command -v "$tool" > /dev/null 2>&1 || {
    echo "$tool not found" >&2
    exit 2
  }
done
if ! git rev-parse -q --verify "refs/tags/$TAG" > /dev/null; then
  echo "no tag $TAG here: git fetch origin tag $TAG" >&2
  exit 2
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

if [ $# -eq 2 ]; then
  [ -r "$2" ] || {
    echo "cannot read $2" >&2
    exit 2
  }
  cp "$2" "$WORK/release.json"
else
  command -v curl > /dev/null 2>&1 || {
    echo "curl not found" >&2
    exit 2
  }
  url="https://api.github.com/repos/${RELEASE_REPO:-AlonRR/parametric-window-sealer}/releases/tags/$TAG"
  curl -sSf --max-time 30 "$url" -o "$WORK/release.json" || {
    echo "cannot fetch $url" >&2
    exit 2
  }
fi

# trim: LF line ends, no blank lines before the first line or after the last
trim() { tr -d '\r' | awk 'NF { for (; blank > 0; blank--) print ""; print; seen = 1; next } seen { blank++ }'; }

version=${TAG#v}
if ! git show "$TAG:CHANGELOG.md" > "$WORK/changelog.md" 2> /dev/null; then
  echo "no CHANGELOG.md at $TAG" >&2
  exit 2
fi
awk -v head="## [$version]" '
  index($0, head) == 1 { inside = 1; next }
  inside && /^## \[/ { exit }
  inside { print }
' "$WORK/changelog.md" | trim > "$WORK/section.md"
if [ ! -s "$WORK/section.md" ]; then
  echo "CHANGELOG.md at $TAG has no section ## [$version]" >&2
  exit 1
fi

if ! jq -e 'has("body")' "$WORK/release.json" > /dev/null 2>&1; then
  echo "not a release: no body field in the JSON" >&2
  exit 2
fi
jq -j '.body // ""' "$WORK/release.json" | trim > "$WORK/notes.md"
if [ ! -s "$WORK/notes.md" ]; then
  echo "the release for $TAG has no notes" >&2
  exit 1
fi

if cmp -s "$WORK/section.md" "$WORK/notes.md"; then
  echo "ok: the release notes for $TAG are CHANGELOG.md's [$version] section ($(wc -c < "$WORK/notes.md" | tr -d ' ') bytes)"
  exit 0
fi
echo "the release notes for $TAG differ from CHANGELOG.md's [$version] section:"
diff "$WORK/section.md" "$WORK/notes.md" | head -20
exit 1
