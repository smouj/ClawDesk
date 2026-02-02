# ClawDesk

ClawDesk 🦞 es un dashboard **local** y **security-first** para operar OpenClaw desde tu máquina. Todo corre en loopback (`127.0.0.1`) y el acceso remoto **solo** se recomienda vía túneles cifrados.

> ⚠️ **Seguridad primero**: no expongas el dashboard a Internet. Si necesitas acceso remoto usa **Tailscale, WireGuard o SSH Tunneling**.

---

## ✅ Requisitos

- Node.js **>= 18**
- npm
- bash
- curl, tar, python3
- OpenClaw (opcional, para control completo)

---

## 🚀 Instalación oficial (git clone + install.sh)

```bash
git clone https://github.com/smouj/ClawDesk.git
cd ClawDesk
bash install.sh
```

### Modo no interactivo

```bash
INSTALL_NONINTERACTIVE=1 bash install.sh
```

El instalador:

- Valida dependencias y permisos.
- Configura `~/.config/clawdesk/config.json`.
- Sincroniza token/gateway de OpenClaw automáticamente.
- Instala el comando `clawdesk`.
- Crea un servicio `systemd --user` cuando es posible.

---

## ▶️ Comandos principales

```bash
clawdesk run
clawdesk status
clawdesk doctor
clawdesk open
```

Comandos disponibles:

- `clawdesk run` / `clawdesk start` → inicia el dashboard.
- `clawdesk stop` / `clawdesk restart` → controla el daemon.
- `clawdesk status` → estado + healthcheck `/api/health`.
- `clawdesk doctor` → diagnóstico y auto-sincronización OpenClaw.
- `clawdesk config` → imprime `config.json`.
- `clawdesk secret rotate` → rota el secret local.
- `clawdesk uninstall` → elimina instalación local.

---

## 🔁 OpenClaw Sync automático

ClawDesk detecta y configura automáticamente:

- Binario `openclaw` (o `clawdbot`, `moltbot`).
- Gateway `127.0.0.1:18789` (o el puerto que uses).
- Token desde `~/.config/openclaw/gateway.auth.token` o `OPENCLAW_GATEWAY_TOKEN`.

El token se redactiona (solo se muestran los últimos 4 caracteres). Para inspección, usa:

```bash
clawdesk doctor
```

---

## 🧪 Calidad y verificación

```bash
npm run lint
npm run format
npm run smoke
```

---

## 🧰 Troubleshooting rápido

- **OpenClaw no detectado**: asegúrate de que `openclaw` esté en PATH.
- **Token ausente**: exporta `OPENCLAW_GATEWAY_TOKEN` o crea `~/.config/openclaw/gateway.auth.token`.
- **Puerto ocupado**: cambia `app.port` en `~/.config/clawdesk/config.json` y reinicia.
- **WSL**: recuerda que `localhost` es compartido con Windows.

---

## 🔒 Seguridad

- Loopback-only (no 0.0.0.0).
- CSP estricta + allowlist de host/origin.
- Auth local con secret y rotación.
- Redacción de tokens en logs y eventos.

---

## 🗂️ Estructura del repo

```
app/          # UI local
server/       # daemon Node.js + API
docs/         # GitHub Pages (solo instrucciones de instalación)
scripts/      # utilidades internas
```

---

## 🧹 Desinstalación

```bash
bash uninstall.sh
```

---

Si necesitas acceso remoto, usa **túneles cifrados** (Tailscale/WireGuard/SSH). Nunca abras el puerto del dashboard al internet público.
