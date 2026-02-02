# ClawDesk
ClawDesk 🦞 — panel local, security-first, para gestionar OpenClaw desde tu máquina con estética war-room.

> ⚠️ **Seguridad primero**: ClawDesk solo escucha en `127.0.0.1`/`localhost`. No expongas el dashboard a internet. Para acceso remoto, usa túneles cifrados (Tailscale/WireGuard/SSH).

## ✨ Qué incluye (v1.2.0)
- **Daemon local** (Node + Express) que sirve UI y expone `/api/*`.
- **Compatibilidad OpenClaw total** (probe/start/stop/restart, dashboard link).
- **Logs en vivo via SSE** con filtros, pausa y descarga.
- **Auth local** con secret y rotación segura.
- **Allow-actions** obligatorio para acciones semánticas.
- **Landing war-room** para instalación y payloads de agentes.

## 🧭 Instalación (one command)
```bash
curl -fsSL https://raw.githubusercontent.com/smouj/ClawDesk/main/scripts/install-remote.sh | bash
```

Opciones:
- `CLAWDESK_CHANNEL=nightly` para instalar desde `main`.
- `CLAWDESK_VERSION=v1.2.0` para fijar versión estable.

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
- `clawdesk secret rotate` → rota el secret y revoca sesiones.
- `clawdesk uninstall` → desinstala archivos locales.

## 🔒 Seguridad
- **No comandos arbitrarios**: se usan `allow_actions` (acciones semánticas).
- **Exec seguro**: `openclaw` se ejecuta con `execFile` y `shell=false`.
- **Auth local**: la API exige `Authorization: Bearer <secret>`.
- **Headers**: CSP estricta + allowlist de host/origin.
- **Redacción**: support bundle elimina tokens/secretos.

## 🗂️ Estructura del repo
```
app/          # UI local (source of truth)
server/       # daemon Node.js + API
config/       # plantilla config.json
scripts/      # utilidades (sync docs, install remoto)
docs/         # landing GH Pages + dashboard demo
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

---
¿Necesitas acceso remoto? Usa **túneles cifrados** (Tailscale/WireGuard/SSH). Nunca abras el puerto del dashboard en el router.
