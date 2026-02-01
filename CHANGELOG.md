# Changelog

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
