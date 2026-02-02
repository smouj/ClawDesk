# ClawDesk

![Release](https://img.shields.io/github/v/release/smouj/ClawDesk?style=flat-square) ![License](https://img.shields.io/github/license/smouj/ClawDesk?style=flat-square)

ClawDesk es un **Control Center local, security-first y loopback-only** para operar OpenClaw desde tu máquina. Incluye un wizard de instalación claro, UX profesional y un panel moderno para **gestionar agentes, skills, configuración, seguridad y diagnósticos** sin exponer puertos públicos.

> ⚠️ **Seguridad primero:** no expongas el dashboard a Internet. Para acceso remoto usa **túneles cifrados** (Tailscale, WireGuard o SSH).

---

## ✅ Quickstart

### Opción A · Instalación remota (stable)

```bash
curl -fsSL https://raw.githubusercontent.com/smouj/ClawDesk/main/scripts/install-remote.sh | bash
```

### Opción B · Instalación remota (nightly)

> ⚠️ **Nightly** instala directamente desde `main` (sin release estable).

```bash
CLAWDESK_CHANNEL=nightly curl -fsSL https://raw.githubusercontent.com/smouj/ClawDesk/main/scripts/install-remote.sh | bash
```

### Opción C · Git clone + install.sh

```bash
git clone https://github.com/smouj/ClawDesk.git
cd ClawDesk
bash install.sh
```

### Fijar versión estable

> Solo funciona si **existe un release con assets** `.tar.gz` + `.sha256`.

```bash
CLAWDESK_VERSION=vX.Y.Z curl -fsSL https://raw.githubusercontent.com/smouj/ClawDesk/main/scripts/install-remote.sh | bash
```

---

## 🤖 Control Center: agentes, skills, config y seguridad

- **Agents Center:** crea, lista, renombra, exporta/importa agentes con validación.
- **Skills Center:** muestra estado, requisitos faltantes y activación manual segura.
- **Config Center:** editor JSON con validación, formateo y restore de backups.
- **Security Center:** loopback-only explicado, guías para túneles cifrados y audit.
- **Logs & Diagnostics:** health extendido, latencia, estado gateway y logs redactados.

---

## 🔒 Seguridad (loopback-only)

- ClawDesk escucha en loopback por defecto (`127.0.0.1` / `::1`).
- Bloquea binds inseguros salvo confirmación explícita.
- No ejecuta comandos arbitrarios. Solo **acciones allowlist** con `execFile` y `shell=false`.
- Los secretos se redactan en UI y logs.

Si necesitas acceso remoto, usa **SSH / Tailscale / WireGuard**.

---

## ⚙️ Modo no interactivo

```bash
INSTALL_NONINTERACTIVE=1 \
CLAWDESK_BIND=127.0.0.1 \
CLAWDESK_PORT=4178 \
CLAWDESK_GATEWAY_BIND=127.0.0.1 \
CLAWDESK_GATEWAY_PORT=18789 \
CLAWDESK_TOKEN_PATH=~/.config/openclaw/gateway.auth.token \
OPENCLAW_GATEWAY_TOKEN=... \
bash install.sh
```

---

## 🧠 Comandos CLI

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

## 🧩 Configuración

| Archivo | Uso | Notas |
| --- | --- | --- |
| `~/.config/clawdesk/config.json` | Config principal de ClawDesk | Loopback-only y allow_actions |
| `~/.config/clawdesk/secret` | Token interno del dashboard | Permisos 600 |
| `~/.config/clawdesk/clawdesk.log` | Logs del daemon | Redacción de secretos |
| `~/.openclaw/openclaw.json` | Config OpenClaw | ClawDesk lo lee y lo respeta |
| `~/.openclaw/skills.json` | Skills (si existen) | Se gestiona desde Skills Center |

---

## 🐧 WSL / Windows

- `localhost` se comparte entre Windows y WSL.
- Abre el dashboard desde Windows con `http://127.0.0.1:4178`.
- Evita binds públicos (0.0.0.0). Usa túneles cifrados.

---

## 🧪 Calidad

```bash
npm run lint
npm run format
npm test
npm run smoke
```

---

## 🛠️ Troubleshooting rápido

**El gateway no responde**
- Verifica `OPENCLAW_GATEWAY_TOKEN` y `OPENCLAW_GATEWAY_PORT`.
- Ejecuta `clawdesk doctor`.

**Token faltante**
- Crea `~/.config/openclaw/gateway.auth.token` o exporta `OPENCLAW_GATEWAY_TOKEN`.

**Puerto ocupado**
- El instalador sugerirá un puerto alternativo automáticamente.

---

## 🧑‍💻 Desarrollo

```bash
npm install
npm run dev
```

---

## 📦 Versionado y releases

- **Stable:** usa GitHub Releases con assets verificados por SHA256.
- **Nightly:** instala desde `main` y puede incluir cambios no publicados.
- La versión `package.json` puede ir por delante del último release: en ese caso, usa `CLAWDESK_CHANNEL=nightly`.

---

## 📚 Documentación

La documentación vive en `docs/` y está alineada con este README.

---

## 🔐 Seguridad

Lee [SECURITY.md](SECURITY.md) para reportar vulnerabilidades.
