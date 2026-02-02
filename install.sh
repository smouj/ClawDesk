#!/usr/bin/env bash
set -euo pipefail

APP_NAME="clawdesk"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/.clawdesk"
APP_DIR="$INSTALL_DIR/app"
SERVER_DIR="$INSTALL_DIR/server"
BIN_DIR_LOCAL="$HOME/.local/bin"
BIN_DIR_GLOBAL="/usr/local/bin"
CONFIG_DIR="$HOME/.config/clawdesk"
CONFIG_FILE="$CONFIG_DIR/config.json"
SECRET_FILE="$CONFIG_DIR/secret"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SYSTEMD_USER_DIR/clawdesk.service"

NONINTERACTIVE="${INSTALL_NONINTERACTIVE:-0}"
TOTAL_STEPS=7
CURRENT_STEP=0

USE_COLOR=1
if [ ! -t 1 ] || [ "${NO_COLOR:-}" = "1" ]; then
  USE_COLOR=0
fi
if [ "$USE_COLOR" -eq 1 ]; then
  C_RESET="$(printf '\033[0m')"
  C_BOLD="$(printf '\033[1m')"
  C_DIM="$(printf '\033[2m')"
  C_BLUE="$(printf '\033[34m')"
  C_CYAN="$(printf '\033[36m')"
  C_GREEN="$(printf '\033[32m')"
  C_YELLOW="$(printf '\033[33m')"
  C_RED="$(printf '\033[31m')"
else
  C_RESET=""
  C_BOLD=""
  C_DIM=""
  C_BLUE=""
  C_CYAN=""
  C_GREEN=""
  C_YELLOW=""
  C_RED=""
fi

banner() {
  cat <<'BANNER'
   ██████╗██╗      █████╗ ██╗    ██╗██████╗ ███████╗███████╗██╗  ██╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗██╔════╝██╔════╝██║ ██╔╝
  ██║     ██║     ███████║██║ █╗ ██║██║  ██║█████╗  ███████╗█████╔╝
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║██╔══╝  ╚════██║██╔═██╗
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝███████╗███████║██║  ██╗
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
BANNER
  printf "%sInstalador oficial · Security-first · Loopback-only%s\n" "$C_CYAN" "$C_RESET"
}

log_step() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  printf "\n%s[%s/%s]%s %s\n" "$C_BOLD" "$CURRENT_STEP" "$TOTAL_STEPS" "$C_RESET" "$1"
}

log_info() {
  printf "%s[INFO]%s %s\n" "$C_BLUE" "$C_RESET" "$1"
}

log_ok() {
  printf "%s[ OK ]%s %s\n" "$C_GREEN" "$C_RESET" "$1"
}

log_warn() {
  printf "%s[WARN]%s %s\n" "$C_YELLOW" "$C_RESET" "$1"
}

log_fail() {
  printf "%s[FAIL]%s %s\n" "$C_RED" "$C_RESET" "$1" >&2
}

prompt_default() {
  local prompt="$1"
  local default="$2"
  if [ "$NONINTERACTIVE" = "1" ]; then
    printf "%s" "$default"
    return
  fi
  read -r -p "$prompt" reply
  if [ -z "$reply" ]; then
    printf "%s" "$default"
  else
    printf "%s" "$reply"
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_fail "Falta el comando requerido: $1"
    return 1
  fi
  return 0
}

install_hint() {
  case "$1" in
    node)
      log_warn "Instala Node.js >= 18 (Ubuntu/WSL: sudo apt-get install -y nodejs npm | macOS: brew install node)"
      ;;
    npm)
      log_warn "Instala npm (Ubuntu/WSL: sudo apt-get install -y npm | macOS: brew install node)"
      ;;
    curl)
      log_warn "Instala curl (Ubuntu/WSL: sudo apt-get install -y curl | macOS: brew install curl)"
      ;;
    tar)
      log_warn "Instala tar (Ubuntu/WSL: sudo apt-get install -y tar | macOS: brew install gnu-tar)"
      ;;
    jq)
      log_warn "Instala jq si quieres inspección avanzada (Ubuntu/WSL: sudo apt-get install -y jq | macOS: brew install jq)"
      ;;
    python3)
      log_warn "Instala python3 (Ubuntu/WSL: sudo apt-get install -y python3 | macOS: brew install python@3)"
      ;;
    *)
      log_warn "Instala el comando: $1"
      ;;
  esac
}

