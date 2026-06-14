# CLUBIO — Manual Técnico

> Referencia para desarrolladores: arquitectura, modelo de datos, integraciones,
> variables de entorno y guía para crear un nuevo entorno desde cero.
>
> Última actualización: 09/06/2026

---

## 1. Visión general del sistema

CLUBIO es un SaaS multi-tenant B2B para la gestión de gimnasios. El sistema tiene
tres proyectos independientes que trabajan juntos:

```
clubio.com.ar          → Landing page (captación de leads)
app.clubio.com.ar      → App principal (panel del gym + panel de superadmin)
Supabase               → DB + Auth + Storage (compartido por ambos proyectos)
```

### Flujo de vida de un cliente nuevo

```
Lead llena formulario en landing
        ↓
Landing POST /api/leads → app principal
        ↓
Superadmin contacta al lead desde panel admin
        ↓
Superadmin crea el gym manualmente (wizard en /admin/gyms/nuevo)
        ↓
Owner del gym recibe email con credenciales
        ↓
Owner configura MP, activa notificaciones y empieza a operar
        ↓
Crons automáticos generan cuotas, envían avisos y aplican recargos
        ↓
Alumnos reciben links y pagan; webhooks actualizan estados en tiempo real
```

---

## 2. Proyectos

### 2.1 Landing (clubio.com.ar)

**Repositorio:** `c:\Git\Clubio-Landing\Landing`

**Stack:**
- Next.js 16 App Router, React 19, TypeScript 5
- Tailwind CSS v4, Lucide React
- Sin base de datos propia — cliente puro

**Función:** captación de leads. El formulario de demo (`components/FormDemo.tsx`)
hace un `POST` al endpoint `/api/leads` de la app principal:

```
NEXT_PUBLIC_CLUBIO_API_URL/api/leads
```

En producción `NEXT_PUBLIC_CLUBIO_API_URL = https://app.clubio.com.ar`.

**Payload enviado:**
```json
{
  "nombre": "string",
  "email": "string",
  "telefono": "string",
  "gym_nombre": "string | undefined",
  "cantidad_alumnos": "string | undefined",
  "como_nos_conocio": "string | undefined"
}
```

**SEO:** tiene `app/robots.ts`, `app/sitemap.ts`, `app/opengraph-image.tsx`,
`app/twitter-image.tsx` y Schema.org `SoftwareApplication` en el layout.
Google Search Console verificado (`qZoYdyrKYsKTNtk4qkvpbR1gRqtrnsj_Ng1PD`).

**Security headers** en `next.config.ts`:
`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`,
cache inmutable para assets estáticos (1 año).

**Variable de entorno requerida:**
| Variable | Descripción | Producción |
|---|---|---|
| `NEXT_PUBLIC_CLUBIO_API_URL` | URL base de la app | `https://app.clubio.com.ar` |

---

### 2.2 App principal (app.clubio.com.ar)

**Repositorio:** `c:\Git\Clubio\Clubio`

**Stack:**
- Next.js 16 App Router, React 19, TypeScript 5
- Supabase (PostgreSQL + Auth + RLS + Storage)
- MercadoPago SDK (`mercadopago`)
- Resend (emails transaccionales)
- Tailwind CSS v4
- Zod v4 (validación)
- `jose` (JWT firmados para links de pago)
- Vercel (hosting + Vercel Cron)

**Dos paneles en el mismo deploy:**

| Panel | Ruta | Quién accede |
|---|---|---|
| Panel del gym | `/dashboard/*` | Owner / admin / recepcionista del gym |
| Panel de superadmin | `/admin/*` | Equipo CLUBIO |

#### Estructura de carpetas

