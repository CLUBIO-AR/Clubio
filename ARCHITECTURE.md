# ARCHITECTURE.md — Mapa técnico de CLUBIO
> Generado con /snapshot el 2026-06-14. Actualizar con `/snapshot --update` tras refactors importantes.

---

## Archivos clave

### Autenticación y contexto
- `lib/supabase/auth.ts` — `getUser()`, `getGymContext()`, `requireGymContext()`. Usa doble caché: `cache()` per-render + `unstable_cache()` con TTL 5 min via admin client. `requireGymContext()` redirige a /login si no hay sesión o el gym está suspendido.
- `lib/supabase/api-auth.ts` — `getApiGymId()` / `getApiGymContext()` para API Routes (no usa caché, valida en cada request).
- `lib/admin/auth.ts` — `getAdminContext()` / `requireSuperadmin()` para el panel CLUBIO. Mismo patrón de doble caché. Incluye `logAdminAction()` que escribe en `admin_logs`.
- `lib/supabase/server.ts` — cliente Supabase server-side con cookies (Server Components, Server Actions).
- `lib/supabase/client.ts` — cliente browser-side.
- `lib/supabase/admin.ts` — cliente con `SUPABASE_SERVICE_ROLE_KEY`, para crons, webhooks y operaciones admin. Bypassea RLS.

### Base de datos
- `types/database.ts` — tipos generados de Supabase, fuente de verdad de tipos DB.
- `supabase/migrations/` — 0001–0013 en orden. La 0013 elimina planes obsoletos.

### Rutas / App
- `app/(auth)/` — login y register. Rutas públicas, sin layout con auth guard.
- `app/(dashboard)/layout.tsx` — llama `requireGymContext()`, monta `SidebarNav` con gymNombre/rol. Protege todo el dashboard.
- `app/(admin)/layout.tsx` — llama `requireSuperadmin()`. Protege el panel CLUBIO.
- `app/pagar/[token]/page.tsx` — ruta pública. Verifica JWT (jose), consulta cuota, crea preferencia MP y redirige al checkout. Sin login requerido.
- `app/pagar/lote/[token]/page.tsx` — igual pero para pago de múltiples cuotas (cuota_lotes).
- `app/registro/page.tsx` — registro público del gym.

### Server Actions
- `app/actions/crons.ts` — trigger manual de crons desde el dashboard.
- `app/actions/registro.ts` — crea gym + usuario inicial.
- `app/actions/admin-*.ts` — operaciones CLUBIO admin (gyms, leads, licencias, suscripciones, settings).

### API Routes
- `app/api/webhooks/mercadopago/route.ts` — webhook de pagos. Verifica `gym_id`, chequea duplicados en `pagos` y `cuota_lotes`, recupera pago de MP, marca cuota(s) pagada(s), dispara notificación al gym.
- `app/api/webhooks/mp-suscripciones/route.ts` — webhook de suscripciones CLUBIO vía MP.
- `app/api/cron/*/route.ts` — dispatchers: validan `CRON_SECRET`, leen gyms con licencias activas, lanzan workers en paralelo.
- `app/api/cron/workers/*/route.ts` — workers por gym: lógica de negocio real (generar cuotas, enviar avisos, aplicar recargos).
- `app/api/cuotas/[id]/generar-link-pago/route.ts` — genera JWT firmado para el link de pago del alumno.

### Lógica de dominio
- `lib/mercadopago.ts` — `createMpPreference()` y `getMpPayment()`. En localhost omite `notification_url` y `back_urls` porque MP los rechaza.
- `lib/mercadopago-suscripcion.ts` — operaciones MP para suscripciones de la plataforma CLUBIO.
- `lib/notifications/index.ts` — `sendNotification()`, único punto de entrada. Despacha a canales activos según config del gym.
- `lib/notifications/channels/email.ts` — único archivo que importa `Resend`. Soporta templates personalizables por gym con variables `{nombre}/{gym}/{monto}/{mes}/{anio}/{link}`.
- `lib/notifications/channels/whatsapp.ts` — stub, implementación pendiente (MVP 2.5).
- `lib/notifications/gym-owner.ts` — notifica al dueño del gym cuando un alumno paga.
- `lib/features.ts` — `PLAN_FEATURES`: define capacidades por plan (`basic`, `multi`). Fuente de verdad de qué incluye cada plan.
- `lib/cuotas.ts` — lógica de generación y cálculo de cuotas.
- `lib/alumnos.ts` — queries de alumnos.
- `lib/cron-logger.ts` — `logCron()` para registrar ejecuciones de crons en DB.
- `lib/theme.ts` — tokens de diseño centralizados (`T.bgDeep`, `T.danger`, etc.).

---

## Patrones

