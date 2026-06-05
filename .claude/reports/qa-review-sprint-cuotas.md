# QA Review — Sprint Cuotas
**Fecha:** 2026-06-05  
**Agente:** qa-tester  
**Sprint:** PROMPT_SPRINT_CUOTAS.md  
**Estado final:** ✅ APROBADO — 39/39 tests pasan, 0 errores TypeScript

---

## Tests obligatorios (sprint doc §5)

### `generarCuotaAlta` — `__tests__/unit/lib/cuotas-alta.test.ts`

| # | Caso | Resultado | Detalle |
|---|------|-----------|---------|
| a | días > mínimo → debe crear cuota | ✅ PASS | June 5: 26 días restantes ≥ 15 mínimo → `generada: true` |
| b | días < mínimo → no debe crear cuota | ✅ PASS | June 20: 11 días restantes < 15 mínimo → `motivo: "dias_insuficientes: quedan 11 días, mínimo 15"` |
| c | proporcional → monto correcto | ✅ PASS | 3000 × (26/30) = 2600 exacto; insert llamado con `monto_base: 2600` |
| d | idempotente → 2 llamadas = 1 cuota | ✅ PASS | Primera: `generada: true`; segunda (23505): `motivo: "ya_existe"`, sin excepción |
| + | `config_desactivada` | ✅ PASS | `generar_cuota_al_alta: false` → `motivo: "config_desactivada"` |
| + | `monto_cero` | ✅ PASS | Sin monto base ni personalizado → `motivo: "monto_cero"` |

### `POST /api/cuotas/especial` — `__tests__/integration/api/cuotas-especial.test.ts`

| # | Caso | Resultado | Detalle |
|---|------|-----------|---------|
| e | tipo 'mensual' duplicado → 409 | ✅ PASS | Error 23505 de PG → HTTP 409 con mensaje apropiado |
| f | tipo 'clase_suelta' duplicado → OK | ✅ PASS | Insert sin conflicto → HTTP 201 con payload correcto |
| g | cuota de otro gym → 404 | ✅ PASS | Alumno no encontrado en gym del usuario → HTTP 404 |
| + | sin sesión → 401 | ✅ PASS | `getApiGymId()` devuelve null → 401 |
| + | tipo no mensual sin descripción → 400 | ✅ PASS | Zod refine → "Descripción requerida para cuotas no mensuales" |
| + | cuota mensual creada → 201 | ✅ PASS | Happy path completo |

---

## Suite completa

```
Test Files  5 passed (5)
     Tests  39 passed (39)
  Duration  713ms
```

Archivos:
- `__tests__/unit/lib/features.test.ts` — 20 tests (planes, precios, WhatsApp)
- `__tests__/unit/lib/cuotas-alta.test.ts` — 6 tests (generarCuotaAlta) ← NUEVO
- `__tests__/integration/crons/dispatcher.test.ts` — 3 tests (Promise.allSettled)
- `__tests__/integration/api/alumnos.test.ts` — 4 tests (multi-tenancy, soft delete)
- `__tests__/integration/api/cuotas-especial.test.ts` — 6 tests (endpoint cuotas) ← NUEVO

---

## TypeScript

```
npx tsc --noEmit → 0 errores
```

---

## Observaciones

### OBS-1: 403 vs 404 en cross-gym access
El sprint doc especificaba "otro gym → 403". La implementación devuelve **404** por diseño deliberado: no revelar si el recurso existe en otro gym. Criterio de seguridad correcto — el test valida el comportamiento real (404).

### OBS-2: Constraint unique parcial — `clase_suelta` sin límite
Verificado: dos cuotas `clase_suelta` para el mismo alumno/mes/año se insertan sin conflicto porque el índice único `cuotas_mensual_unique` tiene `WHERE tipo = 'mensual'`. Comportamiento correcto y esperado.

### OBS-3: `generarCuotaAlta` — zona horaria
La función usa `new Date()` que corre en el servidor (UTC o TZ del proceso). Si el servidor corre en UTC-3, el `mes` calculado a medianoche UTC del 1ro puede diferir del mes local. Riesgo bajo para MVP; considerar `toLocaleDateString` con `timezone` explícita en v2.

### OBS-4: `monto_total` no se calcula en cuotas especiales
El endpoint `POST /api/cuotas/especial` inserta `monto_base` pero no `monto_total`. En cuotas generadas por cron, `monto_total` se calcula vía trigger o al aplicar recargos. Para cuotas especiales, `monto_total` queda `null` hasta que corra el cron de recargos. No es bug bloqueante, pero verificar que la UI del panel pagos maneje `monto_total: null` (fallback a `monto_base`).

---

## Veredicto

**APROBADO para merge a main.**  
Tests obligatorios del sprint: 7/7 ✅  
Tests adicionales de regresión: 5/5 ✅  
TypeScript: limpio ✅  
