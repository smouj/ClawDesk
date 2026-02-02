# Seguridad

ClawDesk es **loopback-only** por defecto y no debe exponerse a internet público.

## Reportar vulnerabilidades

1. **No** abras issues públicos con detalles sensibles.
2. Envía un correo o mensaje privado al mantenedor del repo.
3. Incluye pasos de reproducción, logs relevantes y versión.

## Buenas prácticas

- Usa túneles cifrados (Tailscale/WireGuard/SSH) para acceso remoto.
- Rota el secret con `clawdesk secret rotate` si sospechas de exposición.
