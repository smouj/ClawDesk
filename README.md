# ClawDesk
ClawDesk 🦞 — un panel web moderno, seguro y real para gestionar OpenClaw desde tu máquina local.

> ⚠️ **Seguridad primero**: ClawDesk solo escucha en `127.0.0.1` por defecto. No expongas el dashboard directamente a internet. Para acceso remoto, usa túneles cifrados (Tailscale/WireGuard/SSH tunneling).

## ✨ Qué incluye (v1.1.0)
- **Daemon local** (Node + Express) que sirve la UI y expone `/api/*`.
- **Acciones reales** contra OpenClaw (agents/skills/logs/status).
- **Auth local para API** con secret almacenado en `~/.config/clawdesk/secret` (chmod 600).
- **Support Bundle** descargable con información redactada.
- **Wizard real** que detecta OpenClaw, gateway, token y test.
- **UI dark + acento neón** sin romper la estética actual.
- **Docs sincronizadas** desde `app/` con `scripts/sync-docs.sh`.

## 🧭 Instalación (one command)
```bash
bash install.sh
```

El instalador:
1. Detecta el sistema (Linux/WSL).
2. Copia `app/` y `server/` a `~/.clawdesk`.
3. Configura `config.json` en `~/.config/clawdesk`.
4. Instala dependencias Node.js.
5. Crea el comando `clawdesk`.

## ▶️ Ejecutar
```bash
clawdesk run
```

## 📦 Comandos disponibles
- `clawdesk run` → inicia el daemon en `http://127.0.0.1:<puerto>`.
- `clawdesk status` → estado del daemon + ping a `/api/health`.
- `clawdesk stop` → detiene el daemon.
- `clawdesk open` → imprime la URL local.
- `clawdesk config` → muestra el `config.json`.
- `clawdesk doctor` → diagnóstico local (OpenClaw, token, puerto, gateway).
- `clawdesk uninstall` → desinstala archivos locales.

## 🔒 Seguridad
- **No comandos arbitrarios**: se usan `allow_actions` (acciones semánticas).
- **Exec seguro**: `openclaw` se ejecuta con `execFile` y `shell=false`.
- **Auth local**: la API exige `Authorization: Bearer <secret>`.
- **Headers**: CSP y `helmet` para protección básica.
- **Redacción**: support bundle elimina tokens/secretos.

## 🗂️ Estructura del repo
```
app/          # UI local (source of truth)
server/       # daemon Node.js + API
config/       # plantilla config.json
scripts/      # utilidades (sync docs)
docs/         # homeboard para GitHub Pages (generado)
```

## 🧪 Desarrollo
Sincroniza docs desde la UI:
```bash
./scripts/sync-docs.sh
```

## 🧰 Troubleshooting rápido
- **OpenClaw no detectado**: asegúrate de que `openclaw` esté en PATH.
- **Token ausente**: revisa `gateway.auth.token` o exporta `OPENCLAW_GATEWAY_TOKEN`.
- **Puerto ocupado**: cambia el puerto en `config.json` y reinicia.

## 📣 Release
- Revisa `CHANGELOG.md` para los cambios de v1.1.0.

---
¿Necesitas acceso remoto? Usa **túneles cifrados** (Tailscale/WireGuard/SSH). Nunca abras el puerto del dashboard en el router.
