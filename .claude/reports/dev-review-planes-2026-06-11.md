# DEV REVIEW — Eliminación del plan Plus
**Fecha:** 2026-06-11  
**Estado:** ✅ COMPLETO

## Resumen

El plan `plus` (USD 45/mes) fue eliminado del catálogo activo. Los planes vigentes son `basic` (USD 28) y `multi` (USD 75). Los gyms legacy con plan `plus` en base de datos siguen operativos; se muestran como "Plus (legacy)" en la UI pero no se puede crear nuevas licencias ni cambiar planes a `plus`.

---

## Archivos modificados

### Core
| Archivo | Cambio |
|---|---|
| `lib/features.ts` | Eliminado `plus`. Basic: `max_admins 3`, `branding_propio true`. Tipo `Plan = 'basic' \| 'multi'` |

### Actions (server-side)
| Archivo | Cambio |
|---|---|
| `app/actions/admin-nuevo-gym.ts` | Zod enum `["basic", "multi"]` |
| `app/actions/admin-gyms.ts` | `cambiarPlanAction` param `"basic" \| "multi"` |
| `app/actions/admin-settings.ts` | Removido `planPlusPrecio` de params y upsert |
| `app/actions/admin-suscripciones.ts` | `PLAN_LABELS`: `plus: "Plus (legacy)"` |

### Componentes admin
| Archivo | Cambio |
|---|---|
| `components/admin/AdminBadge.tsx` | `PLAN_LABELS.plus: "Plus (legacy)"` |
| `components/admin/LicenciasClient.tsx` | Dialog: tipo `"basic" \| "multi"`, opción plus removida; PLAN_OPTS filter mantiene legacy |
| `components/admin/GymsClient.tsx` | `PLAN_OPTS.plus.label: "Plus (legacy)"` |
| `components/admin/GymDetailClient.tsx` | Dialog: opción plus removida, cast `"basic" \| "multi"` |
| `components/admin/AdminSettingsClient.tsx` | Prop/estado `planPlusPrecio` removidos, grid 2 cols |
| `components/admin/NuevoGymWizard.tsx` | `PLAN_PRECIOS` sin plus, estado `"basic" \| "multi"` |
| `components/admin/SuscripcionesClient.tsx` | `PLAN_LABELS.plus: "Plus (legacy)"` |

### Páginas admin
| Archivo | Cambio |
|---|---|
| `app/(admin)/admin/settings/page.tsx` | Prop `planPlusPrecio` removida |
| `app/(admin)/admin/licencias/page.tsx` | Cast `plan as string` |
| `app/(admin)/admin/gyms/page.tsx` | Cast `plan as string` |

### Dashboard gym
| Archivo | Cambio |
|---|---|
| `app/(dashboard)/dashboard/suscripcion/page.tsx` | `PLAN_LABELS.plus: "Plus (legacy)"` |

### Crons
| Archivo | Cambio |
|---|---|
| `app/api/cron/avisos-suscripcion/route.ts` | `PLAN_LABELS.plus: "Plus (legacy)"` |
| `app/api/cron/generar-cobros-suscripcion/route.ts` | `PLAN_LABELS.plus: "Plus (legacy)"` |

### Tests
| Archivo | Cambio |
|---|---|
| `__tests__/unit/lib/features.test.ts` | Tests plus eliminados; nuevo test `'plus' NO EXISTE`; `basic` max_admins=3, branding=true; tipo Plan `["basic","multi"]` |

### Agentes y documentación
| Archivo | Cambio |
|---|---|
| `AGENTS.md` | Contexto de negocio actualizado |
| `.claude/agents/dev.md` | Planes y checklist actualizados |
| `.claude/agents/biz-validator.md` | Tabla de planes y contexto actualizados |
| `.claude/agents/qa-tester.md` | Casos borde actualizados (WA solo Multi) |
| `.claude/agents/security-arch.md` | Contexto y checklist actualizados |

### Base de datos
| Archivo | Cambio |
|---|---|
| `supabase/seeds/demo-gym.sql` | `'plus'` → `'basic'` en demo gym |
| `supabase/migrations/0013_planes_cleanup.sql` | Comentario de auditoría en columna `licencias.plan` |

---

## Lo que NO se tocó (intencional)

- `lib/admin/settings.ts` — `plan_plus_precio` se mantiene en `AdminSettings` type y SELECT para calcular cobros de gyms legacy
- `plan_tipo_v2` ENUM en PostgreSQL — no se elimina `'plus'` del enum para preservar integridad referencial
- Datos existentes en `licencias` — gyms con `plan = 'plus'` no se migran

## Landing page

La landing es un repositorio separado. La tabla de planes allí debe actualizarse independientemente para mostrar 2 columnas activas (Basic / Multi) + 1 columna deshabilitada "Pro — Próximamente".
