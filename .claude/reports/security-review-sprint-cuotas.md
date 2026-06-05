## SECURITY REVIEW — Sprint Cuotas (0005_sprint_cuotas.sql)
**Fecha:** 2026-06-05
**Estado:** ⚠️ OBSERVACIONES — fixes aplicados en migración y endpoints

### Hallazgos

| Severidad | Área | Descripción | Fix |
|---|---|---|---|
| 🔴 CRÍTICO | RLS cron_logs — policy sin FOR explícito | Policy sin `FOR SELECT` aplica a SELECT+UPDATE+DELETE, sin policy INSERT. Con RLS activo, inserts desde cliente autenticado fallan silenciosamente. | ✅ Reescrita con `FOR SELECT` explícito + `FOR INSERT WITH CHECK (false)` |
| 🔴 CRÍTICO | cuotas.tipo backfill ausente | `ALTER TABLE ADD COLUMN DEFAULT` no garantiza backfill de filas existentes en todos los runners. Cuotas existentes con `tipo IS NULL` no quedan cubiertas por los nuevos índices parciales. | ✅ Agregado `UPDATE cuotas SET tipo = 'mensual' WHERE tipo IS NULL` en migración |
| 🟡 ADVERTENCIA | Ventana DDL DROP/CREATE índices | DROP + CREATE de índices deben ejecutarse en transacción. Si el runner usa autocommit hay ventana sin constraint de unicidad. | Verificar que migration runner ejecuta DDL transaccional (Supabase CLI sí lo hace) |
| 🟡 ADVERTENCIA | tipo TEXT sin CHECK en DB | Columna `tipo` solo validada por Zod en API, inserts directos vía SQL pueden ingresar strings arbitrarios. | ✅ Agregado `CHECK (tipo IN ('mensual', 'clase_suelta', 'evento', 'inscripcion', 'personalizada'))` |
| 🟡 ADVERTENCIA | dias_minimos sin CHECK de rango | Valor negativo puede causar lógica incorrecta en generarCuotaAlta. | ✅ Agregado `CHECK (dias_minimos_para_cuota_alta >= 0 AND dias_minimos_para_cuota_alta <= 31)` |
| 🟡 ADVERTENCIA | generarCuotaAlta — gymId debe venir de sesión | Función usa admin client. gymId debe provenir siempre de la sesión autenticada, nunca del request body. | ✅ Confirmado: todos los call sites usan `getApiGymId()` que lee de JWT/sesión |
| 🔵 SUGERENCIA | rol 'owner' sin CHECK en gym_usuarios | La column `rol` es TEXT libre. Si nadie tiene rol='owner', los logs dispatcher son invisibles. | Agregar en futura migración: `CHECK (rol IN ('owner', 'admin', 'recepcion'))` — policy actualizada para incluir 'admin' también |

### Multi-tenancy: ✅
- Todos los endpoints nuevos filtran por `gym_id` del usuario autenticado
- Admin client usado solo server-side
- RLS activo en `cron_logs`

### Estado final: ✅ APROBADO con fixes aplicados
