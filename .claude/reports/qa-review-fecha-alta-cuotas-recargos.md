# QA Review — Dataset fecha_alta / cuotas / recargos
**Fecha:** 2026-06-06
**Agente:** qa-tester
**Alcance:** Campo `fecha_alta` editable en alta de alumno (migración de alumnos existentes), dataset de escenarios `generarCuotasMes` (cron mensual) y `aplicarRecargosGym` (cron de mora), regresión de `generarCuotaAlta`, y fix de `notificaciones_log` (rename `resend_id`→`provider_id`, `alumno_id` nullable).
**Estado final:** ⚠️ APROBADO CON OBSERVACIÓN — 68/69 tests pasan, 0 errores TypeScript. 1 test rojo pre-existente y no relacionado al alcance de este sprint (ver DEFECTO-1).

---

## Tests nuevos del dataset (alcance de esta revisión)

### `AlumnoInsertSchema.fecha_alta` — `__tests__/unit/lib/alumnos-fecha-alta.test.ts` (16 tests)

| Caso | Resultado | Detalle |
|---|---|---|
| hoy / hace 2 semanas / hace 1 mes / límite 90 días exacto | ✅ PASS | Acepta el rango completo `[hoy-90d, hoy]` inclusive |
| 91 días atrás / 6 meses / 1 año | ✅ PASS | Rechaza por `> FECHA_ALTA_MAX_DIAS_ATRAS` |
| mañana / +1 semana / +1 año | ✅ PASS | Rechaza fechas futuras |
| formatos inválidos (`15/06/2026`, `2026-6-5`, ISO con hora, vacío, texto) | ✅ PASS | Regex `^\d{4}-\d{2}-\d{2}$` rechaza todos |
| campo opcional (alta sin enviar `fecha_alta`) | ✅ PASS | `safeParse` ok sin el campo |
| no contamina otras validaciones | ✅ PASS | Error de `email` no genera falso positivo en `fecha_alta` |

Cobertura completa del límite de 90 días en ambos extremos (90 ok / 91 falla) y de la frontera "hoy / mañana". Buen dataset de boundary testing.

### `generarCuotasMes` — `__tests__/unit/lib/cuotas-mensual.test.ts` (7 tests)

| Caso | Resultado | Detalle |
|---|---|---|
| a. alumno con actividades → 1 cuota por actividad, prioriza `monto_personalizado` de la inscripción sobre `actividades.monto_base` | ✅ PASS | `insertSpy` recibe `monto_base: 9000` (personalizado) y `6000` (default actividad) |
| b. alumno sin actividades (legacy) → cuota única, prioriza `monto_cuota_personalizado` del alumno | ✅ PASS | `payload.monto_base === 7000`, sin `actividad_id` |
| c. legacy sin personalizado y sin default del gym → no genera (monto 0) | ✅ PASS | `creadas: 0`, insert no invocado |
| d. idempotencia ante 23505 | ✅ PASS | No incrementa contador ni propaga error |
| e. filtra por `activo=true` y `deleted_at=null` | ✅ PASS | Verificado contra los mocks de `eq`/`is` |
| f. gym sin `gym_config` → reporta motivo | ✅ PASS | `{ creadas: 0, error: "Sin configuración" }` |
| g. gym sin alumnos activos | ✅ PASS | `{ creadas: 0, error: null }` |

### `aplicarRecargosGym` — `__tests__/unit/lib/cuotas-recargos.test.ts` (5 tests)

| Caso | Resultado | Detalle |
|---|---|---|
| a. gym sin config de recargos → marca vencidas pero no evalúa recargo | ✅ PASS | Sólo 2 llamadas a `from`; nunca consulta cuotas vencidas para recargo |
| b. cuota vencida hace menos días que `recargo_1_dias` → sin recargo todavía | ✅ PASS | No llega a aplicar update |
| c. cuota cruza el umbral de nivel 1 → aplica % configurado | ✅ PASS | `monto_recargo: 1000` (10% de 10000), `recargo_nivel: 1`, `recargo_aplicado_en` seteado |
| d. cuota en nivel 1 cruza umbral de nivel 2 → escala | ✅ PASS | `monto_recargo: 5000` (25% de 20000), `recargo_nivel: 2` |
| e. nivel 1 aplicado pero `recargo_2_dias` no configurado → nunca evalúa nivel 2 | ✅ PASS | Sólo 3 llamadas a `from`, no consulta candidatos a nivel 2 |

Buena cobertura de las transiciones de estado de mora (umbral exacto, escalada, ausencia de configuración en cada nivel).

### `generarCuotaAlta` — caso de regresión agregado a `__tests__/unit/lib/cuotas-alta.test.ts`

| Caso | Resultado | Detalle |
|---|---|---|
| `fecha_alta` histórica (alumno migrado) no cambia el resultado | ✅ PASS | `generarCuotaAlta` nunca lee `fecha_alta`; el cálculo siempre usa "ahora". Un alumno migrado con alta hace 2 meses produce el mismo resultado que uno nuevo — documenta correctamente que el nuevo campo editable **no** dispara generación retroactiva de cuotas |

Este test es clave: confirma que exponer `fecha_alta` como editable en el formulario (para migrar alumnos preexistentes) **no introduce el riesgo de generar cuotas de alta retroactivas** ni de duplicar cobros. Comportamiento correcto y validado.

---

## Cambios de soporte revisados (fuera del dataset, pero en el mismo diff)

