#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "Uso: $0 vX.Y.Z" >&2
  exit 1
fi

ARCHIVE="clawdesk-${VERSION}.tar.gz"
SHA_FILE="SHA256SUMS"
STAGE_DIR="clawdesk-${VERSION}"

rm -f "$ARCHIVE" "$SHA_FILE"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

cp -R app server scripts config install.sh README.md LICENSE CHANGELOG.md package.json "$STAGE_DIR/"

tar -czf "$ARCHIVE" "$STAGE_DIR"

sha256sum "$ARCHIVE" > "$SHA_FILE"
rm -rf "$STAGE_DIR"

echo "Generated $ARCHIVE and $SHA_FILE"
