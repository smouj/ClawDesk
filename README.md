# ClawDesk
ClawDesk 🦞 — un panel web moderno, sencillo y profesional para gestionar agentes de OpenClaw.

## ✨ Qué incluye
- Dashboard estilo “Mission Control” con tarjetas de estado, acciones rápidas y lista de agentes.
- Connection Wizard visual (detección de OpenClaw, gateway, token y test OK).
- UI moderna: tema oscuro por defecto, acento rojo/neón, badges, micro-animaciones y skeleton-ready.
- Modo “Local-only” por defecto (127.0.0.1) y advertencias de seguridad integradas.
- Instalador guiado paso a paso con configuración de puerto y rutas.
- GitHub Pages listo con `docs/` para el “homeboard”.

## 🧭 Instalación (one command)
> **Seguridad primero**: ClawDesk solo se enlaza a `127.0.0.1` por defecto. No expongas el dashboard a internet abierto.

```bash
bash install.sh
```

El instalador:
1. Detecta el sistema (Linux/WSL).
2. Copia el dashboard localmente.
3. Configura puerto y ruta del token.
4. Crea el comando `clawdesk`.

### Ejecutar
```bash
clawdesk run
```

## 📦 Uso rápido
- `clawdesk run` → sirve el panel en `http://127.0.0.1:<puerto>`
- `clawdesk open` → imprime el enlace local
- `clawdesk config` → muestra el `config.yaml`

## 🔒 Seguridad
- `config.yaml` se crea con permisos `600`.
- Tokens no se guardan en texto plano dentro del dashboard.
- Allow-commands permite solo comandos explícitos del backend.

Si necesitas acceso remoto, usa **túneles cifrados** (Tailscale/WireGuard/SSH tunneling) en lugar de abrir puertos públicos.

## 🧩 GitHub Pages
El contenido está listo en `docs/`. Para publicar:
1. Activa GitHub Pages desde la carpeta `/docs`.
2. Accede a tu homeboard desde la URL de Pages.

## 🗂️ Estructura del repo
```
app/          # Dashboard local
config/       # Plantillas de config
docs/         # Homeboard para GitHub Pages
install.sh    # Instalador guiado
```

## ✅ Roadmap sugerido
- v1.1.0: Wizard UI + agents search/filtro + logs export
- v1.2.0: Skills Manager + perfiles + auto-update

---
¿Quieres que conectemos el backend real de OpenClaw o el SDK de OpenClaw Gateway? Abrimos una issue y lo integramos con seguridad.
