#!/usr/bin/env bash
set -euo pipefail

APP_NAME="clawdesk"
INSTALL_DIR="$HOME/.clawdesk"
APP_DIR="$INSTALL_DIR/app"
SERVER_DIR="$INSTALL_DIR/server"
BIN_DIR="$HOME/.local/bin"
CONFIG_DIR="$HOME/.config/clawdesk"
CONFIG_FILE="$CONFIG_DIR/config.json"
SECRET_FILE="$CONFIG_DIR/secret"
PID_FILE="$CONFIG_DIR/clawdesk.pid"
LOG_FILE="$CONFIG_DIR/clawdesk.log"

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
if [ "${CLAWDESK_WSL:-0}" = "1" ]; then
  IS_WSL=1
fi
if grep -qi microsoft /proc/version 2>/dev/null; then
  IS_WSL=1
fi

echo "Sistema: $OS_NAME"
if [ "$IS_WSL" -eq 1 ]; then
  echo "Entorno: WSL detectado. Recuerda que localhost es compartido con Windows."
fi

require_cmd node
require_cmd npm
require_cmd python3

print_step "Preparando directorios"
mkdir -p "$INSTALL_DIR" "$APP_DIR" "$SERVER_DIR" "$BIN_DIR" "$CONFIG_DIR"
USE_EXISTING_CONFIG=0

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
      rm -rf "$INSTALL_DIR" "$CONFIG_DIR"
      rm -f "$BIN_DIR/$APP_NAME"
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

if [ -f "$CONFIG_FILE" ]; then
  BACKUP_NAME="$CONFIG_FILE.bak-$(date +%Y%m%d%H%M%S)"
  print_step "Respaldando configuración existente"
  cp "$CONFIG_FILE" "$BACKUP_NAME"
  echo "Backup: $BACKUP_NAME"
  read -r -p "¿Deseas reconfigurar ahora? (y/N): " RECONFIGURE
  if [ "${RECONFIGURE:-N}" != "y" ]; then
    USE_EXISTING_CONFIG=1
    echo "Manteniendo configuración existente."
  fi
fi