```
app/
  (auth)/login                        → autenticación
  (dashboard)/dashboard/              → panel del gym
    alumnos/, cuotas/, pagos/
    actividades/, configuracion/
    suscripcion/                      → estado y cobros de la licencia CLUBIO
    crons/, emails/                   → monitoreo interno
  (admin)/admin/                      → panel de superadmin
    gyms/, licencias/, leads/
    suscripciones/, superadmins/
    settings/, logs/
  pagar/
    [token]/                          → pago individual (link JWT público)
    lote/[token]/                     → pago de múltiples cuotas (JWT)
  api/
    leads/                            → recibe leads de la landing
    alumnos/, cuotas/, pagos/         → REST interno del panel gym
    actividades/, config/
    cron/                             → endpoints de Vercel Cron
      workers/                        → lógica por-gym (dispatcher → worker)
      trigger/                        → disparo manual desde el dashboard
    webhooks/
      mercadopago/                    → pagos de cuotas de alumnos
      mp-suscripciones/               → pagos de suscripción CLUBIO
    cuotas/[id]/generar-link-pago/    → genera JWT de pago por demanda
    cuotas/pagar-lote/                → crea preferencia MP multi-cuota

components/
  alumnos/, cuotas/, pagos/, configuracion/
  crons/, layout/, emails/, ui/
  admin/                              → componentes del panel de superadmin

lib/
  supabase/
    client.ts      → cliente browser (anon key)
    server.ts      → cliente SSR (cookies de sesión)
    admin.ts       → cliente service_role (bypassea RLS)
    api-auth.ts    → getApiGymContext() / getApiGymId()
    auth.ts        → getGymContext() / requireGymContext()
  notifications/
    index.ts       → sendNotification() — punto de entrada único
    channels/
      email.ts     → Resend
      whatsapp.ts  → placeholder (Plan Plus/Multi, MVP 2.5)
  email/
    template.ts    → clubioEmailHtml(), emailAccentColor()
    aviso-cuota-inmediato.ts → email al crear alumno con cuota
  mercadopago.ts   → createMpPreference(), getMpPayment(), getMpClient()
  cuotas.ts        → lógica de negocio: generación, recargos, marcado de pago
  alumnos.ts       → CRUD de alumnos con schemas Zod
  cron-logger.ts   → logCron() — auditoría de ejecuciones
  admin/
    settings.ts    → getAdminSettings() (cacheado, servicio-role)
    pagination.ts  → helper de paginación para el panel admin
  features.ts      → PLAN_FEATURES (planes y límites)
  theme.ts         → T — tokens de color globales

supabase/migrations/    → SQL versionado (0001…0008)
proxy.ts                → middleware Next 16 (auth + CRON_SECRET)
vercel.json             → definición de los 7 crons programados
public/
  manifest.json         → Web App Manifest
  robots.txt            → SEO
```

---

## 3. Modelo de datos

### 3.1 Tablas por dominio

#### Tenant y licencia
| Tabla | Descripción |
|---|---|
| `gyms` | Entidad principal del tenant. `activo` controla el acceso. |
| `licencias` | Plan, fecha de inicio/vencimiento, precio pagado, `es_trial`. |
| `sucursales` | Sedes del gym (plan Multi: hasta 5). |
| `gym_config` | Configuración por tenant: credenciales MP, recargos, branding, día de vencimiento, avisos. |
| `sucursal_config` | Config específica de sucursal (hereda de `gym_config`). |

#### Usuarios
| Tabla | Descripción |
|---|---|
| `gym_usuarios` | Mapea `auth.users` → `gym_id` + `rol` (owner/admin/recepcion). Email denormalizado. |
| `admin_users` | Superadmins de CLUBIO. `activo` controla el acceso. |

#### Facturación interna (cuotas de alumnos)
| Tabla | Descripción |
|---|---|
| `alumnos` | Datos del alumno: nombre, DNI, email, estado, monto personalizado. |
| `actividades` | Clases/actividades con monto base y recargos propios. |
| `alumno_actividades` | Inscripciones: `alumno_id + actividad_id + monto_personalizado`. |
| `cuotas` | Una fila por cuota mensual. `estado`: pendiente/vencida/pagada/condonada/pagada_parcial. Incluye `monto_total` (con recargos). |
| `cuota_lotes` | Agrupación de cuotas para pago único ("pagar todo"). `cuota_ids uuid[]`. |
| `pagos` | Registro de cada pago: método, monto, `mp_payment_id` (deduplicación). |

#### Facturación de suscripción CLUBIO (cobros a gyms)
| Tabla | Descripción |
|---|---|
| `cobros_suscripcion` | Cobro mensual al gym. UNIQUE(licencia_id, periodo). `estado`: pendiente/pagado/vencido/cancelado. `renovacion_aplicada` marca si ya extendió la licencia. |
| `admin_settings` | Singleton de configuración global: tipo de cambio, precios de planes, token MP de CLUBIO. RLS deny-all (solo service_role). |

