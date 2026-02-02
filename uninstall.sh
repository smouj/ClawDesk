#!/usr/bin/env bash
set -euo pipefail

APP_NAME="clawdesk"
INSTALL_DIR="$HOME/.clawdesk"
CONFIG_DIR="$HOME/.config/clawdesk"
BIN_LOCAL="$HOME/.local/bin/$APP_NAME"
BIN_GLOBAL="/usr/local/bin/$APP_NAME"
SERVICE_FILE="$HOME/.config/systemd/user/clawdesk.service"

USE_COLOR=1
if [ ! -t 1 ] || [ "${NO_COLOR:-}" = "1" ]; then
  USE_COLOR=0
fi
if [ "$USE_COLOR" -eq 1 ]; then
  C_RESET="$(printf '\033[0m')"
  C_GREEN="$(printf '\033[32m')"
  C_YELLOW="$(printf '\033[33m')"
  C_RED="$(printf '\033[31m')"
  C_BOLD="$(printf '\033[1m')"
else
  C_RESET=""
  C_GREEN=""
  C_YELLOW=""
  C_RED=""
  C_BOLD=""
fi

log_ok() {
  printf "%s[ OK ]%s %s\n" "$C_GREEN" "$C_RESET" "$1"
}

log_warn() {
  printf "%s[WARN]%s %s\n" "$C_YELLOW" "$C_RESET" "$1"
}

log_fail() {
  printf "%s[FAIL]%s %s\n" "$C_RED" "$C_RESET" "$1" >&2
}

printf "%s%sClawDesk Uninstall%s\n" "$C_BOLD" "$C_RED" "$C_RESET"

if [ ! -d "$INSTALL_DIR" ] && [ ! -d "$CONFIG_DIR" ] && [ ! -f "$BIN_LOCAL" ] && [ ! -f "$BIN_GLOBAL" ]; then
  log_warn "No se encontró instalación de ClawDesk."
  exit 0
fi

echo "Se eliminarán:"
echo " - $INSTALL_DIR"
echo " - $CONFIG_DIR"
echo " - $BIN_LOCAL"
echo " - $BIN_GLOBAL"
echo " - $SERVICE_FILE"

read -r -p "¿Confirmas desinstalación? (y/N): " confirm
if [ "${confirm:-N}" != "y" ]; then
  log_warn "Cancelado."
  exit 0
fi

if command -v systemctl >/dev/null 2>&1 && [ -f "$SERVICE_FILE" ]; then
  systemctl --user stop clawdesk >/dev/null 2>&1 || true
  systemctl --user disable clawdesk >/dev/null 2>&1 || true
  systemctl --user daemon-reload >/dev/null 2>&1 || true
fi

rm -rf "$INSTALL_DIR" "$CONFIG_DIR"
rm -f "$BIN_LOCAL" "$BIN_GLOBAL" "$SERVICE_FILE"

log_ok "Desinstalación completa."