### Acceso a datos (Server Components / Layouts)
```
requireGymContext()  →  ctx.gymId
createClient()       →  supabase.from("tabla").select(...).eq("gym_id", ctx.gymId)
```
El RLS de Supabase refuerza el aislamiento pero la app siempre filtra explícitamente por `gym_id`.

### Acceso a datos (API Routes)
```
getApiGymContext()  →  { gymId, rol }
createAdminClient() →  admin.from("tabla").select(...).eq("gym_id", gymId)
```
Las API routes usan el admin client + filtro manual; no dependen solo de RLS.

### Acceso a datos (Crons / Webhooks)
```
createAdminClient()  — siempre. Bypassea RLS. Filtra gym_id explícitamente.
```

### Autenticación sin login (links de pago)
JWT firmado con `JWT_SECRET` (jose). El token lleva `cuota_id`, `gym_id`, `alumno_id`, `monto`. `/pagar/[token]` verifica el JWT y crea la preferencia MP sin sesión de usuario.

### Crons: patrón Dispatcher/Worker
Dispatcher (`/api/cron/<nombre>`) lee `licencias` activas → lanza un `fetch()` al worker correspondiente por cada gym en `Promise.allSettled`. Workers en `/api/cron/workers/<nombre>-gym`. Ambos validan `Authorization: Bearer CRON_SECRET`. Los workers contienen la lógica de negocio; los dispatchers solo orquestan.

### Manejo de errores en webhooks
Webhook de MP verifica duplicados antes de procesar (chequea `pagos.mp_payment_id` y `cuota_lotes.mp_payment_id`). Si falla el INSERT de pagos, retorna 500 y MP reintentará. La tabla `pagos` es inmutable (solo INSERT).

### Notificaciones
Siempre via `sendNotification()` de `lib/notifications/index.ts`. Nunca importar `Resend` o Meta directamente fuera de `lib/notifications/channels/`. El canal WhatsApp está comentado (pendiente MVP 2.5).

### Caché de contexto
`unstable_cache` con TTL 300s + tag `gym-ctx-{userId}`. Para invalidar el caché (ej. tras cambio de rol o suspensión de gym), revalidar el tag. El dashboard layout llama `requireGymContext()` que retorna `null` (→ redirect) si el gym está suspendido.

---

## Decisiones de arquitectura

- **No hay middleware.ts**: La auth guard se hace en layouts (`requireGymContext`, `requireSuperadmin`). Evita que el middleware quede como single point of failure y permite caché por ruta.
- **Tabla `pagos` solo INSERT**: Inmutabilidad garantizada. Los pagos nunca se modifican; para ajustes se inserta un registro nuevo. Deduplicación vía `mp_payment_id`.
- **Admin client en crons y webhooks**: Bypassea RLS intencionalmente; operan sobre múltiples gyms. El filtro `gym_id` explícito reemplaza a RLS en estos contextos.
- **MP credentials por gym**: Cada gym tiene su `mp_access_token` en `gym_config`. Fallback a `MP_ACCESS_TOKEN` de la plataforma si el gym no configuró uno propio.
- **Resend centralizado**: Solo en `lib/notifications/channels/email.ts`. Facilita cambiar el proveedor de email sin tocar consumidores.
- **`unstable_cache` para gym context**: Evita dos roundtrips a DB en cada Server Component. TTL 5 min es aceptable; cambios críticos (suspensión de gym) requieren invalidar el tag.
- **Plan 'plus' eliminado junio 2026**: Gyms legacy con `plus` siguen activos (no migrar forzado). `lib/features.ts` solo tiene `basic` y `multi`.

---

## Trabajo en curso

### En desarrollo
- **WhatsApp**: canal stubbed en `lib/notifications/channels/whatsapp.ts`. La UI de config ya existe (`config-notificaciones.tsx`, `config-plantillas.tsx`). Pendiente implementación real (MVP 2.5, ~Semana 5).
- **QR asistencia**: feature flag `false` en plan `basic`. No hay código de implementación visible aún (MVP 2).
- **Clases**: feature flag `false` en plan `basic`. Pendiente (MVP 3).
- **Reportes avanzados**: feature flag `false` en plan `basic`.

### Deuda técnica conocida
- **Webhook MP no atómico**: El INSERT en `pagos` + UPDATE en `cuotas` son dos operaciones separadas. Si falla el UPDATE, el pago queda registrado pero la cuota sigue "pendiente". MP reintentará, el duplicate check filtrará el pago, pero la cuota quedaría inconsistente. Solución: RPC en Postgres.
- **`METODO_LABEL` duplicado**: Definido en `pagos-client.tsx`, `pagos/export/route.ts`, y `channels/email.ts`. Candidato a extraer a `lib/utils.ts` o `lib/constants.ts`.

### TODOs críticos
- `lib/notifications/channels/whatsapp.ts:9` — `TODO: implementar en MVP 2.5`