check_node_version() {
  local required_major=18
  local version
  version=$(node -p "process.versions.node" 2>/dev/null || echo "0.0.0")
  local major=${version%%.*}
  if [ "$major" -lt "$required_major" ]; then
    log_fail "Node.js $version detectado. Requiere Node.js >= $required_major."
    install_hint node
    exit 1
  fi
  log_ok "Node.js $version"
}

ensure_repo_layout() {
  if [ ! -d "$REPO_DIR/app" ] || [ ! -d "$REPO_DIR/server" ] || [ ! -f "$REPO_DIR/package.json" ]; then
    log_fail "Este script debe ejecutarse desde la raíz del repo ClawDesk."
    exit 1
  fi
}

detect_wsl() {
  local is_wsl=0
  if [ "${CLAWDESK_WSL:-0}" = "1" ]; then
    is_wsl=1
  fi
  if grep -qi microsoft /proc/version 2>/dev/null; then
    is_wsl=1
  fi
  echo "$is_wsl"
}

find_openclaw_bin() {
  for candidate in openclaw clawdbot moltbot; do
    if command -v "$candidate" >/dev/null 2>&1; then
      echo "$candidate"
      return
    fi
  done
  echo ""
}

mask_token() {
  local token="$1"
  if [ -z "$token" ]; then
    echo ""
    return
  fi
  local len=${#token}
  if [ "$len" -le 4 ]; then
    echo "****"
  else
    echo "****${token: -4}"
  fi
}

ensure_config() {
  mkdir -p "$CONFIG_DIR"
  if [ -f "$CONFIG_FILE" ]; then
    local backup="$CONFIG_FILE.bak-$(date +%Y%m%d%H%M%S)"
    cp "$CONFIG_FILE" "$backup"
    log_ok "Backup de config creado en $backup"
  fi
}

read_config_defaults() {
  if [ -f "$CONFIG_FILE" ]; then
    python3 - <<PY
import json
from pathlib import Path
config = json.loads(Path("$CONFIG_FILE").read_text())
app = config.get("app", {})
profiles = config.get("profiles", {})
active = config.get("activeProfile", "local")
profile = profiles.get(active) or profiles.get("local") or {}
print(app.get("port", 4178))
print(profile.get("bind", "127.0.0.1"))
print(profile.get("port", 18789))
print(profile.get("token_path", str(Path.home() / ".config/openclaw/gateway.auth.token")))
PY
  else
    echo "4178"
    echo "127.0.0.1"
    echo "18789"
    echo "$HOME/.config/openclaw/gateway.auth.token"
  fi
}

validate_port() {
  local label="$1"
  local port="$2"
  if [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
    log_fail "$label debe estar entre 1024 y 65535."
    exit 1
  fi
}

check_port_available() {
  local port="$1"
  python3 - <<PY
import socket
port = int("$port")
sock = socket.socket()
try:
    sock.bind(("127.0.0.1", port))
    print("available")
except OSError:
    print("busy")
finally:
    sock.close()
PY
}

check_tcp() {
  local host="$1"
  local port="$2"
  python3 - <<PY
import socket
host = "$host"
port = int("$port")
try:
    sock = socket.create_connection((host, port), timeout=1.5)
    sock.close()
    print("open")
except Exception:
    print("closed")
PY
}

write_config() {
  local app_port="$1"
  local gateway_bind="$2"
  local gateway_port="$3"
  local token_path="$4"
  local token_value="$5"

  python3 - <<PY
import json
from pathlib import Path
config = {
  "configVersion": 3,
  "app": {
    "host": "127.0.0.1",
    "port": int("$app_port"),
    "theme": "dark",
  },
  "profiles": {
    "local": {
      "name": "local",
      "bind": "$gateway_bind",
      "port": int("$gateway_port"),
      "token_path": "$token_path",
      "auth": {
        "token": "$token_value",
      },
    }
  },
  "activeProfile": "local",
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
      "secret.rotate",
      "profiles.read",
      "profiles.activate",
      "profiles.write",
      "profiles.delete",
      "macros.read",
      "macros.run",
      "macros.write",
      "usage.read",
      "usage.export",
      "events.read",
    ],
    "enableRemoteProfiles": False,
    "allowedRemoteHosts": [],
    "allowedOrigins": [],
  },
  "macros": {},
  "observability": {
    "log_poll_ms": 1500,
    "backoff_max_ms": 8000,
  },
}
Path("$CONFIG_FILE").write_text(json.dumps(config, indent=2))
PY
  chmod 600 "$CONFIG_FILE"
}

