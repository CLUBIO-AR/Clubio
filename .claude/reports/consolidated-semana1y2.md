# REPORTE CONSOLIDADO — Revisión Semana 1, 2 y 3
**Fecha:** 2026-06-04
**Estado:** ✅ LISTO PARA SEMANA 4

---

## Resumen ejecutivo

Se encontraron **3 bugs críticos** y **5 advertencias** en el código de Semanas 1-3.
Todos los críticos fueron corregidos. El build pasa, los 27 tests pasan, TypeScript sin errores.

---

## Bugs críticos encontrados y corregidos

| # | Bug | Impacto | Fix aplicado |
|---|---|---|---|
| C-01 | Planes `starter`/`pro` en `lib/features.ts` | Demo y producción con lógica incorrecta | Reescrito con `basic`/`plus`/`multi` + `alumnos: Infinity` |
| C-02 | `register-gym` creaba licencia con plan `starter` | Todos los gyms nuevos tenían plan fantasma | Cambiado a plan `basic` con `es_trial: true` |
| C-03 | Crons usaban loop secuencial `for...of` | Timeout con >10 gyms en Vercel (límite 60s) | Implementado patrón Dispatcher/Worker con `Promise.allSettled` |

---

## Advertencias corregidas

| # | Advertencia | Fix aplicado |
|---|---|---|
| A-01 | Admin client no usaba `SUPABASE_DB_POOLER_URL` | Agregado con fallback a `NEXT_PUBLIC_SUPABASE_URL` |
| A-02 | `jose` no instalado (JWT para Semana 4) | Instalado `jose@6.2.3` |
| A-03 | No existía `NotificationService` | Creado `lib/notifications/` con `index.ts`, `channels/email.ts`, `channels/whatsapp.ts` |
| A-04 | `gym_config` sin columnas `email_activo`/`whatsapp_activo` | Agregado en tipos + migración `0002` |
| A-05 | Tipos `database.ts` con enum incorrecto y sin campos nuevos | Actualizado: plan_tipo, licencias (es_trial), gym_config (whatsapp fields) |

---

## Commits aplicados

```
security: corregir planes starter/pro → basic/plus/multi + alumnos Infinity
security: cambiar licencia inicial de starter a basic con trial flag
security: implementar patron Dispatcher/Worker en crons generar-cuotas y aplicar-recargos
fix: admin client usa SUPABASE_DB_POOLER_URL con fallback
feat: crear NotificationService + canal email + whatsapp stub
fix: tipos database.ts actualizados con nuevos campos y planes correctos
chore: instalar jose, agregar RESEND_FROM_DEFAULT al .env
```

---

## Estado final de verificación

```
npm test     ✅ 27/27 tests pasan
npm run build ✅ Build limpio
tsc --noEmit  ✅ Sin errores de tipos
grep starter  ✅ Solo en tests (donde corresponde)
grep pro      ✅ Solo en tests (donde corresponde)
```

---

## Pendientes que requieren decisión del product owner

| # | Pendiente | Decisión requerida |
|---|---|---|
| P-01 | Migración `0002_fix_planes_y_schema.sql` pendiente de ejecutar en Supabase | Ejecutar manualmente en Supabase SQL Editor antes de Semana 4 |
| P-02 | `SUPABASE_DB_POOLER_URL` en `.env.local` está vacío | Copiar URL del pooler desde Supabase Settings > Database |
| P-03 | Proxy no valida licencia vigente (gym expirado sigue entrando) | Agregar en Semana 5 junto con página de "licencia vencida" |
| P-04 | Los planes `starter` y `pro` siguen existiendo en el enum de Supabase (PostgreSQL no permite DROP VALUE de enum) | Los valores quedan como "zombie" pero el código nunca los usa. Aceptable. |
| P-05 | NotificationService/email usa template HTML básico | Semana 5: integrar React Email templates |

---

## ✅ LISTO PARA SEMANA 4

Los bloqueantes críticos están resueltos. La arquitectura de crons y notificaciones
está en el estado que requiere el spec. Semana 4 puede arrancar con:
- Integración MercadoPago (crear preference + webhook)
- Página `/pagar/[token]` sin login (usando `jose` ya instalado)
- Registro de pago manual (1 click desde dashboard)
- Cron `enviar-avisos` usando `NotificationService.sendNotification()`
