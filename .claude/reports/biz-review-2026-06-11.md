## BIZ REVIEW — MVP Pre-Launch

**Fecha:** 2026-06-11
**Estado:** ⚠️ APROBADO CON OBSERVACIONES

---

### Hallazgos

**CRÍTICO — C1: No hay onboarding guiado para el primer gym**
El gym recibe acceso al panel pero no tiene un wizard que lo lleve paso a paso: configurar MP, cargar primera actividad, dar de alta primer alumno. En el mercado interior (Resistencia, Chaco), el dueño del gym típicamente no es técnico. Si en los primeros 15 minutos no logra cobrar su primera cuota, churna antes de pagar el segundo mes. El superadmin tiene un wizard de alta, pero el gym post-alta no tiene guía interna.

**CRÍTICO — C2: Sin onboarding de MercadoPago para el gym**
Conectar MP requiere obtener access token y public key de la consola de desarrolladores de MP. Para un gym del interior esto es una barrera altísima. No hay documentación en el panel, no hay link a la guía de MP, no hay video, no hay nada. Este punto puede bloquear la activación completamente. La feature de pago es el core y el gym no puede usarla si no pasa este paso.

**CRÍTICO — C3: No hay manejo visible de fallos de pago del alumno**
¿Qué pasa cuando el link de pago falla (tarjeta rechazada, MP caído)? ¿El alumno recibe un mensaje claro? ¿El gym recibe una notificación? En un gym del interior, el alumno va a llamar al dueño por WhatsApp. Si el dueño no sabe qué pasó, pierde confianza en el sistema. Este flujo de error no está listado entre las funcionalidades implementadas.

**CRÍTICO — C4: No hay prueba gratuita / período trial**
El precio en USD con tipo de cambio flotante convierte a ARS de forma diferente cada día. El primer gym pagador necesita ver el valor antes de poner la tarjeta. Sin trial, la fricción de venta es enorme contra competidores como About a Gym que el gym ya conoce de nombre. Una demo con datos propios del gym vale más que cualquier pitch.

**MEDIO — M1: Pricing en USD con riesgo de percepción en el interior**
USD 28/mes al tipo de cambio actual puede parecer razonable o caro dependiendo del contexto. El problema no es el precio sino la incertidumbre: el gym no sabe cuánto va a pagar el mes que viene. About a Gym cobra ARS fijo, lo que es predecible. Para el primer gym pagador, la imprevisibilidad del tipo de cambio es una objeción de venta concreta. No es bloqueante si se comunica bien ("menos de 2 cuotas de alumno por mes") pero requiere un mensaje claro en la landing/panel.

**MEDIO — M2: Falta comunicación en el panel del ROI generado**
El dashboard muestra caja del mes y cuotas pendientes, pero no el dato que justifica la suscripción: "Cuántas cuotas cobré de forma automática sin intervención". Si el gym no ve ese número, no entiende por qué paga. Un simple contador "Cobros automáticos este mes: 47 / $940.000 ARS" es la diferencia entre renovar y no renovar.

**MEDIO — M3: El label "Pagar todo" desde el panel del gym es ambiguo**
¿Quién paga? Si el gym no entiende que es él cobrando a un alumno (no él pagando), puede generar desconfianza o confusión. Necesita un label inequívoco tipo "Cobrar todo a [Nombre Alumno]" o "Generar cobro completo".

**MEDIO — M4: Sin exportación del listado de alumnos y cuotas**
Los gyms del interior llevan una planilla Excel de control. La exportación de pagos existe en la sección Pagos, pero si no hay exportación del listado de alumnos con estado de cuota, el gym siente que perdió control. No es glamorosa pero es la feature que genera confianza.

**MEDIO — M5: Experiencia móvil no validada**
El dueño del gym chequea deudores desde el celular mientras da clases. Si el panel no es 100% usable en móvil Android (mercado mayoritario interior), el uso cae drásticamente después de la primera semana.

**SUGERENCIA — S1: Dos niveles de recargo — complejidad innecesaria para el MVP**
Para el primer gym pagador, un recargo simple (porcentaje fijo después de N días) es suficiente. La complejidad puede hacer que el gym no active los recargos, perdiendo una feature que es parte del pitch.

**SUGERENCIA — S2: Recargo por actividad independiente — edge case no prioritario**
Un gym de 50-300 alumnos en Resistencia tiene 2-4 actividades. El recargo por actividad es un edge case que agrega configuración sin resolver un problema real del target del MVP.