#### Operaciones y auditoría
| Tabla | Descripción |
|---|---|
| `notificaciones_log` | Cada email/WA enviado a un alumno: canal, estado, provider_id. |
| `cron_logs` | Ejecución de cada cron: tipo, gym, items creados, duración, errores. |
| `admin_logs` | Audit trail de acciones de superadmins (suspensiones, cambios de plan, etc.). |
| `leads` | Prospectos que llegaron del formulario de la landing. `estado`: nuevo/contactado/demo_agendada/convertido/perdido. |

### 3.2 Aislamiento RLS

Todas las tablas de datos de gyms tienen `RLS habilitado` con policies de aislamiento
por `gym_id`. El patrón base:

```sql
-- Gym ve solo sus propios datos
CREATE POLICY gym_isolation ON cuotas
  USING (gym_id = (
    SELECT gym_id FROM gym_usuarios WHERE id = auth.uid()
  ));
```

**Regla crítica:** el cliente `admin.ts` (service_role) **bypassea RLS** — usar
exclusivamente en crons, webhooks y Server Actions autorizados. Nunca en código
que ejecuta contexto del usuario del gym.

---

## 4. Autenticación y autorización

### Flujo de sesión

```
Browser → Supabase Auth (JWT en cookie httpOnly)
       → proxy.ts verifica sesión en cada request
       → getGymContext() / getApiGymContext() resuelve gymId + rol
```

**`proxy.ts`** (reemplaza `middleware.ts` en Next.js 16):
- `/api/cron/*` → verifica `Authorization: Bearer CRON_SECRET`
- `/pagar/*`, `/login`, webhooks, `/api/leads` → pasan sin sesión
- Resto de UI (`/dashboard/*`, `/admin/*`) → requiere sesión válida, redirige a `/login`

**En Server Components:** `requireGymContext()` → redirige a login si no hay sesión.
**En API routes:** `getApiGymContext()` → retorna `null` si no autenticado (el handler devuelve 401).

### Roles del gym
| Rol | Permisos |
|---|---|
| `owner` | Todo — incluye configuración, facturación, usuarios |
| `admin` | Gestión de alumnos, cuotas y pagos |
| `recepcion` | Solo lectura + marcar asistencia (MVP futuro) |

### Links de pago sin login
Los links `/pagar/[token]` y `/pagar/lote/[token]` usan JWT firmados con `JWT_SECRET`
(via `jose`), válidos 30 días. No requieren sesión Supabase. El token contiene:
`cuota_id`, `gym_id`, `alumno_id`, `alumno_nombre`, `mes`, `anio`, `monto`.

---

## 5. Pagos — MercadoPago

### Dos flujos de pago paralelos

| Flujo | Token MP | Webhook |
|---|---|---|
| Cuotas de alumnos | `gym_config.mp_access_token` (del gym) | `/api/webhooks/mercadopago?gym_id={id}` |
| Suscripción CLUBIO | `admin_settings.clubio_mp_access_token` | `/api/webhooks/mp-suscripciones` |

### Pago de cuota individual

```
Gym genera link → /api/cuotas/[id]/generar-link-pago
→ JWT firmado
→ /pagar/[token]
→ createMpPreference() con external_reference = cuota_id
→ redirect a init_point de MP
→ Webhook /api/webhooks/mercadopago
→ Verifica pago con MP (no confiar solo en el webhook)
→ Deduplication: pagos.mp_payment_id
→ Insert pagos + Update cuota.estado = "pagada"
```

### Pago de lote (múltiples cuotas)

```
/api/cuotas/pagar-lote  (desde panel gym)
  O
/pagar/lote/[token]     (desde email consolidado)

→ Crea cuota_lotes con cuota_ids[]
→ createMpPreference() con items[] y external_reference = "lote-{lote_id}"
→ redirect a init_point
→ Webhook detecta "lote-" prefix
→ Deduplication: cuota_lotes.mp_payment_id
→ Marca lote como pagado
→ Insert pagos + Update estado para cada cuota
```

### Suscripción CLUBIO (cobros a gyms)

```
Cron generar-cobros-suscripcion
→ Detecta licencias a vencer en N días
→ UNIQUE(licencia_id, periodo) previene duplicados
→ Crea cobros_suscripcion + preferencia MP
→ Envía email al gym con link

Webhook /api/webhooks/mp-suscripciones
→ Verifica pago aprobado
→ Renovación en cascada: aplica +1 mes por cada cobro pagado no aplicado
→ Reactiva gym si estaba suspendido
→ updateTag("gym-ctx-{userId}") por cada usuario del gym (invalida cache de sesión)
```

---

