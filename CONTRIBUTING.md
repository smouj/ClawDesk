# Contribuir a ClawDesk

¡Gracias por ayudar a mejorar ClawDesk! Este repo sigue una filosofía **security-first** y **loopback-only**.

## Reglas rápidas

- Mantén los comandos existentes (`clawdesk run/status/stop/open/config/doctor/secret rotate/uninstall`).
- No expongas el dashboard a `0.0.0.0` por defecto.
- Todo texto orientado al usuario debe estar en español.
- Ejecuta lint y pruebas antes de enviar cambios.

## Flujo recomendado

1. Crea una rama descriptiva (`feature/...` o `fix/...`).
2. Ejecuta:

```bash
npm ci
npm run lint
npm run format
npm test
npm run smoke
```

3. Describe tus cambios con capturas si tocas UI.

## Reportes

- Incluye pasos de reproducción.
- Adjunta logs relevantes (sin tokens). Redacta secretos antes de compartir.
