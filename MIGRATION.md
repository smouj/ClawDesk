# Migration Guide

## v2.0.0

No breaking changes for existing installs. Configurations using the legacy `gateway` block are still supported; new installs now write `profiles` + `activeProfile`.

Recommended (optional) updates:

1. Add `security.allowedOrigins` if you need to allow a specific loopback origin beyond the defaults.
2. Keep `enableRemoteProfiles` disabled unless you explicitly need remote profiles.