**SUGERENCIA — S3: Comunicar el email consolidado como diferenciador**
Esta feature es real y buena: un solo email con tabla de cuotas y "Pagar todo". El gym debe saber que existe y que se configura sola. Si no lo sabe, no lo valora y no lo convierte en boca a boca.

**SUGERENCIA — S4: Sin mecanismo de feedback in-app**
Para el primer gym pagador se necesita saber en tiempo real si algo no funciona. Un simple "¿Cómo estuvo tu primera semana?" al día 7 y día 30 puede salvar la retención.

---

### Recomendaciones (ordenadas por prioridad)

1. **[HOY] Resolver C2** — Crear guía de 3 pasos dentro del panel para conectar MercadoPago, con link directo a la consola de MP y capturas. Sin esto el producto no funciona para el 80% del target.

2. **[ANTES DE LAUNCH] Crear checklist de activación en el dashboard (C1)** — "Completá estos 3 pasos: ✓ Conectá MP / ✓ Creá tu primera actividad / ✓ Cargá tu primer alumno". Un banner con progreso en el dashboard es suficiente.

3. **[ANTES DE LAUNCH] Definir flujo de error de pago (C3)** — Qué ve el alumno, qué ve el gym, qué hace el sistema. Aunque sea un mensaje genérico "Hubo un problema con el pago, intentá de nuevo o contactá a tu gym".

4. **[ANTES DE LAUNCH] Agregar contador de cobros automáticos al dashboard (M2)** — "Cobros automáticos este mes: N". Es el ROI visible del producto. Toma horas de desarrollo, vale meses de retención.

5. **[ANTES DE LAUNCH] Clarificar label "Pagar todo" (M3)** — "Cobrar todo a [Nombre Alumno]" o similar.

6. **[SEMANA 1 POST-LAUNCH] Exportación CSV básica de alumnos + estado de cuota (M4)** — Una tabla descargable que reemplaza el Excel actual del gym.

7. **[SEMANA 1 POST-LAUNCH] Validar UX móvil en Android (M5)** — Recorrer el flujo completo desde un celular Android. Identificar y corregir los 2-3 puntos de mayor fricción.

8. **[PROPUESTA] Trial de 30 días gratis (C4)** — No requiere desarrollo: el superadmin puede crear la licencia manualmente. El primer gym pagador debería ser el que terminó el trial y decidió quedarse.

9. **[v1.1] Simplificar recargos a un solo nivel (S1)** — El segundo nivel puede venir cuando un gym lo pida explícitamente.

---

### Impacto en negocio

**Retención (meses 1-3):** Los hallazgos C1 y C2 son los mayores riesgos de churn temprano. Un gym que no puede configurar MP en la primera sesión no vuelve. El checklist de activación y la guía de MP son inversiones de 1-2 días que protegen el 100% de la retención del primer cliente.

**Conversión (lead → primer pago):** Sin trial, la tasa de conversión es baja. En el interior de Argentina, el boca a boca es el canal principal. El primer gym pagador necesita tener una experiencia tan buena que lo cuente. La fricción de onboarding actual puede impedir que ese momento ocurra.

**NPS y boca a boca:** El diferenciador "cobros automáticos sin que el gym haga nada" está implementado técnicamente. El problema es que el gym no lo ve en su dashboard. Si no lo ve, no lo siente, no lo cuenta. El contador de cobros automáticos tiene un impacto directo en el NPS y en la velocidad de crecimiento orgánico en la región.

**Revenue a 6 meses:** Con las observaciones resueltas, el producto tiene lo suficiente para retener a un gym del interior que procese 50-200 cuotas mensuales. El feature set es sólido. La brecha no está en funcionalidades sino en la experiencia de los primeros 60 minutos del gym en la plataforma. Resolviendo C1, C2, C3 y M2, el producto está en condiciones reales de generar un caso de éxito que acelere la venta en el mercado NEA.

**Veredicto ejecutivo:** El motor de cobros está construido y es el correcto para el mercado. El riesgo de lanzamiento no es técnico sino de adopción. Un gym que no configura MP no cobra nada, no ve valor y no renueva. Resolver el onboarding de MP y hacer visible el ROI automático convierte un producto técnicamente listo en un producto comercialmente lanzable.