## 6. Notificaciones

**Regla:** nunca importar Resend o Meta directamente desde crons/API routes.
Siempre usar `sendNotification()` de `lib/notifications/index.ts`.

### Tipos de notificación

| Tipo | Canal | Cuándo |
|---|---|---|
| `aviso_vencimiento` | Email (+ WA futuro) | Cuota próxima a vencer (cron diario + alta de alumno) |
| `recordatorio_vencido` | Email (+ WA futuro) | Cuota ya vencida (hasta max_avisos configurado) |
| `confirmacion_pago` | Email | Al confirmar pago (no implementado aún vía webhook) |
| Email consolidado | Email directo Resend | Alumno con 2+ cuotas pendientes → un solo email con tabla + "Pagar todo" |

### Email de bienvenida al gym
`sendGymWelcomeEmail()` en `lib/notifications/channels/email.ts` — se llama
desde la action `crearGymAction()` cuando el superadmin da de alta un nuevo gym.

### Plantillas personalizables
Cada gym puede editar las plantillas de `aviso_vencimiento` y `recordatorio_vencido`
(subject + body en texto plano con variables `{nombre}`, `{gym}`, `{monto}`, `{mes}`, `{anio}`)
desde Configuración → Notificaciones.

---

## 7. Crons

Definidos en `vercel.json`. Protegidos por `Authorization: Bearer CRON_SECRET`.
Patrón dispatcher → worker: el dispatcher itera todos los gym_ids activos y
llama al worker por cada uno. Toda ejecución se audita en `cron_logs`.

| Cron | Schedule | Función |
|---|---|---|
| `generar-cuotas` | `0 8 1 * *` | Genera cuotas mensuales para alumnos activos (1 por actividad inscripta, o 1 global si sin actividades) |
| `enviar-avisos` | `0 9 * * *` | Envía emails de aviso/recordatorio; consolida en un email si el alumno tiene N > 1 cuotas |
| `aplicar-recargos` | `1 0 * * *` | Aplica recargos por mora según la configuración del gym |
| `verificar-suscripciones` | `0 7 * * *` | Suspende gyms con licencia vencida; invalida cache de sesión |
| `generar-cobros-suscripcion` | `0 9 * * *` | Genera cobros y links de pago para gyms que vencen en N días |
| `vencer-cobros-suscripcion` | `0 10 * * *` | Marca como "vencido" cobros pendientes de períodos pasados |
| `avisos-suscripcion` | `30 8 * * *` | Emails informativos al gym cuando faltan 30/14/7/3 días para vencer |

---

## 8. Cache e invalidación

`lib/supabase/auth.ts` cachea el contexto de sesión del gym usuario con
`unstable_cache` y el tag `gym-ctx-{userId}`. Se invalida con:

- `updateTag("gym-ctx-{userId}")` — desde Server Actions (1 argumento)
- `revalidateTag("gym-ctx-{userId}")` — desde Route Handlers (2 argumentos)

Se invalida en: suspensión del gym, reactivación, renovación de licencia, cambio
de plan, activación/desactivación de usuario.

---

## 9. Planes y features

`lib/features.ts` define `PLAN_FEATURES`. Planes válidos: **basic**, **plus**, **multi**.
`starter` y `pro` **no existen**.

| | Basic (USD 28/mes) | Plus (USD 45/mes) | Multi (USD 75/mes) |
|---|---|---|---|
| Sucursales máx. | 1 | 1 | 5 |
| Admins máx. | 2 | 3 | 10 |
| Alumnos | ilimitados | ilimitados | ilimitados |
| Cobros automáticos + pago sin login | ✓ | ✓ | ✓ |
| Avisos por email | ✓ | ✓ | ✓ |
| Avisos por WhatsApp | — | ✓ | ✓ |
| Branding en emails | — | ✓ | ✓ |
| QR asistencia / clases | — | — | ✓ |

Sin setup fee. El alta de gimnasios **no es self-serve** — siempre se gestiona
vía formulario de demo + superadmin.

---

## 10. Variables de entorno

### App principal (app.clubio.com.ar)

