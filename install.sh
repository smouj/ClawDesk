#!/usr/bin/env bash
set -euo pipefail

APP_NAME="clawdesk"
INSTALL_DIR="$HOME/.clawdesk"
BIN_DIR="$HOME/.local/bin"
CONFIG_DIR="$HOME/.config/clawdesk"

print_step() {
  printf "\n[%s] %s\n" "$(date +"%H:%M:%S")" "$1"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta el comando requerido: $1" >&2
    exit 1
  }
}

print_step "Detectando sistema operativo"
OS_NAME="$(uname -s)"
IS_WSL=0
if grep -qi microsoft /proc/version 2>/dev/null; then
  IS_WSL=1
fi

echo "Sistema: $OS_NAME"
if [ "$IS_WSL" -eq 1 ]; then
  echo "Entorno: WSL detectado. Recuerda que localhost es compartido con Windows."
fi

require_cmd python3

print_step "Preparando directorios"
mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$CONFIG_DIR"

print_step "Copiando assets"
cp -R app/* "$INSTALL_DIR/"
cp config/clawdesk.example.yaml "$CONFIG_DIR/config.yaml"
chmod 600 "$CONFIG_DIR/config.yaml"

print_step "Configuración guiada"
read -r -p "Puerto para el dashboard (default 4178): " PORT_INPUT
PORT="${PORT_INPUT:-4178}"
if [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "El puerto debe estar entre 1024 y 65535." >&2
  exit 1
fi

read -r -p "Ruta de gateway.auth.token (default ~/.config/openclaw/gateway.auth.token): " TOKEN_PATH_INPUT
TOKEN_PATH="${TOKEN_PATH_INPUT:-$HOME/.config/openclaw/gateway.auth.token}"

cat > "$CONFIG_DIR/config.yaml" <<CONFIG
app:
  host: 127.0.0.1
  port: $PORT
  theme: dark
security:
  token_storage: keyring
  token_path: $TOKEN_PATH
  allow_commands:
    - openclaw --version
    - openclaw gateway status
    - openclaw gateway logs --tail 200
    - openclaw agent list
    - openclaw agent start
    - openclaw agent stop
    - openclaw agent restart
    - openclaw agent clone
    - openclaw skills list
    - openclaw skills enable
    - openclaw skills disable
observability:
  log_poll_ms: 1500
  backoff_max_ms: 8000
CONFIG
chmod 600 "$CONFIG_DIR/config.yaml"

print_step "Creando comando ${APP_NAME}"
cat > "$BIN_DIR/${APP_NAME}" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="$HOME/.config/clawdesk"
APP_DIR="$HOME/.clawdesk"
CONFIG_FILE="$CONFIG_DIR/config.yaml"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "No se encontró config.yaml en $CONFIG_DIR" >&2
  exit 1
fi

HOST=$(awk '/host:/{print $2}' "$CONFIG_FILE" | head -n1)
PORT=$(awk '/port:/{print $2}' "$CONFIG_FILE" | head -n1)

case "${1:-run}" in
  run)
    echo "ClawDesk disponible en http://${HOST}:${PORT}"
    python3 -m http.server "$PORT" --directory "$APP_DIR" --bind "$HOST"
    ;;
  open)
    echo "Abre en tu navegador: http://${HOST}:${PORT}"
    ;;
  config)
    cat "$CONFIG_FILE"
    ;;
  *)
    echo "Uso: clawdesk [run|open|config]"
    exit 1
    ;;
esac
SCRIPT
chmod +x "$BIN_DIR/${APP_NAME}"

print_step "Instalación completa"
echo "Ejecuta: ${APP_NAME} run"