ensure_secret() {
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
}

install_service() {
  if ! command -v systemctl >/dev/null 2>&1; then
    log_warn "systemctl no disponible. Se omite el servicio systemd."
    return
  fi
  mkdir -p "$SYSTEMD_USER_DIR"
  cat > "$SERVICE_FILE" <<SERVICE
[Unit]
Description=ClawDesk local dashboard
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/env node $INSTALL_DIR/server/index.js
Restart=on-failure
RestartSec=2
Environment=CLAWDESK_CONFIG_DIR=$CONFIG_DIR
Environment=CLAWDESK_CONFIG_PATH=$CONFIG_FILE
Environment=CLAWDESK_SECRET_PATH=$SECRET_FILE

[Install]
WantedBy=default.target
SERVICE

  if systemctl --user daemon-reload >/dev/null 2>&1; then
    log_ok "Servicio systemd (user) instalado"
  else
    log_warn "No se pudo recargar systemd --user. Se usará modo manual."
  fi
}

create_cli() {
  local target_dir="$1"
  mkdir -p "$target_dir"
  cat > "$INSTALL_DIR/bin/$APP_NAME" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="clawdesk"
INSTALL_DIR="$HOME/.clawdesk"
CONFIG_DIR="$HOME/.config/clawdesk"
CONFIG_FILE="$CONFIG_DIR/config.json"
SECRET_FILE="$CONFIG_DIR/secret"
PID_FILE="$CONFIG_DIR/clawdesk.pid"
LOG_FILE="$CONFIG_DIR/clawdesk.log"
SERVICE_FILE="$HOME/.config/systemd/user/clawdesk.service"

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
app = config.get("app", {})
profiles = config.get("profiles", {})
active = config.get("activeProfile", "local")
profile = profiles.get(active) or profiles.get("local") or {}
print(app.get("host", "127.0.0.1"))
print(app.get("port", 4178))
print(profile.get("bind", "127.0.0.1"))
print(profile.get("port", 18789))
print(profile.get("token_path", ""))
print(profile.get("auth", {}).get("token", ""))
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

mask_token() {
  local token="$1"
  if [ -z "$token" ]; then
    echo ""
    return
  fi
  local len=${#token}
  if [ "$len" -le 4 ]; then
    echo "****"
  else
    echo "****${token: -4}"
  fi
}

is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

use_systemd() {
  if [ -f "$SERVICE_FILE" ] && command -v systemctl >/dev/null 2>&1; then
    systemctl --user status clawdesk >/dev/null 2>&1
    return 0
  fi
  return 1
}

start_manual() {
  if is_running; then
    echo "ClawDesk ya está en ejecución (PID $(cat "$PID_FILE"))."
    return
  fi
  mkdir -p "$CONFIG_DIR"
  ( cd "$INSTALL_DIR" && nohup node server/index.js >> "$LOG_FILE" 2>&1 & echo $! > "$PID_FILE" )
  echo "ClawDesk iniciado en background."
}

stop_manual() {
  if is_running; then
    local pid
    pid=$(cat "$PID_FILE")
    kill "$pid" || true
    rm -f "$PID_FILE"
    echo "ClawDesk detenido."
  else
    echo "ClawDesk no está en ejecución."
  fi
}

status_manual() {
  require_config
  read -r host port gateway_bind gateway_port token_path token_value < <(read_config)
  if is_running; then
    echo "✅ Daemon activo (PID $(cat "$PID_FILE"))."
    secret=$(read_secret)
    python3 - <<PY
from urllib.request import Request, urlopen
url = "http://$host:$port/api/health"
req = Request(url, headers={"Authorization": "Bearer $secret"})
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
}

run_doctor() {
  require_config
  read -r host port gateway_bind gateway_port token_path token_value < <(read_config)

  echo "✅ Host: ${host}"
  echo "✅ Port: ${port}"

  local bin=""
  for candidate in openclaw clawdbot moltbot; do
    if command -v "$candidate" >/dev/null 2>&1; then
      bin="$candidate"
      break
    fi
  done
  if [ -n "$bin" ]; then
    local version
    version=$($bin --version 2>/dev/null || true)
    echo "✅ ${bin} detectado ${version}"
  else
    echo "⚠️ openclaw/clawdbot/moltbot no está en PATH"
    echo "   Instala OpenClaw para habilitar acciones reales."
  fi

  local token_source="missing"
  if [ -n "${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
    token_source="env"
  elif [ -n "$token_value" ]; then
    token_source="config"
  elif [ -n "$token_path" ] && [ -f "$token_path" ]; then
    token_source="file"
  fi

  if [ "$token_source" = "file" ]; then
    token_value=$(cat "$token_path")
    echo "✅ Token encontrado en ${token_path} (source: file)"
  elif [ "$token_source" = "env" ]; then
    token_value="$OPENCLAW_GATEWAY_TOKEN"
    echo "✅ Token detectado por env (OPENCLAW_GATEWAY_TOKEN)"
  elif [ "$token_source" = "config" ]; then
    echo "✅ Token detectado en config.json"
  else
    echo "⚠️ Token no encontrado (source: missing)"
  fi

  if [ -n "$token_value" ] && [ "$token_source" != "config" ]; then
    python3 - <<PY
import json
from pathlib import Path
config_path = Path("$CONFIG_FILE")
config = json.loads(config_path.read_text())
profiles = config.get("profiles", {})
active = config.get("activeProfile", "local")
profile = profiles.get(active) or profiles.get("local") or {}
profile.setdefault("auth", {})["token"] = "$token_value"
profiles[active] = profile
config["profiles"] = profiles
config_path.write_text(json.dumps(config, indent=2))
PY
    echo "✅ Token sincronizado en config.json (oculto: $(mask_token "$token_value"))"
  fi

  python3 - <<PY
import socket
port = int("$port")
sock = socket.socket()
try:
    sock.bind(("127.0.0.1", port))
    print("✅ Puerto disponible")
except OSError:
    print("⚠️ Puerto ocupado")
finally:
    sock.close()
PY

  local port_source="config"
  if [ -n "${OPENCLAW_GATEWAY_PORT:-}" ]; then
    port_source="env"
    gateway_port="$OPENCLAW_GATEWAY_PORT"
  fi
  echo "Gateway Bind: ${gateway_bind}"
  echo "Gateway Port: ${gateway_port} (source: ${port_source})"

  python3 - <<PY
import socket
import time
host = "$gateway_bind"
port = int("$gateway_port")
start = time.time()
try:
    sock = socket.create_connection((host, port), timeout=1.5)
    sock.close()
    duration = int((time.time() - start) * 1000)
    print(f"✅ Gateway TCP OK ({duration} ms)")
except Exception as exc:
    print(f"⚠️ Gateway no responde en {host}:{port} ({exc})")
PY

  if [ -n "$bin" ]; then
    if OPENCLAW_GATEWAY_PORT="$gateway_port" OPENCLAW_GATEWAY_TOKEN="$token_value" $bin gateway status >/dev/null 2>&1; then
      echo "✅ Gateway status OK (via ${bin})"
    else
      echo "⚠️ Gateway status falló (via ${bin})"
    fi
  fi

  if [ -z "$token_value" ]; then
    echo "Sugerencia: export OPENCLAW_GATEWAY_TOKEN=... o coloca el token en ${token_path}."
  fi
}

case "${1:-run}" in
  run|start)
    require_config
    if use_systemd; then
      systemctl --user start clawdesk
      echo "ClawDesk iniciado (systemd user)."
    else
      start_manual
    fi
    ;;
  restart)
    require_config
    if use_systemd; then
      systemctl --user restart clawdesk
      echo "ClawDesk reiniciado (systemd user)."
    else
      stop_manual
      start_manual
    fi
    ;;
  status)
    if use_systemd; then
      systemctl --user status clawdesk --no-pager
    else
      status_manual
    fi
    ;;
  stop)
    if use_systemd; then
      systemctl --user stop clawdesk
      echo "ClawDesk detenido (systemd user)."
    else
      stop_manual
    fi
    ;;
  open)
    require_config
    read -r host port gateway_bind gateway_port token_path token_value < <(read_config)
    echo "Abre en tu navegador: http://${host}:${port}"
    ;;
  config)
    require_config
    cat "$CONFIG_FILE"
    ;;
  doctor)
    run_doctor
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
    echo "Esto eliminará $INSTALL_DIR y $CONFIG_DIR. Continuar? (y/N)"
    read -r confirm
    if [ "${confirm:-N}" != "y" ]; then
      echo "Cancelado."
      exit 0
    fi
    if use_systemd; then
      systemctl --user stop clawdesk || true
      systemctl --user disable clawdesk || true
    else
      stop_manual
    fi
    rm -rf "$INSTALL_DIR" "$CONFIG_DIR"
    rm -f "$HOME/.local/bin/clawdesk" "/usr/local/bin/clawdesk"
    echo "Desinstalación completa."
    ;;
  *)
    echo "Uso: clawdesk [run|start|stop|restart|status|open|config|doctor|secret rotate|uninstall]"
    exit 1
    ;;
