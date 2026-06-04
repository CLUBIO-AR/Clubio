# SECURITY REVIEW — Semana 1, 2 y 3
**Fecha:** 2026-06-04
**Estado:** ❌ BLOQUEADO — múltiples críticos

---

### Hallazgos

| Severidad | Área | Descripción | Fix recomendado |
|---|---|---|---|
| 🔴 CRÍTICO | Planes | `lib/features.ts` define planes `starter`/`pro`/`multi`. Los planes válidos son `basic`/`plus`/`multi`. | Reescribir features.ts con planes correctos |
| 🔴 CRÍTICO | Planes | `types/database.ts` enum `plan_tipo` incluye `"starter"` y `"pro"`. | Actualizar tipos a `"basic" \| "plus" \| "multi"` |
| 🔴 CRÍTICO | Planes | `supabase/migrations/0001_initial.sql` crea enum con `'starter', 'pro', 'multi'`. | Nueva migración que renombra el enum |
| 🔴 CRÍTICO | Planes | `register-gym/route.ts` crea licencia con `plan: "starter"`. | Cambiar a `plan: "basic"` |
| 🔴 CRÍTICO | Crons | `api/cron/generar-cuotas/route.ts` usa `for...of` secuencial para procesar gyms. Si hay 100 gyms puede hacer timeout (límite 60s en Vercel). | Implementar patrón Dispatcher/Worker con `Promise.allSettled` |
| 🔴 CRÍTICO | Crons | `api/cron/aplicar-recargos/route.ts` igual — loop secuencial. | Mismo fix: Dispatcher/Worker |
| 🟡 ADVERTENCIA | Admin client | `lib/supabase/admin.ts` usa `NEXT_PUBLIC_SUPABASE_URL` en lugar de `SUPABASE_DB_POOLER_URL`. Con muchos workers simultáneos puede agotar conexiones. | Agregar `SUPABASE_DB_POOLER_URL` con fallback |
| 🟡 ADVERTENCIA | Middleware | `proxy.ts` no valida que la licencia del gym esté vigente. Solo valida sesión. | Agregar check de licencia para rutas dashboard |
| 🟡 ADVERTENCIA | Notificaciones | No existe `lib/notifications/`. El cron `enviar-avisos` no tiene implementación. Para Semana 4 se llamará a Resend directamente sin abstracción. | Crear `NotificationService` antes de Semana 4 |
| 🟡 ADVERTENCIA | JWT | `jose` no está instalado. Los tokens de pago sin login (Semana 4) lo requieren. | `npm install jose` |
| 🟡 ADVERTENCIA | Schema | `gym_config` en la migración no tiene `email_activo` ni `whatsapp_activo`. El cron de avisos los necesita. | Nueva migración que agrega esas columnas |
| 🟡 ADVERTENCIA | RLS | `sucursal_config` tiene policy faltante en `0001_initial.sql`. La tabla tiene RLS enabled pero no policy definida. | Agregar policy `gym_isolation` |
| 🔵 SUGERENCIA | Schema | `notificaciones_log` no tiene columna `canal` TEXT ('email'\|'whatsapp'). El spec v2.0 la requiere para tracking multi-canal. | Migración que agrega la columna |
| 🔵 SUGERENCIA | Schema | `licencias` no tiene `es_trial` ni `trial_hasta`. El onboarding debería crear un trial de 30 días, no una licencia definitiva. | Migración que agrega las columnas |

---

### Checklist completo

#### Multi-tenancy
- ✅ Queries de alumnos incluyen gym_id
- ✅ Queries de cuotas incluyen gym_id
- ✅ RLS activo en todas las tablas principales
- ✅ get_user_gym_id() definida y usada en policies
- ⚠️ proxy.ts no valida licencia vigente

#### Secrets y keys
- ✅ SUPABASE_SERVICE_ROLE_KEY solo en server (admin.ts)
- ✅ No hay NEXT_PUBLIC_ con secrets
- ⚠️ Admin client no usa SUPABASE_DB_POOLER_URL
- ⚠️ jose no instalado (necesario para JWT tokens)

#### Endpoints públicos
- ✅ /pagar no existe aún (Semana 4) — ok por ahora
- ✅ Webhook MP no existe aún — ok por ahora

#### Crons
- ✅ CRON_SECRET validado en todos los crons
- ✅ Idempotencia via UNIQUE constraint
- ❌ Patrón Dispatcher/Worker NO implementado (loop secuencial)

#### Base de datos
- ✅ Zod valida inputs en todas las API routes
- ✅ Soft delete con deleted_at en alumnos
- ✅ Tabla pagos inmutable (sin updated_at)
- ✅ Índices presentes
- ❌ Planes en enum SQL incorrectos

#### Planes
- ❌ Plan 'starter' existe en features.ts, migration, register-gym
- ❌ Plan 'pro' existe en features.ts y migration
- ❌ Plan 'basic' y 'plus' NO existen en el código

---

### Archivos a corregir por DEV (en orden de prioridad)

1. `lib/features.ts` — Reescribir con planes basic/plus/multi + alumnos: Infinity
2. `types/database.ts` — Cambiar enum plan_tipo a "basic" | "plus" | "multi"
3. `app/api/auth/register-gym/route.ts` — Cambiar plan "starter" → "basic"
4. `supabase/migrations/0002_fix_planes.sql` — Migración para renombrar el enum
5. `app/api/cron/generar-cuotas/route.ts` — Implementar Dispatcher/Worker
6. `app/api/cron/aplicar-recargos/route.ts` — Implementar Dispatcher/Worker
7. `lib/supabase/admin.ts` — Agregar soporte para SUPABASE_DB_POOLER_URL
8. `.env.local` — Agregar SUPABASE_DB_POOLER_URL como placeholder
9. `lib/notifications/index.ts` — Crear NotificationService (antes de Semana 4)
10. Instalar `jose` para JWT tokens
