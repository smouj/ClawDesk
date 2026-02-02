# Release Notes

## v2.2.0 — Control Center seguro

### Highlights

- ✅ Instalador reestructurado con bind seguro explícito, sugerencia de puertos y resumen final.
- ✅ Remote installer alineado con canales stable/nightly y verificación SHA256 estricta.
- ✅ Nuevo Control Center para agentes, skills, configuración, seguridad y diagnósticos.
- ✅ API endurecida con allowlist y endpoints para OpenClaw (config/agents/skills/doctor).

### UX/UI

- Navegación clara por secciones: Inicio, Agentes, Skills, Configuración, Seguridad y Logs.
- Formularios guiados, validación de JSON y botones para backups/restauración.
- Diagnóstico visual con health checks extendidos y mensajes accionables.

### Seguridad & Reliability

- Loopback-only por defecto con confirmación doble para binds no seguros.
- Sanitización de argumentos en OpenClaw y redacción de secretos.
- Rate limit, CORS allowlist y auditoría opcional vía CLI.

### Instalación

- Modo no interactivo soportado con `CLAWDESK_BIND` y `CLAWDESK_GATEWAY_BIND`.
- Self-test con `/api/health` y resumen post-instalación más claro.

### Migration

- Si usas un release estable, asegúrate de que existan assets `.tar.gz` + `.sha256`.
- Revisa `~/.config/clawdesk/config.json` para habilitar acciones allowlist nuevas.
- Para skills/agents sin sección en `openclaw.json`, ClawDesk crea metadata propia.

### Testing

- `npm install`

## v2.1.0 — Mission Control Pro

### Highlights

- ✅ Instalador local más robusto: bind seguro, defaults claros y self-test automático.
- ✅ Instalador remoto auto-latest con verificación SHA256.
- ✅ /api/health más completo (openclaw detectado, reachability, latencia).

### UX/UI

- Mission Control con acciones rápidas y estado del gateway en tiempo real.
- Logs con filtros más accesibles, pausa y descarga.
- Textos en español más consistentes y profesionales.

### Seguridad & Reliability

- Confirmación doble para binds no-loopback.
- Redacción estructurada de logs y mejoras de timeouts.

### Instalación

- Soporte de modo no interactivo con variables de entorno.
- WSL detectado con recomendaciones de localhost compartido.

### Developer Experience

- Script `dev` agregado en package.json.
- CONTRIBUTING.md y SECURITY.md añadidos.