esac
SCRIPT
  chmod +x "$INSTALL_DIR/bin/$APP_NAME"
  ln -sf "$INSTALL_DIR/bin/$APP_NAME" "$target_dir/$APP_NAME"
  log_ok "Comando instalado en $target_dir/$APP_NAME"
}

banner
log_info "Tip: instala con git clone + bash install.sh"

log_step "Detectando sistema y dependencias"
ensure_repo_layout

OS_NAME="$(uname -s)"
IS_WSL="$(detect_wsl)"
log_info "Sistema: $OS_NAME"
if [ "$IS_WSL" = "1" ]; then
  log_warn "WSL detectado. Recuerda que localhost es compartido con Windows."
fi

missing=0
for cmd in bash node npm curl tar python3; do
  if ! require_cmd "$cmd"; then
    install_hint "$cmd"
    missing=1
  else
    log_ok "${cmd} disponible"
  fi
done
if [ "$missing" -eq 1 ]; then
  log_fail "Dependencias faltantes. Instálalas y reintenta."
  exit 1
fi
check_node_version

log_step "Preparando directorios"
mkdir -p "$INSTALL_DIR" "$INSTALL_DIR/bin" "$APP_DIR" "$SERVER_DIR" "$BIN_DIR_LOCAL" "$CONFIG_DIR"
if [ ! -w "$INSTALL_DIR" ]; then
  log_fail "No hay permisos de escritura en $INSTALL_DIR"
  exit 1
