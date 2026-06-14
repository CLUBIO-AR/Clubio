<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Contexto de Proyecto — CLUBIO
> Leer al inicio de cada sesión de trabajo y antes de ejecutar /review.

## Descripción
SaaS de gestión de cobros para gimnasios en Argentina y LATAM.
El gym se registra, carga sus alumnos y el sistema cobra las cuotas automáticamente
mediante links de pago sin que el alumno necesite registrarse.

## Stack
- Next.js 16 App Router (TypeScript)
- Supabase (PostgreSQL + Auth + Storage)
- Vercel (hosting + crons)
- MercadoPago Checkout Pro (pagos)
- Resend (email)
- Meta Cloud API (WhatsApp — add-on +USD 8/mes, disponible en todos los planes)
- jose (JWT para links de pago sin login)

## Planes activos
| Plan  | Precio/mes | Sedes | Admins | WhatsApp |
|-------|-----------|-------|--------|----------|
| Basic | USD 28    | 1     | 3      | add-on +USD 8/mes |
| Multi | USD 75    | 5     | 10     | add-on +USD 8/mes |

- Plan 'plus' ELIMINADO junio 2026. Gyms legacy con plus siguen activos, no migrar forzado.
- Planes 'starter' y 'pro' NO EXISTEN — si aparecen en código es un bug crítico.
- Alumnos ILIMITADOS en todos los planes. Sin setup fee.
- WhatsApp disponible en todos los planes como add-on (+USD 8/mes). El gym conecta su propio número Meta. CLUBIO no paga WA.

## Arquitectura multi-tenant
- Aislamiento por `gym_id` en todas las tablas
- RLS activo en toda la base de datos usando `get_user_gym_id()`
- Cada gym tiene su propio `mp_access_token` y `whatsapp_access_token`

## Reglas de negocio invariantes
- Webhook de MercadoPago DEBE validar `x-signature` antes de procesar
- Los crons DEBEN ser idempotentes y validar `Authorization: Bearer CRON_SECRET`
- Pagos son inmutables: tabla `payments` sin UPDATE, solo INSERT
- Soft delete en todo: `deleted_at`, nunca DELETE físico en datos de clientes
- Toda notificación pasa por `NotificationService`, nunca Resend directo
- Resend solo se importa en `lib/notifications/channels/email.ts`
- Admin client usa `SUPABASE_DB_POOLER_URL`
- Crons usan patrón Dispatcher/Worker (no await secuencial por gym)

## Variables de entorno críticas (nunca exponer al cliente)
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `mp_access_token` por gym
- `whatsapp_access_token` por gym
- `CRON_SECRET`
- `RESEND_API_KEY`

## Flujos críticos
1. **Pago de cuota**: alumno recibe link → valida JWT → crea preferencia MP → webhook confirma
2. **Vencimiento de licencia**: cron diario detecta gyms vencidos → suspende acceso
3. **Renovación**: gym paga suscripción → webhook activa licencia → acceso restaurado
4. **Notificaciones**: cuota próxima → NotificationService → email / WhatsApp

## Reportes de revisión
`.claude/reports/review-[YYYY-MM-DD]-[HH-MM].md`