print_step "Copiando assets"
rm -rf "$APP_DIR" "$SERVER_DIR"
mkdir -p "$APP_DIR" "$SERVER_DIR"
cp -R app/* "$APP_DIR/"
cp -R server/* "$SERVER_DIR/"
cp package.json "$INSTALL_DIR/"

print_step "Instalando dependencias Node.js"
( cd "$INSTALL_DIR" && npm install --production )

if [ "$USE_EXISTING_CONFIG" -eq 0 ]; then
  print_step "Configuración guiada"
  EXISTING_PORT="4178"
  EXISTING_GATEWAY_BIND="127.0.0.1"
  EXISTING_GATEWAY_PORT="18789"
  EXISTING_TOKEN_PATH="$HOME/.config/openclaw/gateway.auth.token"
  if [ -f "$CONFIG_FILE" ]; then
    read -r EXISTING_PORT EXISTING_GATEWAY_BIND EXISTING_GATEWAY_PORT EXISTING_TOKEN_PATH < <(python3 - <<PY
import json
from pathlib import Path
config = json.loads(Path("$CONFIG_FILE").read_text())
print(config.get("app", {}).get("port", 4178))
print(config.get("gateway", {}).get("bind", "127.0.0.1"))
print(config.get("gateway", {}).get("port", 18789))
print(config.get("gateway", {}).get("token_path", "$HOME/.config/openclaw/gateway.auth.token"))
PY
)
  fi

  read -r -p "Puerto para el dashboard (default ${EXISTING_PORT}): " PORT_INPUT
  PORT="${PORT_INPUT:-$EXISTING_PORT}"
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

  read -r -p "Bind del gateway (default ${EXISTING_GATEWAY_BIND}): " GATEWAY_BIND_INPUT
  GATEWAY_BIND="${GATEWAY_BIND_INPUT:-$EXISTING_GATEWAY_BIND}"
  if [ "$GATEWAY_BIND" != "127.0.0.1" ] && [ "$GATEWAY_BIND" != "localhost" ]; then
    echo "El gateway debe enlazarse a loopback por seguridad." >&2
    exit 1
  fi

  read -r -p "Puerto del gateway (default ${EXISTING_GATEWAY_PORT}): " GATEWAY_PORT_INPUT
  GATEWAY_PORT="${GATEWAY_PORT_INPUT:-$EXISTING_GATEWAY_PORT}"
  if [ "$GATEWAY_PORT" -lt 1024 ] || [ "$GATEWAY_PORT" -gt 65535 ]; then
    echo "El puerto del gateway debe estar entre 1024 y 65535." >&2
    exit 1
  fi
  GATEWAY_URL="http://${GATEWAY_BIND}:${GATEWAY_PORT}"

  read -r -p "Ruta de gateway.auth.token (default ${EXISTING_TOKEN_PATH}): " TOKEN_PATH_INPUT
  TOKEN_PATH="${TOKEN_PATH_INPUT:-$EXISTING_TOKEN_PATH}"

  cat > "$CONFIG_FILE" <<CONFIG
{
  "configVersion": 2,
  "app": {
    "host": "127.0.0.1",
    "port": $PORT,
    "theme": "dark"
  },
  "gateway": {
    "url": "$GATEWAY_URL",
    "bind": "$GATEWAY_BIND",
    "port": $GATEWAY_PORT,
    "token_path": "$TOKEN_PATH",
    "auth": {
      "token": ""
    }
  },
  "security": {
    "allow_actions": [
      "gateway.status",
      "gateway.logs",
      "gateway.probe",
      "gateway.dashboard",
      "gateway.start",
      "gateway.stop",
      "gateway.restart",
      "agent.list",
      "agent.start",
      "agent.stop",
      "agent.restart",
      "skills.list",
      "skills.enable",
      "skills.disable",
      "support.bundle",
      "secret.rotate"
    ]
  },
  "observability": {
    "log_poll_ms": 1500,
    "backoff_max_ms": 8000
  }
}
CONFIG
  chmod 600 "$CONFIG_FILE"
fi

if [ ! -f "$SECRET_FILE" ]; then
  python3 - <<PY
import secrets
from pathlib import Path
secret = secrets.token_hex(32)
path = Path("$SECRET_FILE")
path.write_text(secret)
path.chmod(0o600)
PY
fi

print_step "Creando comando ${APP_NAME}"
cat > "$BIN_DIR/${APP_NAME}" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="$HOME/.config/clawdesk"
INSTALL_DIR="$HOME/.clawdesk"
CONFIG_FILE="$CONFIG_DIR/config.json"
SECRET_FILE="$CONFIG_DIR/secret"
PID_FILE="$CONFIG_DIR/clawdesk.pid"
LOG_FILE="$CONFIG_DIR/clawdesk.log"

require_config() {
  if [ ! -f "$CONFIG_FILE" ]; then
    echo "No se encontró config.json en $CONFIG_DIR" >&2
    exit 1
  fi
}

read_config() {
  python3 - <<PY
import json
from pathlib import Path
config = json.loads(Path("$CONFIG_FILE").read_text())
print(config["app"]["host"])
print(config["app"]["port"])
print(config["gateway"]["token_path"])
print(config["gateway"]["url"])
print(config["gateway"].get("bind", "127.0.0.1"))
print(config["gateway"].get("port", 18789))
print(config.get("gateway", {}).get("auth", {}).get("token", ""))
PY
}

read_secret() {
  if [ ! -f "$SECRET_FILE" ]; then
    python3 - <<PY
import secrets
from pathlib import Path
secret = secrets.token_hex(32)
path = Path("$SECRET_FILE")
path.write_text(secret)
path.chmod(0o600)
print(secret)
PY
  else
    cat "$SECRET_FILE"
  fi
}

is_running() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

case "${1:-run}" in
  run)
    require_config
    read -r HOST PORT TOKEN_PATH GATEWAY_URL GATEWAY_BIND GATEWAY_PORT CONFIG_TOKEN < <(read_config)
    if is_running; then
      echo "ClawDesk ya está en ejecución (PID $(cat "$PID_FILE"))."
      exit 0
    fi
    echo "Iniciando ClawDesk en http://${HOST}:${PORT}"
    mkdir -p "$CONFIG_DIR"
    ( cd "$INSTALL_DIR" && nohup node server/index.js >> "$LOG_FILE" 2>&1 & echo $! > "$PID_FILE" )
    ;;
  status)
    require_config
    read -r HOST PORT TOKEN_PATH GATEWAY_URL GATEWAY_BIND GATEWAY_PORT CONFIG_TOKEN < <(read_config)
    if is_running; then
      echo "✅ Daemon activo (PID $(cat "$PID_FILE"))."
      SECRET=$(read_secret)
      python3 - <<PY
from urllib.request import Request, urlopen
url = "http://$HOST:$PORT/api/health"
req = Request(url, headers={"Authorization": "Bearer $SECRET"})
try:
    with urlopen(req, timeout=2) as resp:
        data = resp.read().decode()
        print("✅ API responde:", data)
except Exception as exc:
    print("⚠️ API no responde:", exc)
PY
    else
      echo "⚠️ Daemon detenido."
    fi
    ;;
  stop)
    if is_running; then
      PID=$(cat "$PID_FILE")
      kill "$PID"
      rm -f "$PID_FILE"
      echo "Daemon detenido."
    else
      echo "Daemon no está en ejecución."
    fi
    ;;
  open)
    require_config
    read -r HOST PORT TOKEN_PATH GATEWAY_URL GATEWAY_BIND GATEWAY_PORT CONFIG_TOKEN < <(read_config)
    echo "Abre en tu navegador: http://${HOST}:${PORT}"
    ;;
  config)
    require_config
    cat "$CONFIG_FILE"
    ;;
  doctor)
    require_config
    read -r HOST PORT TOKEN_PATH GATEWAY_URL GATEWAY_BIND GATEWAY_PORT CONFIG_TOKEN < <(read_config)
    echo "✅ Host: ${HOST}"
    echo "✅ Port: ${PORT}"
    if command -v openclaw >/dev/null 2>&1; then
      BIN="openclaw"
    elif command -v clawdbot >/dev/null 2>&1; then
      BIN="clawdbot"
    elif command -v moltbot >/dev/null 2>&1; then
      BIN="moltbot"
    else
      BIN=""
    fi
    if [ -n "$BIN" ]; then
      VERSION=$("$BIN" --version 2>/dev/null || true)
      echo "✅ ${BIN} detectado ${VERSION}"
    else
      echo "⚠️ openclaw/clawdbot/moltbot no está en PATH"
      echo "   Instala OpenClaw para habilitar acciones reales."
    fi
    TOKEN_SOURCE="missing"
    if [ -n "${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
      TOKEN_SOURCE="env"
    elif [ -n "$CONFIG_TOKEN" ]; then
      TOKEN_SOURCE="config"
    elif [ -f "$TOKEN_PATH" ]; then
      TOKEN_SOURCE="file"
    fi
    if [ "$TOKEN_SOURCE" = "file" ]; then
      echo "✅ Token encontrado en ${TOKEN_PATH} (source: file)"
    elif [ "$TOKEN_SOURCE" = "env" ]; then
      echo "✅ Token detectado por env (OPENCLAW_GATEWAY_TOKEN)"
    elif [ "$TOKEN_SOURCE" = "config" ]; then
      echo "✅ Token detectado en config.json"
    else
      echo "⚠️ Token no encontrado (source: missing)"
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
    PORT_SOURCE="config"
    if [ -n "${OPENCLAW_GATEWAY_PORT:-}" ]; then
      PORT_SOURCE="env"
      GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT}"
      GATEWAY_URL="http://${GATEWAY_BIND}:${GATEWAY_PORT}"
    fi
    echo "Gateway Bind: ${GATEWAY_BIND}"
    echo "Gateway Port: ${GATEWAY_PORT} (source: ${PORT_SOURCE})"
    echo "Gateway URL: ${GATEWAY_URL}"
    ;;
  secret)
    require_config
    if [ "${2:-}" != "rotate" ]; then
      echo "Uso: clawdesk secret rotate"
      exit 1
    fi
    python3 - <<PY
import secrets
from pathlib import Path
secret = secrets.token_hex(32)
path = Path("$SECRET_FILE")
path.write_text(secret)
path.chmod(0o600)
PY
    echo "Secret rotado. Reinicia el daemon y recarga el dashboard."
    ;;
  uninstall)
    echo "Esto eliminará ${INSTALL_DIR} y ${CONFIG_DIR}. Continuar? (y/N)"
    read -r CONFIRM
    if [ "${CONFIRM:-N}" != "y" ]; then
      echo "Cancelado."
      exit 0
    fi
    if is_running; then
      PID=$(cat "$PID_FILE")
      kill "$PID" || true
    fi
    rm -rf "$INSTALL_DIR" "$CONFIG_DIR"
    rm -f "$HOME/.local/bin/clawdesk"
    echo "Desinstalación completa."
    ;;
  *)
    echo "Uso: clawdesk [run|status|stop|open|config|doctor|secret rotate|uninstall]"
    exit 1
    ;;
esac
SCRIPT
chmod +x "$BIN_DIR/${APP_NAME}"

print_step "Instalación completa"
echo "Ejecuta: ${APP_NAME} run"
