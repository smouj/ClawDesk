# Migration Guide

## v2.1.0

No hay cambios incompatibles. Si usas binds no-loopback, ahora se requiere confirmación explícita en el instalador.

Recomendado:

1. Ejecuta `clawdesk doctor` para validar token/gateway tras actualizar.
2. Revisa `docs/` y README para el nuevo flujo de instalación remota.

## v2.0.0

No breaking changes for existing installs. Configurations using the legacy `gateway` block are still supported; new installs now write `profiles` + `activeProfile`.

Recommended (optional) updates:

1. Add `security.allowedOrigins` if you need to allow a specific loopback origin beyond the defaults.
2. Keep `enableRemoteProfiles` disabled unless you explicitly need remote profiles.