fi

log_step "Copiando archivos de la app"
rm -rf "$APP_DIR" "$SERVER_DIR"
mkdir -p "$APP_DIR" "$SERVER_DIR"
cp -R "$REPO_DIR/app/." "$APP_DIR/"
cp -R "$REPO_DIR/server/." "$SERVER_DIR/"
cp "$REPO_DIR/package.json" "$INSTALL_DIR/"
cp "$REPO_DIR/package-lock.json" "$INSTALL_DIR/" 2>/dev/null || true
log_ok "Assets copiados"

log_step "Instalando dependencias Node.js"
if [ -f "$INSTALL_DIR/package-lock.json" ]; then
  ( cd "$INSTALL_DIR" && npm ci --omit=dev )
else
  ( cd "$INSTALL_DIR" && npm install --omit=dev )
fi
log_ok "Dependencias instaladas"

log_step "Configuración y auto-sincronización OpenClaw"
ensure_config
read -r DEFAULT_APP_PORT DEFAULT_GATEWAY_BIND DEFAULT_GATEWAY_PORT DEFAULT_TOKEN_PATH < <(read_config_defaults)

APP_PORT=$(prompt_default "Puerto para el dashboard (default ${DEFAULT_APP_PORT}): " "$DEFAULT_APP_PORT")
validate_port "Puerto de dashboard" "$APP_PORT"

