# Checklist — Supabase

Referencia técnica para usar durante revisiones. Cada ítem es una pregunta a responder.

## Row Level Security (RLS)

- [ ] RLS habilitado en TODAS las tablas con datos de usuario o cliente
- [ ] Las policies filtran por `auth.uid()` y no por valores hardcodeados
- [ ] Existen policies para SELECT, INSERT, UPDATE y DELETE por separado donde corresponde
- [ ] Las policies de INSERT incluyen `WITH CHECK` (no solo `USING`)
- [ ] No existen tablas con `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`
- [ ] Las funciones helper (`get_user_gym_id()`, etc.) tienen `SECURITY DEFINER` solo si es necesario
- [ ] Las vistas (`VIEW`) tienen RLS aplicado o son de lectura pública justificada

## Clients — server vs browser

- [ ] `createServerClient` usado en Server Components, API Routes y Server Actions
- [ ] `createBrowserClient` usado solo en Client Components
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca en variables `NEXT_PUBLIC_*`
- [ ] El admin client (`service_role`) usado solo server-side para operaciones privilegiadas
- [ ] `supabase.auth.getUser()` usado en server-side (no `getSession()` que puede ser stale)
- [ ] Admin client usa `SUPABASE_DB_POOLER_URL` (no la URL directa en conexiones de cron/batch)

## Storage y Buckets

- [ ] Buckets privados para archivos de usuarios (no públicos por defecto)
- [ ] Policies de storage presentes en buckets privados (SELECT, INSERT, DELETE)
- [ ] No existen buckets públicos innecesarios
- [ ] Los uploads validan tipo de archivo y tamaño server-side
- [ ] Las URLs de archivos privados se generan con `createSignedUrl` (no `getPublicUrl`)

## Queries y seguridad

- [ ] No existen queries construidas con string concatenation o template literals con input del usuario
- [ ] Los inputs validados con Zod antes de llegar a cualquier query
- [ ] No existen queries sin filtro de tenant (gym_id, user_id) en tablas compartidas
- [ ] `.single()` usado con manejo de error (puede lanzar si no encuentra nada)
- [ ] `.maybeSingle()` usado cuando el resultado puede ser null sin ser un error

## Estructura de datos

- [ ] Soft delete implementado con `deleted_at` (no DELETE físico en datos importantes)
- [ ] Tablas de auditoría/pagos son inmutables (sin UPDATE donde no corresponde)
- [ ] Índices presentes para queries frecuentes (gym_id, user_id, created_at)
- [ ] Foreign keys con CASCADE o RESTRICT según corresponda al dominio
- [ ] Timestamps con timezone (`timestamptz`, no `timestamp`)

## Funciones y triggers

- [ ] Las funciones con `SECURITY DEFINER` tienen `search_path` explícito
- [ ] Los triggers no realizan operaciones que puedan causar loops
- [ ] Las funciones RPC validean parámetros de entrada
