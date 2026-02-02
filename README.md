# ClawDesk

![Release](https://img.shields.io/github/v/release/smouj/ClawDesk?style=flat-square) ![License](https://img.shields.io/github/license/smouj/ClawDesk?style=flat-square)

ClawDesk es un **dashboard local, security-first y loopback-only** para operar OpenClaw/Clawdbot desde tu equipo. Está diseñado para equipos que quieren **control operativo con UX cuidada** sin exponer servicios al exterior.

> ⚠️ **Seguridad primero:** No expongas el dashboard a Internet. Si necesitas acceso remoto, utiliza **túneles cifrados (Tailscale, WireGuard o SSH)**.

---

## ✅ Quickstart

### Opción A · Instalación remota (one-liner)

```bash
curl -fsSL https://raw.githubusercontent.com/smouj/ClawDesk/main/scripts/install-remote.sh | bash
```

Para fijar versión:

```bash
CLAWDESK_VERSION=v2.0.0 curl -fsSL https://raw.githubusercontent.com/smouj/ClawDesk/main/scripts/install-remote.sh | bash
```

### Opción B · Git clone + install.sh

```bash
git clone https://github.com/smouj/ClawDesk.git
cd ClawDesk
bash install.sh
```

### Modo no interactivo

```bash
INSTALL_NONINTERACTIVE=1 \
CLAWDESK_PORT=4178 \
CLAWDESK_BIND=127.0.0.1 \
CLAWDESK_GATEWAY_PORT=18789 \
CLAWDESK_TOKEN_PATH=~/.config/openclaw/gateway.auth.token \
OPENCLAW_GATEWAY_TOKEN=... \
bash install.sh
```

> Para forzar un bind no-loopback se requiere doble confirmación explícita y advertencias.

---

## 🧭 ¿Qué incluye?

- **Wizard de instalación** con validaciones, auto-detección de OpenClaw y self-test.
- **Dashboard “Mission Control”** con acciones rápidas y estados en tiempo real.
- **API local** con CORS allowlist, rate limiting y redacción de secretos.
- **CLI** (`clawdesk`) con comandos compatibles.

---

## 🧠 Comandos CLI (compatibles)

```bash
clawdesk run
clawdesk status
clawdesk stop
clawdesk open
clawdesk config
clawdesk doctor
clawdesk secret rotate
clawdesk uninstall
```

---

## 🔒 Seguridad (loopback-only)

ClawDesk escucha en loopback por defecto y **bloquea bind inseguro** salvo confirmación explícita. Para acceso remoto seguro usa:

- **Tailscale** (recomendado)
- **WireGuard**
- **SSH Tunneling**

---

## 🧱 Arquitectura

```
app/     → UI estática (dashboard)
server/  → daemon Node.js + API
config/  → defaults y helpers
scripts/ → instalación y utilidades
docs/    → GitHub Pages
```

---

## 🐧 WSL / Windows

- `localhost` se comparte entre Windows y WSL.
- Para abrir el dashboard desde Windows: `http://127.0.0.1:4178`.
- Si hay conflicto de puertos, edita `~/.config/clawdesk/config.json` y reinicia.

---

## 🧪 Calidad

```bash
npm run lint
npm run format
npm test
npm run smoke
```

---

## ❓FAQ

**El gateway no responde**
- Verifica `OPENCLAW_GATEWAY_TOKEN` y `OPENCLAW_GATEWAY_PORT`.
- Ejecuta `clawdesk doctor` para diagnóstico.

**Token faltante**
- Crea `~/.config/openclaw/gateway.auth.token` o exporta `OPENCLAW_GATEWAY_TOKEN`.

**Puerto ocupado**
- Cambia `app.port` en `~/.config/clawdesk/config.json` y reinicia.

---

## 📦 Documentación

La documentación (GitHub Pages) vive en `docs/` y está alineada con este README.

---

## 🤝 Contribuir

Consulta [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🔐 Seguridad

Lee [SECURITY.md](SECURITY.md) para reportar vulnerabilidades.
