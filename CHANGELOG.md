# Changelog

## [2.1.0] - 2026-02-02

### Added

- Instalador local con validación de bind segura, modo no interactivo y self-test.
- Remote installer con auto-latest vía GitHub Releases y verificación SHA256.
- /api/health ampliado con estado OpenClaw y reachability del gateway.
- UI Mission Control con acciones rápidas y estados detallados.
- CONTRIBUTING.md y SECURITY.md.

### Changed

- UI/UX en español con textos más profesionales y controles de logs mejorados.
- Instalador detecta OpenClaw config y recomienda túneles cifrados.

### Fixed

- Bind vacío ya no falla: usa 127.0.0.1 por defecto.

## [2.0.0] - 2024-10-01

### Added

- Release automation con lint/format/tests/smoke y assets firmados (SHA256SUMS).
- Instalador stable auto-detecta latest release para evitar 404s.
- CORS allowlist loopback-only y redacción extendida para bearer/api keys.
- Smoke test con healthcheck y puerto dinámico.

### Changed

- UI Retro-OS refinada: tokens unificados, focus visible y toasts en cola.
- Config default + ejemplo incluyen `allowedOrigins`.

### Fixed

- ESLint env por carpeta y Prettier ignore/config consistente.

## [1.3.0] - 2024-09-20

### Added

- Multi-Gateway Profiles con opt-in seguro y allowlist para hosts remotos.
- Automation/Macros con runner seguro, validación y timeouts por paso.
- Usage Center con snapshot/histórico de tokens/costes basado en OpenClaw.
- Event Timeline/Audit log con rotación y redacción de secretos.
- UI + docs “Retro-OS 2000 minimal + moderno” con tokens y componentes nuevos.
- Tests de perfiles, macros, redaction, usage parser y cache TTL.
- CI con lint + test + smoke.

### Changed

- Refactor del servidor y app a módulos limpios, rutas explícitas y utilidades compartidas.
- Nueva estructura de config con profiles + macros.
- SSE de logs con heartbeat y filtros simples.

### Removed

- Archivos legacy del servidor y UI anterior.

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
