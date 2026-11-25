#!/bin/sh
# Builds the source archive that addons.mozilla.org requires for bundled/minified
# add-ons. It contains every file tracked by git (plus new, non-ignored files),
# so reviewers can rebuild dist-firefox/ with the steps in README.md.
set -eu

cd "$(dirname "$0")/.."
OUTPUT=sound-tools-source.zip
rm -f "$OUTPUT"

git ls-files --cached --others --exclude-standard |
  grep -v -E '\.zip$' |
  while IFS= read -r file; do
    # Skip files deleted from the working tree but still in the index.
    [ -f "$file" ] && printf '%s\n' "$file"
  done |
  zip -q "$OUTPUT" -@

echo "Source packaged as $OUTPUT"
