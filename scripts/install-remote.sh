#!/usr/bin/env bash
set -euo pipefail

REPO="smouj/ClawDesk"
API_URL="https://api.github.com/repos/${REPO}"
FALLBACK_VERSION="v2.0.0"
TMP_DIR="$(mktemp -d)"
VERSION="${CLAWDESK_VERSION:-auto}"

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
require_cmd python3

resolve_latest_version() {
  curl -fsSL "${API_URL}/releases/latest" | python3 - <<'PY'
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get("tag_name", ""))
except Exception:
    print("")
PY
}

download_release_assets() {
  local version="$1"
  local release_url="${API_URL}/releases/tags/${version}"
  local release_json
  release_json="$(curl -fsSL "$release_url")" || return 1
  local tarball
  tarball="$(printf '%s' "$release_json" | python3 - <<'PY'
import json, sys
data = json.load(sys.stdin)
assets = data.get("assets", [])
tarball = next((a["browser_download_url"] for a in assets if a["name"].endswith(".tar.gz")), "")
checksum = next((a["browser_download_url"] for a in assets if a["name"].endswith(".sha256")), "")
print(tarball)
print(checksum)
PY
)"
  local tar_url checksum_url
  tar_url="$(echo "$tarball" | sed -n '1p')"
  checksum_url="$(echo "$tarball" | sed -n '2p')"
  if [ -z "$tar_url" ] || [ -z "$checksum_url" ]; then
    return 1
  fi
  echo "$tar_url"
  echo "$checksum_url"
}

echo "ClawDesk remote installer"
echo "Versión solicitada: ${VERSION}"

if [ "$VERSION" = "auto" ] || [ "$VERSION" = "latest" ]; then
  VERSION="$(resolve_latest_version)"
  if [ -z "$VERSION" ]; then
    echo "No se pudo resolver latest. Usando fallback ${FALLBACK_VERSION}." >&2
    VERSION="$FALLBACK_VERSION"
  fi
fi

read -r TARBALL_URL CHECKSUM_URL < <(download_release_assets "$VERSION" || true)
if [ -z "${TARBALL_URL:-}" ] || [ -z "${CHECKSUM_URL:-}" ]; then
  echo "No se pudieron resolver assets de release para ${VERSION}." >&2
  echo "Asegúrate de que exista un .tar.gz y su .sha256 en GitHub Releases." >&2
  exit 1
fi

ARCHIVE_PATH="${TMP_DIR}/clawdesk.tar.gz"
CHECKSUM_PATH="${TMP_DIR}/clawdesk.sha256"

echo "Descargando ${TARBALL_URL}"
curl -fsSL "$TARBALL_URL" -o "$ARCHIVE_PATH"
echo "Descargando checksum ${CHECKSUM_URL}"
curl -fsSL "$CHECKSUM_URL" -o "$CHECKSUM_PATH"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$TMP_DIR" && sha256sum -c "$(basename "$CHECKSUM_PATH")")
elif command -v shasum >/dev/null 2>&1; then
  (cd "$TMP_DIR" && shasum -a 256 -c "$(basename "$CHECKSUM_PATH")")
else
  echo "Falta sha256sum o shasum para validar el checksum." >&2
  exit 1
fi

INSTALL_SRC="${TMP_DIR}/ClawDesk"
mkdir -p "$INSTALL_SRC"
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"
EXTRACTED="$(find "$TMP_DIR" -maxdepth 2 -type d -name "ClawDesk*" | head -n 1)"
if [ -z "$EXTRACTED" ]; then
  echo "No se pudo encontrar el directorio extraído." >&2
  exit 1
fi

echo "Ejecutando instalador local"
(cd "$EXTRACTED" && bash install.sh)
