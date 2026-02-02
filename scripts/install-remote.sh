#!/usr/bin/env bash
set -euo pipefail

REPO="smouj/ClawDesk"
REPO_URL="https://github.com/${REPO}.git"
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

require_cmd git

INSTALL_SRC="${TMP_DIR}/ClawDesk"
echo "Clonando repositorio (${REF})"
git clone --depth 1 --branch "$REF" "$REPO_URL" "$INSTALL_SRC"

if [ ! -d "$INSTALL_SRC" ]; then
  echo "No se encontró el directorio clonado." >&2
  exit 1
fi

(cd "$INSTALL_SRC" && bash install.sh)
