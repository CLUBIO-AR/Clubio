# Demo Data — Iron House

Datos cargados por `supabase/seeds/demo-gym.sql`.
Cubren todos los estados posibles del sistema para realizar pruebas manuales.

---

## Acceso al gym

| Campo | Valor |
|---|---|
| URL | app.clubio.com.ar |
| Email owner | diego@ironhouse.ar |
| Password | IronHouse2026! |
| Gym ID | `00000000-0000-0000-0003-000000000001` |

> El usuario owner debe crearse manualmente en Supabase Auth Dashboard antes del primer acceso.
> Ver instrucciones al final del SQL seed.

---

## Gym

| Campo | Valor |
|---|---|
| Nombre | Iron House |
| Email contacto | hola@ironhouse.ar |
| Dirección | Av. Corrientes 1234, CABA |
| Plan | Plus |
| Licencia vence | 2027-01-01 |
| MercadoPago | Reemplazar token en gym_config |

---

## Configuración del gym

| Parámetro | Valor |
|---|---|
| Monto base | ARS 15.000 |
| Día de vencimiento | 10 de cada mes |
| Días de gracia | 3 |
| Recargo 1 | 10% a los 5 días |
| Recargo 2 | 20% a los 15 días |
| Días de aviso previo | 7 y 3 días antes |
| Recordatorio post-vencimiento | 2 días después, máx 3 |
| Email activo | Sí |
| Cuota al alta | Sí, proporcional, mínimo 10 días |

---

## Actividades

| Nombre | Monto | Color |
|---|---|---|
| Musculación | ARS 15.000 | Verde |
| Crossfit | ARS 18.000 | Amarillo |
| Yoga | ARS 12.000 | Violeta |
| Pilates | ARS 13.500 | Rosa |

---

## Alumnos y escenarios

### 01 — María López `maria.lopez@demo.com`
**Actividades:** Musculación + Yoga  
**Escenario:** alumna al día, historial limpio  
- Mayo Musculación: **pagada** (efectivo)
- Mayo Yoga: **pagada** (transferencia)
- Junio Musculación: **pendiente**
- Junio Yoga: **pendiente**
- *Test: filtros, ver historial, generar link individual*

---

### 02 — Carlos Rodríguez `carlos.rodriguez@demo.com`
**Actividades:** Crossfit  
**Escenario:** pagos históricos via MercadoPago  
- Abril Crossfit: **pagada** (MP `MP-DEMO-0002-APR`)
- Mayo Crossfit: **pagada** (MP `MP-DEMO-0002-MAY`)
- Junio Crossfit: **pendiente**
- *Test: detección de duplicados MP, historial de pagos*

---

### 03 — Ana Martínez `ana.martinez@demo.com`
**Actividades:** Musculación  
**Escenario:** una cuota vencida sin pagar  
- Abril: **pagada** (efectivo)
- Mayo: **VENCIDA** (sin pagar)
- Junio: **pendiente**
- *Test: cron de recordatorios, aplicación de recargo*

---

### 04 — Luis González `luis.gonzalez@demo.com`
**Actividades:** Yoga  
**Escenario:** 3 cuotas sin pagar — test principal de "Pagar todo"  
- Abril: **VENCIDA** ($12.000 + recargo 10% = $13.200, recargo nivel 1)
- Mayo: **VENCIDA** ($12.000 + recargo 10% = $13.200, recargo nivel 1)
- Junio: **pendiente** ($12.000)
- Total a pagar: **ARS 38.400**
- *Test: flujo completo "pagar todo", email consolidado, webhook lote*

---

### 05 — Sofía Pérez `sofia.perez@demo.com`
**Actividades:** Crossfit  
**Monto personalizado:** ARS 12.000 (override sobre monto base de Crossfit)  
**Escenario:** pago parcial  
- Abril: **pagada** ($12.000, efectivo)
- Mayo: **pagada_parcial** (pagó $6.000 de $12.000)
- Junio: **pendiente**
- *Test: estado pagada_parcial, monto personalizado*

---

### 06 — Martín Sánchez _(sin email)_
**Actividades:** Musculación _(inactivo)_  
**Escenario:** alumno dado de baja, solo historial  
- Febrero: **pagada**
- Marzo: **pagada**
- Abril: **pagada**
- *(inactivo desde abril 2026 — no se generan cuotas nuevas)*
- *Test: filtro alumnos inactivos, historial de baja*

---

