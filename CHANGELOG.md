# Changelog

## [1.2.0] - 2024-05-23

### Added

- Retro-OS 2000 / Cyber-Y2K Winamp Skin Edition para app y docs con titlebars, tabs y módulos tipo desktop.
- Landing de instalación con modo humano/agente, selectores de OS/canal y payload de agentes.
- Instalador remoto con verificación de checksum, soporte nightly y safe install.
- Compatibilidad OpenClaw extendida (dashboard link, probe/start/stop/restart).
- Logs en vivo por SSE con controles de pausa, auto-scroll y preview.
- Rotación de secret desde UI/CLI y redacción extendida en logs/bundles.
- Linting + formatting + tests (Vitest) en CI.

### Changed

- Configuración de gateway con precedencia explícita de port/token y reporting de source.
- Docs se publican como landing, dashboard demo movido a /docs/dashboard.
- Hardening adicional: rate limit, payload reducido y allowlist de host/origin.

## [1.1.0] - 2024-05-05

### Added

- Daemon local Node.js con API real para OpenClaw.
- Auth local con secret y headers de seguridad básicos.
- Acciones reales sobre agentes, skills, logs y estado.
- Support bundle descargable con redacción de secretos.
- Script de sincronización `scripts/sync-docs.sh`.
- Workflow de CI con lint y smoke test.

### Changed

- Configuración migrada a `config.json` con `allow_actions`.
- UI conectada a `/api/*` (sin mocks).

### Removed

- `allow_commands` basado en strings y parsing con `awk`.
