#!/usr/bin/env bash
set -euo pipefail

REPO="smouj/ClawDesk"
BASE_URL="https://github.com/${REPO}"
CHANNEL="${CLAWDESK_CHANNEL:-stable}"
VERSION="${CLAWDESK_VERSION:-v1.2.0}"
REF="${CLAWDESK_REF:-main}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta el comando requerido: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd tar
if command -v sha256sum >/dev/null 2>&1; then
  CHECKSUM_CMD="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  CHECKSUM_CMD="shasum -a 256"
else
  echo "Falta sha256sum o shasum para verificación de checksum." >&2
  exit 1
fi

if [ "$CHANNEL" = "stable" ]; then
  ARCHIVE="clawdesk-${VERSION}.tar.gz"
  RELEASE_PATH="releases/download/${VERSION}/${ARCHIVE}"
  CHECKSUM_PATH="releases/download/${VERSION}/SHA256SUMS"
  echo "Descargando release ${VERSION} (${ARCHIVE})"
  curl -fsSL "${BASE_URL}/${RELEASE_PATH}" -o "$TMP_DIR/${ARCHIVE}"
  curl -fsSL "${BASE_URL}/${CHECKSUM_PATH}" -o "$TMP_DIR/SHA256SUMS"
  (cd "$TMP_DIR" && grep "${ARCHIVE}" SHA256SUMS | $CHECKSUM_CMD -c -)
  tar -xzf "$TMP_DIR/${ARCHIVE}" -C "$TMP_DIR"
  INSTALL_SRC="$TMP_DIR/clawdesk-${VERSION}"
else
  ARCHIVE="${REF}.tar.gz"
  echo "Descargando nightly (${REF})"
  curl -fsSL "${BASE_URL}/archive/refs/heads/${REF}.tar.gz" -o "$TMP_DIR/${ARCHIVE}"
  tar -xzf "$TMP_DIR/${ARCHIVE}" -C "$TMP_DIR"
  INSTALL_SRC="$TMP_DIR/ClawDesk-${REF}"
fi

if [ ! -d "$INSTALL_SRC" ]; then
  echo "No se encontró el directorio extraído." >&2
  exit 1
fi

(cd "$INSTALL_SRC" && bash install.sh)