### 07 — Laura Gómez `laura.gomez@demo.com`
**Actividades:** Pilates + Musculación  
**Escenario:** cuota condonada  
- Mayo Pilates: **pagada** (transferencia)
- Mayo Musculación: **pagada** (efectivo)
- Junio Pilates: **CONDONADA** _(nota: "Beca deportiva — exención mes junio")_
- Junio Musculación: **pendiente**
- *Test: estado condonada, nota en cuota*

---

### 08 — Javier Torres `javier.torres@demo.com`
**Actividades:** Crossfit  
**Escenario:** múltiples cuotas vencidas con recargos nivel 1 y 2  
- Febrero: **pagada**
- Marzo: **VENCIDA** ($18.000 + recargo 20% = $21.600, recargo nivel 2)
- Abril: **VENCIDA** ($18.000 + recargo 20% = $21.600, recargo nivel 2)
- Mayo: **VENCIDA** ($18.000 + recargo 10% = $19.800, recargo nivel 1)
- Junio: **pendiente** ($18.000)
- Total vencido: **ARS 63.000**
- *Test: recargos nivel 1 y 2, múltiples vencidas, email consolidado*

---

### 09 — Valentina Ruiz _(sin email)_
**Actividades:** Yoga  
**Escenario:** alta muy reciente (2026-06-05), sin cuota generada  
- Sin cuotas _(alta hace 4 días, menos que días_minimos_para_cuota_alta=10)_
- *Test: regla días mínimos, alumno sin email*

---

### 10 — Pablo Díaz `pablo.diaz@demo.com`
**Actividades:** Ninguna (cuota global)  
**Escenario:** alumno sin actividad específica  
- Marzo: **pagada** (efectivo)
- Abril: **pagada** (efectivo)
- Mayo: **pagada** (efectivo)
- Junio: **pendiente**
- *Test: cuota global sin actividad, filtros de lista*

---

### 11 — Romina Castro `romina.castro@demo.com`
**Actividades:** Musculación  
**Escenario:** historial completo pagado via MercadoPago  
- Marzo: **pagada** (MP `MP-DEMO-0011-MAR`)
- Abril: **pagada** (MP `MP-DEMO-0011-APR`)
- Mayo: **pagada** (MP `MP-DEMO-0011-MAY`)
- Junio: **pendiente**
- *Test: historial MP, deduplicación de payment_id*

---

### 12 — Diego Herrera _(sin email)_
**Actividades:** Crossfit + Pilates  
**Escenario:** 2 actividades, mayo vencido con recargo nivel 1, sin email  
- Mayo Crossfit: **VENCIDA** ($18.000 + recargo 10% = $19.800)
- Mayo Pilates: **VENCIDA** ($13.500 + recargo 10% = $14.850)
- Junio Crossfit: **pendiente**
- Junio Pilates: **pendiente**
- *Test: múltiples actividades, vencidas sin email (no recibe avisos), recargo nivel 1*

---

## Resumen de estados cubiertos

| Estado | Alumnos que lo tienen |
|---|---|
| `pendiente` | María, Carlos, Ana, Luis, Sofía, Laura, Javier, Pablo, Romina, Diego |
| `vencida` | Ana, Luis, Javier, Diego |
| `pagada` (efectivo) | María, Ana, Martín, Laura, Pablo, Javier |
| `pagada` (transferencia) | María, Laura |
| `pagada` (mercadopago) | Carlos, Romina |
| `pagada_parcial` | Sofía |
| `condonada` | Laura |
| Recargo nivel 1 | Luis, Diego, Javier (mayo) |
| Recargo nivel 2 | Javier (marzo, abril) |
| Sin email | Martín, Valentina, Diego |
| Alumno inactivo | Martín |
| Sin actividad (cuota global) | Pablo |
| Alta reciente sin cuota | Valentina |
| Múltiples actividades | María, Laura, Diego |
| Monto personalizado | Sofía |

---

## Flujos de prueba mapeados a alumnos

| Flujo | Alumno |
|---|---|
| Aviso inmediato al crear alumno | Crear uno nuevo en el panel |
| Email consolidado (múltiples cuotas) | Luis González |
| Pagar todo (desde panel) | Luis González |
| Pagar todo (desde link JWT de email) | Luis González |
| Webhook pago individual | Carlos / Romina (usar sus payment_ids como referencia) |
| Webhook pago lote | Luis González |
| Deduplicación webhook | Reintentar con `MP-DEMO-0002-APR` |
| Recargo nivel 1 | Javier Torres (mayo) |
| Recargo nivel 2 | Javier Torres (marzo/abril) |
| Estado pagada_parcial | Sofía Pérez |
| Estado condonada | Laura Gómez |
| Alumno sin email (silencio) | Martín / Valentina / Diego |
