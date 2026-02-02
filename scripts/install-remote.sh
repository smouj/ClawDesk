#!/usr/bin/env bash
set -euo pipefail

REPO="smouj/ClawDesk"
BASE_URL="https://github.com/${REPO}"
CHANNEL="${CLAWDESK_CHANNEL:-stable}"
VERSION="${CLAWDESK_VERSION:-}"
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

fetch_latest_release() {
  local latest
  latest="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | \
    sed -n 's/.*"tag_name": *"\\([^"]*\\)".*/\\1/p' | head -n 1)"
  if [ -z "$latest" ]; then
    latest="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "${BASE_URL}/releases/latest" | \
      sed -n 's#.*/tag/##p')"
  fi
  if [ -z "$latest" ]; then
    echo "No se pudo detectar el latest release. Define CLAWDESK_VERSION manualmente." >&2
    exit 1
  fi
  echo "$latest"
}

if [ "$CHANNEL" = "stable" ]; then
  if [ -z "$VERSION" ]; then
    VERSION="$(fetch_latest_release)"
  fi
  ARCHIVE="clawdesk-${VERSION}.tar.gz"
  RELEASE_PATH="releases/download/${VERSION}/${ARCHIVE}"
  CHECKSUM_PATH="releases/download/${VERSION}/SHA256SUMS"
  echo "Descargando release ${VERSION} (${ARCHIVE})"
  if ! curl -fsSL "${BASE_URL}/${RELEASE_PATH}" -o "$TMP_DIR/${ARCHIVE}"; then
    echo "No se encontró el release ${VERSION} o el asset ${ARCHIVE}." >&2
    echo "Revisa https://github.com/${REPO}/releases o define CLAWDESK_VERSION." >&2
    exit 1
  fi
  if ! curl -fsSL "${BASE_URL}/${CHECKSUM_PATH}" -o "$TMP_DIR/SHA256SUMS"; then
    echo "No se encontró SHA256SUMS para ${VERSION}." >&2
    exit 1
  fi
  if ! (cd "$TMP_DIR" && grep "${ARCHIVE}" SHA256SUMS | $CHECKSUM_CMD -c -); then
    echo "Checksum inválido para ${ARCHIVE}." >&2
    exit 1
  fi
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
