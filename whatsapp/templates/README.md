# Plantillas de WhatsApp (Meta)

Plantillas *utility* de los avisos de cuota en modo transferencia. Cada archivo es el JSON que
se manda a `POST /{WABA_ID}/message_templates`. Los nombres tienen versión (`_v2`, `_v1`)
porque una plantilla aprobada no se puede editar libremente: para cambiarla se crea una nueva.

| Plantilla | Cuándo se usa |
|---|---|
| `aviso_cuota_previo_v2` / `_recargo_v2` | Antes del vencimiento (con o sin recargo configurado) |
| `aviso_cuota_hoy_v1` / `_recargo_v1` | El día del vencimiento |
| `aviso_cuota_vencida_v1` | Después del vencimiento (total con recargo) |
| `aviso_cuotas_multiples_v1` | El alumno tiene más de una cuota pendiente |

Todas nombran al gym (header y cuerpo) y traen los botones **Copiar alias**, **Ya transferí** y
**Ver mi cuenta**. El código (`lib/notifications/avisos-whatsapp.ts`) arma las variables en el
mismo orden; `__tests__/unit/lib/avisos-whatsapp.test.ts` verifica que coincidan.

## Darlas de alta

Cada gym tiene su propio número, así que hay que darlas de alta en la WABA de cada gym:

```bash
WABA_ID=<id de la cuenta de WhatsApp Business> \
WHATSAPP_ACCESS_TOKEN=<token del gym con whatsapp_business_management> \
node scripts/whatsapp-alta-plantillas.mjs            # --dry-run para ver qué mandaría
```

Hasta que Meta las apruebe, el envío usa automáticamente las plantillas que el gym tiene
configuradas en *Configuración → WhatsApp* (las de siempre).
