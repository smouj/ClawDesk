#!/usr/bin/env bash
set -euo pipefail

REPO="smouj/ClawDesk"
API_URL="https://api.github.com/repos/${REPO}"
TMP_DIR="$(mktemp -d)"
CHANNEL="${CLAWDESK_CHANNEL:-stable}"
VERSION="${CLAWDESK_VERSION:-}"

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

resolve_release_assets() {
  local version="$1"
  local release_url="${API_URL}/releases/tags/${version}"
  local release_json
  release_json="$(curl -fsSL "$release_url")" || return 1
  printf '%s' "$release_json" | python3 - <<'PY'
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print("")
    print("")
    raise SystemExit(0)
assets = data.get("assets", [])


def pick(suffix):
    for asset in assets:
        name = asset.get("name", "")
        if name.endswith(suffix):
            return asset.get("browser_download_url", "")
    return ""

print(pick(".tar.gz"))
print(pick(".sha256"))
PY
}

install_from_release() {
  local version="$1"
  local tar_url checksum_url
  read -r tar_url checksum_url < <(resolve_release_assets "$version")
  if [ -z "$tar_url" ] || [ -z "$checksum_url" ]; then
    echo "No existen assets (.tar.gz/.sha256) para ${version}." >&2
    echo "Publica un release válido o usa CLAWDESK_CHANNEL=nightly." >&2
    exit 1
  fi

  local archive_path="$TMP_DIR/clawdesk.tar.gz"
  local checksum_path="$TMP_DIR/clawdesk.sha256"

  echo "Descargando ${tar_url}"
  curl -fsSL "$tar_url" -o "$archive_path"
  echo "Descargando checksum ${checksum_url}"
  curl -fsSL "$checksum_url" -o "$checksum_path"

  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$TMP_DIR" && sha256sum -c "$(basename "$checksum_path")")
  elif command -v shasum >/dev/null 2>&1; then
    (cd "$TMP_DIR" && shasum -a 256 -c "$(basename "$checksum_path")")
  else
    echo "Falta sha256sum o shasum para validar el checksum." >&2
    exit 1
  fi

  tar -xzf "$archive_path" -C "$TMP_DIR"
  local extracted
  extracted="$(find "$TMP_DIR" -maxdepth 2 -type d -name "ClawDesk*" | head -n 1)"
  if [ -z "$extracted" ]; then
    echo "No se pudo encontrar el directorio extraído." >&2
    exit 1
  fi

  echo "Ejecutando instalador local"
  (cd "$extracted" && bash install.sh)
}

install_from_nightly() {
  require_cmd git
  echo "⚠️ Canal nightly seleccionado: se instalará desde main (sin release estable)."
  local repo_dir="$TMP_DIR/ClawDesk"
  git clone --depth 1 https://github.com/${REPO}.git "$repo_dir"
  (cd "$repo_dir" && bash install.sh)
}

echo "ClawDesk remote installer"

echo "Canal: ${CHANNEL}"
if [ "$CHANNEL" = "nightly" ]; then
  install_from_nightly
  exit 0
fi

if [ -z "$VERSION" ] || [ "$VERSION" = "latest" ] || [ "$VERSION" = "auto" ]; then
  VERSION="$(resolve_latest_version)"
  if [ -z "$VERSION" ]; then
    echo "No se pudo resolver latest release." >&2
    echo "Define CLAWDESK_VERSION=vX.Y.Z o usa CLAWDESK_CHANNEL=nightly." >&2
    exit 1
  fi
fi

echo "Versión solicitada: ${VERSION}"
install_from_release "$VERSION"