if [ "$(check_port_available "$APP_PORT")" = "busy" ]; then
  log_fail "El puerto $APP_PORT ya está en uso."
  exit 1
fi

GATEWAY_BIND=$(prompt_default "Bind del gateway (default ${DEFAULT_GATEWAY_BIND}): " "$DEFAULT_GATEWAY_BIND")
if [ "$GATEWAY_BIND" != "127.0.0.1" ] && [ "$GATEWAY_BIND" != "localhost" ]; then
  log_fail "El gateway debe enlazarse a loopback por seguridad."
  exit 1
fi

GATEWAY_PORT=$(prompt_default "Puerto del gateway (default ${DEFAULT_GATEWAY_PORT}): " "$DEFAULT_GATEWAY_PORT")
validate_port "Puerto del gateway" "$GATEWAY_PORT"

TOKEN_PATH=$(prompt_default "Ruta de gateway.auth.token (default ${DEFAULT_TOKEN_PATH}): " "$DEFAULT_TOKEN_PATH")

OPENCLAW_BIN=$(find_openclaw_bin)
if [ -n "$OPENCLAW_BIN" ]; then
  log_ok "${OPENCLAW_BIN} detectado"
else
  log_warn "OpenClaw no encontrado en PATH."
fi

TOKEN_VALUE=""
TOKEN_SOURCE="missing"
if [ -n "${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
  TOKEN_VALUE="$OPENCLAW_GATEWAY_TOKEN"
  TOKEN_SOURCE="env"
elif [ -n "$TOKEN_PATH" ] && [ -f "$TOKEN_PATH" ]; then
  TOKEN_VALUE="$(cat "$TOKEN_PATH")"
  TOKEN_SOURCE="file"
fi

if [ -n "$TOKEN_VALUE" ]; then
  log_ok "Token detectado (${TOKEN_SOURCE}), oculto: $(mask_token "$TOKEN_VALUE")"
else
  log_warn "Token no encontrado. Puedes exportar OPENCLAW_GATEWAY_TOKEN o crear $TOKEN_PATH"
fi

write_config "$APP_PORT" "127.0.0.1" "$GATEWAY_PORT" "$TOKEN_PATH" "$TOKEN_VALUE"
ensure_secret

if [ "$(check_tcp "127.0.0.1" "$GATEWAY_PORT")" = "open" ]; then
  log_ok "Gateway responde en 127.0.0.1:$GATEWAY_PORT"
else
  log_warn "Gateway no responde en 127.0.0.1:$GATEWAY_PORT"
fi

if [ -n "$OPENCLAW_BIN" ] && [ -n "$TOKEN_VALUE" ]; then
  if OPENCLAW_GATEWAY_PORT="$GATEWAY_PORT" OPENCLAW_GATEWAY_TOKEN="$TOKEN_VALUE" "$OPENCLAW_BIN" gateway status >/dev/null 2>&1; then
    log_ok "Gateway status OK (via ${OPENCLAW_BIN})"
  else
    log_warn "No se pudo verificar status del gateway (via ${OPENCLAW_BIN})"
  fi
fi

log_step "Instalando comando y servicio"
TARGET_BIN_DIR="$BIN_DIR_LOCAL"
if [ -w "$BIN_DIR_GLOBAL" ]; then
  TARGET_BIN_DIR="$BIN_DIR_GLOBAL"
fi
create_cli "$TARGET_BIN_DIR"
install_service

log_step "Instalación completa"
printf "\n%s%sInstalación completa%s\n" "$C_GREEN" "$C_BOLD" "$C_RESET"
printf "%sNext steps:%s\n" "$C_CYAN" "$C_RESET"
printf "  - %s run\n" "$APP_NAME"
printf "  - %s status\n" "$APP_NAME"
printf "  - %s doctor\n" "$APP_NAME"
printf "  - %s open\n" "$APP_NAME"
printf "%sURL local:%s http://127.0.0.1:%s\n" "$C_CYAN" "$C_RESET" "$APP_PORT"
printf "%sConfig:%s %s\n" "$C_CYAN" "$C_RESET" "$CONFIG_FILE"
