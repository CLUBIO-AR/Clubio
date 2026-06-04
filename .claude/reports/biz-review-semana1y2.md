# BIZ REVIEW — Semana 1, 2 y 3
**Fecha:** 2026-06-04
**Estado:** ❌ BLOQUEADO — bugs críticos de planes antes de continuar

---

### Hallazgos

#### 🔴 CRÍTICO — Planes incorrectos en todo el código
`lib/features.ts` define los planes como `starter / pro / multi`.
`PRODUCT.md v3.0` establece que los planes son `basic / plus / multi`.
Los planes `starter` y `pro` NO EXISTEN en el producto actual.

**Impacto:** Cualquier lógica de features (validación de WhatsApp, límite de admins, branding)
usa nombres de plan incorrectos. Si un gym en producción tiene plan `basic`, las validaciones
fallan o dan acceso incorrecto.

#### 🔴 CRÍTICO — Registro crea licencia con plan 'starter'
`app/api/auth/register-gym/route.ts` crea la licencia inicial con `plan: "starter"`.
El plan `starter` no existe en PRODUCT.md. El gym creado queda con un plan fantasma.

#### 🔴 CRÍTICO — Alumnos NO son ilimitados (falta el campo en features)
`lib/features.ts` no tiene el campo `alumnos: Infinity` en ningún plan.
En PRODUCT.md la regla es explícita: alumnos ilimitados en todos los planes.
Aunque hoy no hay validación en el CRUD, la ausencia de `alumnos: Infinity` en
features.ts es un riesgo para futuras validaciones que lo lean.

#### 🟡 MEDIO — Middleware no valida licencia vigente
`proxy.ts` solo valida que el usuario tenga sesión activa.
No verifica que la licencia del gym esté activa y no vencida.
Un gym con licencia expirada puede seguir usando la plataforma indefinidamente.

#### 🟡 MEDIO — Defaults de gym_config están incompletos
La migración SQL inicial tiene los defaults correctos (día 10, avisos 7/3/1, recargo 10%).
Pero el registro de gym NO crea gym_config con el campo `email_activo: true`, que será
necesario para el cron de avisos.

#### 🔵 SUGERENCIA — Registro de gym: el slug se genera automáticamente
El frontend auto-genera el slug desde el nombre del gym. Está bien, pero debería
mostrarle al dueño la URL final antes de confirmar: `clubio.app/[slug]`.
Esto refuerza la percepción de que tienen su propio espacio digital.

#### 🔵 SUGERENCIA — Dashboard: el resumen muestra stats pero no la acción más urgente
El dashboard actual muestra 4 cards de estadísticas. PRODUCT.md dice:
"El dueño del gym mira el dashboard para ver cuánto entró este mes."
Falta destacar visualmente los DEUDORES (cuotas vencidas) como prioridad de acción.
El color rojo ya está, pero podría haber un CTA directo tipo "Enviar aviso a 3 deudores".

---

### Recomendaciones (en orden de prioridad)

1. **INMEDIATO:** Corregir planes a `basic / plus / multi` + agregar `alumnos: Infinity`
2. **INMEDIATO:** Cambiar el registro de gym para crear licencia con plan `basic`
3. **Antes de Semana 4:** Agregar validación de licencia vigente en proxy.ts
4. **Semana 5:** Agregar CTA de acción directa en dashboard para deudores

---

### Impacto en negocio

Los bugs de planes son críticos para el pitch comercial: si un gym de demo tiene
plan `basic` y el código lee `starter`, las features aparecen incorrectamente.
Esto puede generar confusión en demos y problemas en producción desde el día 1.

La falta de validación de licencia vencida es un problema de revenue: gyms que no
renueven seguirán teniendo acceso sin pagar.
