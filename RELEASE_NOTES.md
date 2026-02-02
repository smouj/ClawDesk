# Release Notes

## v2.0.0 — Production-ready

### Highlights

- ✅ CI hardened with lint, format, tests, and a real smoke health check.
- ✅ Release automation publishes tarball + SHA256SUMS on tag.
- ✅ Install script now auto-detects the latest stable release to avoid 404s.

### UX/UI

- Unified retro tokens and stronger contrast for panels, buttons, and toasts.
- Keyboard navigation in main tabs + clearer focus states.
- Toast queueing to avoid notification spam.

### Security & Reliability

- Expanded log redaction for bearer tokens and API keys.
- Strict CORS allowlist for loopback origins by default.
- Config validation tightened with clearer errors.

### Installation

- Stable installs default to the latest release.
- Nightly installs continue to track `main`.

### Developer Experience

- `format:write` script added for Prettier fixes.
- Smoke test uses a random local port for reliability.