| Variable | Descripción | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Pública. Usar proyecto de **producción**. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon de Supabase | Pública. RLS protege los datos, no esta clave. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (bypassea RLS) | **Secreta**. Solo server-side. Rotar si se filtra. |
| `NEXT_PUBLIC_APP_URL` | URL base pública | `https://app.clubio.com.ar` — sin slash final. Para `back_urls`, `notification_url` MP, links JWT. |
| `MP_ACCESS_TOKEN` | Token MP de la plataforma (fallback gyms sin token propio) | Credenciales de **producción** de MP. |
| `CLUBIO_MP_ACCESS_TOKEN` | Token MP de CLUBIO para cobrar suscripciones | Configurable también desde `/admin/settings`. DB tiene precedencia. |
| `RESEND_API_KEY` | API key de Resend | Dominio remitente debe estar verificado en Resend. |
| `RESEND_FROM_DEFAULT` | Email remitente por defecto | Dominio verificado en Resend. Ej.: `noreply@clubio.app`. |
| `CRON_SECRET` | Secreto para autenticar `/api/cron/*` | `openssl rand -hex 32`. Vercel Cron lo incluye automáticamente si está en env. |
| `JWT_SECRET` | Secreto para firmar JWT de links de pago | `openssl rand -hex 32`. **Nuevo valor** en producción. |

### Landing (clubio.com.ar)

| Variable | Descripción | Notas |
|---|---|---|
| `NEXT_PUBLIC_CLUBIO_API_URL` | URL de la app principal | `https://app.clubio.com.ar` |

---

## 11. Crear un entorno desde cero

### 11.1 Base de datos (Supabase)

1. Crear proyecto nuevo en Supabase.
2. Ejecutar las migraciones en orden desde el SQL Editor o via CLI:
   ```
   0001_initial.sql
   0002_...
   ...
   0008_cuota_lotes.sql
   ```
   Los archivos `seed_*.sql` son datos de prueba — **no** ejecutar en producción.
3. Verificar que RLS está habilitado en todas las tablas relevantes.
4. Copiar: URL, anon key, service_role key, connection string del pooler.
5. (Opcional) Regenerar tipos TypeScript:
   ```bash
   npx supabase gen types typescript --project-id <id> > types/database.ts
   ```

### 11.2 Variables de entorno

1. Completar todos los valores en `.env.local` (ver tabla sección 10).
2. Generar secretos nuevos para producción:
   ```bash
   openssl rand -hex 32  # para CRON_SECRET y JWT_SECRET
   ```
3. Cargar las mismas variables en Vercel → Project Settings → Environment Variables.

### 11.3 Servicios externos

- **MercadoPago:** credenciales de producción para `MP_ACCESS_TOKEN` y `CLUBIO_MP_ACCESS_TOKEN`.
- **Resend:** verificar dominio (SPF/DKIM), generar API key de producción.
- **WhatsApp (Plan Plus/Multi):** pendiente MVP 2.5 — cada gym conecta su número propio desde la configuración.

### 11.4 Deploy

1. Importar repo en Vercel, asociar dominio.
2. Definir `NEXT_PUBLIC_APP_URL` con la URL final.
3. `vercel.json` activa los 7 crons automáticamente al detectarlo.
4. Correr `npm run build` localmente antes del primer deploy.

### 11.5 Validación post-deploy

1. Crear gym de prueba → alta de alumno → generar cuota → pagar (sandbox MP) → verificar webhook.
2. Disparar crons manualmente desde `/dashboard` y revisar `cron_logs`.
3. Confirmar aislamiento RLS: dos gyms no deben ver datos entre sí.
4. Correr revisión de seguridad antes de habilitar acceso a clientes reales.

---

## 12. Notas técnicas importantes

- **Next.js 16** usa `proxy.ts` (no `middleware.ts`) con export `proxy` + `proxyMatcher`.
- **Zod v4:** `ZodError` usa `.issues`, no `.errors`.
- **`updateTag` vs `revalidateTag`:** en Server Actions usar `updateTag(tag)` (1 argumento); en Route Handlers usar `revalidateTag(tag)` (puede diferir — leer `node_modules/next/dist/docs/`).
- **Cliente admin bypassea RLS** — reservado para crons, webhooks, Server Actions con permisos explícitos. Nunca en handlers de usuario normal.
- **CORS entre landing y app:** la landing hace fetch a `app.clubio.com.ar/api/leads` — verificar que los headers CORS lo permitan en producción.
- **Favicon / íconos:** en `app/favicon.ico`, `app/icon.png` (512×512), `app/apple-icon.png` (180×180). Next.js App Router los sirve automáticamente — no duplicar en `public/`.
- **`@react-email/components` v1** está deprecado — migrar a v2 cuando se actualicen los templates.
