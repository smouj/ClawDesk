#!/usr/bin/env bash
set -euo pipefail

APP_NAME="clawdesk"
INSTALL_DIR="$HOME/.clawdesk"
BIN_DIR="$HOME/.local/bin"
CONFIG_DIR="$HOME/.config/clawdesk"
CONFIG_FILE="$CONFIG_DIR/config.yaml"

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
require_cmd tar

print_step "Preparando directorios"
mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$CONFIG_DIR"

if [ -f "$BIN_DIR/$APP_NAME" ]; then
  echo "Instalación existente detectada."
  echo "1) Actualizar"
  echo "2) Reparar"
  echo "3) Desinstalar"
  echo "4) Continuar"
  read -r -p "Selecciona una opción (1-4): " INSTALL_ACTION
  case "${INSTALL_ACTION:-4}" in
    1|2)
      echo "Continuando con actualización/reparación..."
      ;;
    3)
      print_step "Desinstalando"
      rm -rf "$INSTALL_DIR"
      rm -f "$BIN_DIR/$APP_NAME"
      rm -rf "$CONFIG_DIR"
      echo "Desinstalación completa."
      exit 0
      ;;
    4)
      echo "Continuando..."
      ;;
    *)
      echo "Opción inválida." >&2
      exit 1
      ;;
  esac
fi

print_step "Copiando assets"
cp -R app/* "$INSTALL_DIR/"
cp config/clawdesk.example.yaml "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"

print_step "Configuración guiada"
read -r -p "Puerto para el dashboard (default 4178): " PORT_INPUT
PORT="${PORT_INPUT:-4178}"
if [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "El puerto debe estar entre 1024 y 65535." >&2
  exit 1
fi

python3 - <<PY
import socket
port = int("${PORT}")
sock = socket.socket()
try:
    sock.bind(("127.0.0.1", port))
except OSError:
    raise SystemExit(f"El puerto {port} ya está en uso.")
finally:
    sock.close()
PY

read -r -p "URL del gateway (default http://127.0.0.1:18789): " GATEWAY_URL_INPUT
GATEWAY_URL="${GATEWAY_URL_INPUT:-http://127.0.0.1:18789}"

read -r -p "Ruta de gateway.auth.token (default ~/.config/openclaw/gateway.auth.token): " TOKEN_PATH_INPUT
TOKEN_PATH="${TOKEN_PATH_INPUT:-$HOME/.config/openclaw/gateway.auth.token}"

cat > "$CONFIG_FILE" <<CONFIG
configVersion: 1
app:
  host: 127.0.0.1
  port: $PORT
  theme: dark
gateway:
  url: $GATEWAY_URL
  token_path: $TOKEN_PATH
security:
  token_storage: keyring
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
chmod 600 "$CONFIG_FILE"

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
TOKEN_PATH=$(awk '/token_path:/{print $2}' "$CONFIG_FILE" | head -n1)
GATEWAY_URL=$(awk '/url:/{print $2}' "$CONFIG_FILE" | head -n1)

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
  doctor)
    echo "✅ Host: ${HOST}"
    echo "✅ Port: ${PORT}"
    if command -v openclaw >/dev/null 2>&1; then
      echo "✅ openclaw detectado"
    else
      echo "⚠️ openclaw no está en PATH"
    fi
    if [ -f "$TOKEN_PATH" ]; then
      echo "✅ Token encontrado en ${TOKEN_PATH}"
    else
      echo "⚠️ Token no encontrado en ${TOKEN_PATH}"
    fi
    python3 - <<PY
import socket
port = int("${PORT}")
sock = socket.socket()
try:
    sock.bind(("127.0.0.1", port))
    print("✅ Puerto disponible")
except OSError:
    print("⚠️ Puerto ocupado")
finally:
    sock.close()
PY
    echo "Gateway URL: ${GATEWAY_URL}"
    ;;
  bundle)
    BUNDLE_DIR="${HOME}/clawdesk-support"
    mkdir -p "$BUNDLE_DIR"
    sed 's/token_path:.*/token_path: [redacted]/' "$CONFIG_FILE" > "$BUNDLE_DIR/config.sanitized.yaml"
    tar -czf "$BUNDLE_DIR/support-bundle.tar.gz" -C "$BUNDLE_DIR" config.sanitized.yaml
    echo "Bundle generado en $BUNDLE_DIR/support-bundle.tar.gz"
    ;;
  uninstall)
    echo "Esto eliminará ${APP_DIR} y ${CONFIG_DIR}. Continuar? (y/N)"
    read -r CONFIRM
    if [ "${CONFIRM:-N}" != "y" ]; then
      echo "Cancelado."
      exit 0
    fi
    rm -rf "$APP_DIR" "$CONFIG_DIR"
    rm -f "$HOME/.local/bin/clawdesk"
    echo "Desinstalación completa."
    ;;
  *)
    echo "Uso: clawdesk [run|open|config|doctor|bundle|uninstall]"
    exit 1
    ;;
esac
SCRIPT
chmod +x "$BIN_DIR/${APP_NAME}"

print_step "Instalación completa"
echo "Ejecuta: ${APP_NAME} run"
