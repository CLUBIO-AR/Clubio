# QA REVIEW — Semana 1, 2 y 3
**Fecha:** 2026-06-04
**Tests generados:** 27
**Tests pasando:** 8/27
**Estado:** ❌ BLOQUEADO — 19 tests fallan, todos por bugs críticos de planes

---

### Bugs encontrados

| ID | Severidad | Descripción | Reproducción | Fix sugerido |
|---|---|---|---|---|
| QA-01 | 🔴 CRÍTICO | `PLAN_FEATURES` tiene `starter` y `pro`, no `basic` y `plus` | `npm test` → features.test.ts falla 17/21 | Reescribir lib/features.ts |
| QA-02 | 🔴 CRÍTICO | Ningún plan tiene `alumnos: Infinity` | Test "sin límite de alumnos" falla | Agregar campo a todos los planes |
| QA-03 | 🔴 CRÍTICO | Ningún plan tiene `avisos_whatsapp` | Tests de WhatsApp fallan | Agregar campo con valores correctos |
| QA-04 | 🟡 MEDIO | Mock de `getAlumnos` falla porque la cadena de `.eq().is()` no está correctamente mockeada | Test de multi-tenancy | Mejorar mock con encadenamiento completo |

---

### Tests generados

| Archivo | Tests | Estado |
|---|---|---|
| `__tests__/unit/lib/features.test.ts` | 21 | ❌ 17 fallan |
| `__tests__/integration/api/alumnos.test.ts` | 3 | ❌ 2 fallan |
| `__tests__/integration/crons/dispatcher.test.ts` | 3 | ✅ 3 pasan |

---

### Resultado de npm test (pre-fix)
```
Test Files  2 failed | 1 passed (3)
     Tests  19 failed | 8 passed (27)
```

### Pendiente (para tests post-fix)
- Test de register-gym (verifica plan 'basic' creado, sin setup fee)
- Test de soft delete (el mock de alumnos necesita refinar la cadena)
- Test de cron generar-cuotas idempotente
- Test de cross-tenant (alumno de gym A no visible desde gym B)