### `components/alumnos/alumno-form.tsx` + `lib/alumnos.ts`
- Nuevo input `fecha_alta` (tipo `date`), default = hoy en alta nueva, prellenado con valor existente en edición.
- Validación Zod (`fechaAltaSchema`): formato `YYYY-MM-DD`, rango `[hoy - 90 días, hoy]`, campo opcional.
- Mensaje explicativo en la UI ("Para migrar alumnos que ya entrenaban antes... No afecta cuándo se generan sus cuotas") — correcto y consistente con lo validado por el test de regresión de `generarCuotaAlta`.
- ✅ Sin observaciones. Código y copy alineados con el comportamiento real verificado por los tests.

### `notificaciones_log`: rename `resend_id` → `provider_id` + `alumno_id` nullable
- `app/actions/crons.ts` y `app/api/cron/workers/enviar-avisos-gym/route.ts`: ambos puntos de inserción migrados a `provider_id`, con manejo de error explícito (`logError` capturado y logueado en vez de ignorado con `await` suelto). Mejora de observabilidad correcta.
- `types/database.ts`: tipos `Row`/`Insert`/`Update` actualizados — se quitan `resend_id` y `enviado` (columna ya no existe), se mantiene `alumno_id: string | null`.
- `supabase/migrations/0006_fix_notificaciones_log_alumno_id.sql`: `ALTER TABLE notificaciones_log ALTER COLUMN alumno_id DROP NOT NULL;` — consistente con el tipo `alumno_id: string | null` y necesario para los emails de prueba/sistema sin alumno asociado (`testEmailAction`).
- Verificado: no quedan referencias residuales a `resend_id` ni a la columna `enviado` en `app/`, `lib/`, `types/`, `components/` ni `__tests__/` (búsqueda global sin resultados).
- ✅ Rename y migración consistentes de punta a punta.

---

## DEFECTO-1 (pre-existente, fuera del alcance de este dataset): test roto en `cuotas-especial.test.ts`

```
FAIL __tests__/integration/api/cuotas-especial.test.ts
  > tipo no mensual sin descripción → 400
TypeError: Cannot read properties of undefined (reading 'select')
  at app/api/cuotas/especial/route.ts:21:20  (admin.from("alumnos").select(...))
```

**Causa raíz:** el test (escrito en `157bdfe`, sprint cuotas) espera que `CuotaEspecialSchema` rechace con 400 una cuota `clase_suelta` sin `descripcion`, mockeando `from: vi.fn()` bajo el supuesto de que la ejecución nunca llega a tocar la DB. Pero el commit posterior `8dad40e` ("fix: bugs dashboard/cuotas/pagos...") **eliminó deliberadamente** el `.refine()` de `CuotaEspecialSchema` que exigía `descripcion` para tipos no-mensuales (mensaje del commit: *"Cuota especial: descripcion siempre opcional (remove refine + required)"*). El test no se actualizó para reflejar ese cambio de contrato intencional.

**Impacto real más allá del test roto:** como la validación Zod ahora acepta el payload sin `descripcion`, el flujo llega hasta `admin.from("alumnos")`. Esto es el comportamiento esperado en producción (Zod no objeta), así que el código de la ruta está bien — el problema es exclusivamente que el dataset de tests quedó desincronizado con una decisión de producto ya tomada.

**Recomendación:**
- Actualizar/eliminar el caso `"tipo no mensual sin descripción → 400"` en `__tests__/integration/api/cuotas-especial.test.ts` para reflejar que `descripcion` es opcional para todos los tipos (alineado con `8dad40e`), o reemplazarlo por un test que documente explícitamente "descripción opcional incluso en tipos no mensuales → 201".
- Esto **no bloquea** el merge del trabajo de `fecha_alta`/dataset cuotas/recargos (no toca esos archivos), pero sí debería resolverse antes de considerar la suite "verde" — actualmente hay 1 test rojo en `main` que generará ruido en cada corrida.

---

## Suite completa

```
Test Files  1 failed | 7 passed (8)
     Tests  1 failed | 68 passed (69)
  Duration  ~1s
```

Desglose relevante al alcance:
- `__tests__/unit/lib/alumnos-fecha-alta.test.ts` — 16 tests ✅ (NUEVO)
- `__tests__/unit/lib/cuotas-mensual.test.ts` — 7 tests ✅ (NUEVO)
- `__tests__/unit/lib/cuotas-recargos.test.ts` — 5 tests ✅ (NUEVO)
- `__tests__/unit/lib/cuotas-alta.test.ts` — 7 tests ✅ (6 previos + 1 regresión nueva)
- `__tests__/integration/api/cuotas-especial.test.ts` — 5/6 ✅, 1 ❌ (DEFECTO-1, pre-existente y no relacionado)
- Resto de la suite (features, dispatcher, alumnos API) — ✅ sin cambios

## TypeScript

```
npx tsc --noEmit → 0 errores
```

---

## Veredicto

**APROBADO para merge a main**, con la siguiente condición:
- Resolver DEFECTO-1 (actualizar el test obsoleto de `cuotas-especial.test.ts`) en un commit separado o en el mismo PR, para dejar la suite en 69/69 antes de mergear a `main`. No requiere tocar código de producción — sólo el dataset de test desincronizado de una decisión de producto ya aplicada en `8dad40e`.

Cobertura del dataset solicitado (`fecha_alta`/cuotas/recargos): **completa y de buena calidad**
- Boundary testing correcto en `fecha_alta` (90 días inclusive, fechas futuras, formatos).
- Cobertura de las ramas críticas de `generarCuotasMes` (actividades vs. legacy, prioridad de montos, idempotencia, filtros, ausencia de config/alumnos).
- Cobertura de las transiciones de mora en `aplicarRecargosGym` (umbral exacto, escalada nivel 1→2, ausencia de configuración).
- Test de regresión que **prueba explícitamente** que `fecha_alta` editable no dispara generación retroactiva de cuotas — el riesgo de negocio más relevante de este cambio queda cubierto.

TypeScript: limpio ✅
