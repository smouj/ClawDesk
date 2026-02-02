# Changelog

## [1.2.0] - 2024-05-23
### Added
- War-room redesign “NeuroCircuit War-Room Edition” para app y docs.
- Landing de instalación con modo humano/agente, selectores de OS/canal y payload de agentes.
- Instalador remoto con verificación de checksum y soporte nightly.
- Compatibilidad ampliada con OpenClaw (probe/start/stop/restart, dashboard link).
- Logs en vivo por SSE con controles de pausa y descarga.
- Rotación de secret desde UI/CLI.

### Changed
- Configuración de gateway con bind/port/token source y precedencia explícita.
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
