# CLUBIO — Manual de Usuario

> Guía completa de funcionalidades para gyms, alumnos y equipo CLUBIO.
>
> Última actualización: 09/06/2026

---

## Tabla de contenidos

1. [Cómo llegar a CLUBIO — Landing](#1-cómo-llegar-a-clubio--landing)
2. [Panel del Gym — app.clubio.com.ar](#2-panel-del-gym--appclubiocomar)
3. [Panel de Superadmin — /admin](#3-panel-de-superadmin--admin)
4. [Automatizaciones](#4-automatizaciones)
5. [Preguntas frecuentes](#5-preguntas-frecuentes)

---

## 1. Cómo llegar a CLUBIO — Landing

**URL:** `clubio.com.ar`

La landing es el punto de entrada para gyms interesados. No requiere login.

### Qué hay en la landing

| Sección | Qué hace |
|---|---|
| Hero | Propuesta de valor principal: "Tus cuotas se cobran solas" |
| El Problema | Explica los problemas típicos de gyms sin software |
| Cómo funciona | Recorrido visual paso a paso del producto |
| Diferenciadores | Qué hace diferente a CLUBIO de la competencia |
| Planes | Tabla comparativa Basic / Multi con precios en USD |
| Formulario de demo | El gym deja sus datos y solicita una demo |

### Formulario de demo

Campos:
- Nombre de contacto _(requerido)_
- Email _(requerido)_
- Teléfono _(requerido)_
- Nombre del gym _(requerido)_
- Cantidad de alumnos estimada _(opcional)_
- Cómo nos conoció _(opcional)_

Al enviar, el formulario crea un **lead** en el panel de superadmin. El equipo CLUBIO
contacta al interesado en las próximas horas.

> El alta como gym **no es automática** — siempre pasa por el equipo de CLUBIO que
> crea la cuenta y envía las credenciales al dueño del gym.

---

## 2. Panel del Gym — app.clubio.com.ar

**URL:** `app.clubio.com.ar`  
**Acceso:** email + contraseña (credenciales generadas por CLUBIO al crear el gym)

### 2.1 Dashboard

Pantalla de inicio con resumen del estado del gym:

- Total de alumnos activos
- Cuotas vencidas del mes actual (cantidad y monto)
- Cuotas pendientes del mes actual (cantidad y monto)
- Total cobrado en el mes (caja del mes)
- Acceso rápido: crear alumno / ver cuotas

---

### 2.2 Alumnos

Lista completa de alumnos del gym con herramientas de gestión.

#### Buscar y filtrar alumnos
- Búsqueda libre por nombre, apellido, DNI o email
- Filtro por estado: activos / inactivos
- Filtro por actividad inscripta

#### Crear alumno
Datos que se pueden cargar al dar de alta un alumno:
- Nombre y apellido _(requeridos)_
- DNI _(requerido, único por gym)_
- Email _(para envío de avisos y links de pago)_
- Teléfono, dirección, fecha de nacimiento _(opcionales)_
- Fecha de alta _(puede ser hasta 90 días atrás)_
- Sucursal _(si el gym tiene más de una)_
- Monto de cuota personalizado _(sobrescribe el monto base del gym)_
- Notas internas

**Al crear el alumno:** si el gym tiene activada la opción "generar cuota al alta"
y el alumno tiene email configurado, **recibe automáticamente un email con el link
de pago** de su primera cuota (sin esperar al cron del día siguiente).

#### Perfil del alumno
Al hacer click en un alumno se ve:
- Datos de contacto (email, teléfono, fecha de alta, notas)
- Últimas 6 cuotas con estado y monto
- Actividades en las que está inscripto
- Formulario de edición de datos

#### Historial completo de cuotas del alumno
Desde el perfil, el botón "Ver todas →" abre `/alumnos/[id]/cuotas`:
- Listado paginado (50 cuotas por página) de todo el historial
- Filtros: mes, año, estado (pendiente / vencida / pagada / condonada)
- Columna de actividad (muestra la actividad si la cuota es por actividad específica)
- Botón **"Link pago"** en cuotas no pagadas → genera un link de MercadoPago válido 30 días
- Botón **"Pagar todo"** cuando hay 2 o más cuotas sin pagar → genera un único link de MP que cubre todas

#### Actividades del alumno
Desde el perfil del alumno:
- Inscribir a una actividad disponible
- Configurar monto personalizado por actividad (si es diferente al monto base de la actividad)
- Desuscribir de una actividad

#### Activar / desactivar / eliminar alumno
- Desactivar: el alumno deja de recibir avisos y no se le generan cuotas mensuales nuevas
- Eliminar: eliminación lógica (no aparece más en la lista, pero no borra datos históricos)

---

### 2.3 Cuotas

Centro de control de las cuotas mensuales del gym.

#### Ver cuotas
Lista de todas las cuotas con filtros combinables:
- Mes y año
- Estado: pagada / pendiente / vencida / condonada
- Alumno (buscar por nombre, apellido o DNI)
- Actividad

Estadísticas del período seleccionado:
- Total de cuotas, cantidad pagadas, pendientes y vencidas
- Monto total cobrado en el período

#### Detalle de una cuota
Al hacer click en una cuota:
- Monto base + recargos aplicados + monto total
- Historial de pagos asociados
- Notas

#### Acciones sobre una cuota
| Acción | Descripción |
|---|---|
| Marcar como pagada | Registro manual: efectivo, transferencia, MercadoPago u otro |
| Pago parcial | Registrar un pago parcial del monto total |
| Condonar | Marcar la cuota como sin cobrar, con campo de notas |
| Editar monto / fecha / notas | Ajustes manuales antes del vencimiento |
| Verificar pago MP | Ingresar un ID de transacción MP para confirmar pago manualmente |

#### Crear cuota manual
Para cuotas fuera del ciclo automático (cobros especiales, cuotas retroactivas, etc.):
- Seleccionar alumno, mes, año y monto

#### Links de pago

**Generar link individual:** desde el historial del alumno → botón "Link pago" → se genera un JWT
válido 30 días → se muestra el link para copiar o abrir directamente en el navegador.

**Pagar todo:** desde el historial del alumno → botón "Pagar todo (N)" →
se crea una preferencia de MercadoPago que incluye todas las cuotas pendientes del alumno →
al pagar, se marcan automáticamente todas las cuotas como pagadas.

---

### 2.4 Pagos

Historial completo de pagos recibidos (MercadoPago, efectivo, transferencia, otros).

#### Filtros disponibles
- Fecha desde / hasta
- Método de pago
- Actividad
- Alumno

#### Estadísticas
- Total cobrado este mes
- Total del período seleccionado
- Cantidad de pagos

#### Exportar a CSV
El botón "Exportar CSV" descarga el historial respetando los filtros activos.
El archivo incluye un encabezado con metadatos del reporte (fecha de generación, filtros aplicados).

---

### 2.5 Suscripción CLUBIO

Estado de la licencia del gym en la plataforma CLUBIO.

- Plan activo (Basic / Multi) con fechas de inicio y vencimiento
- Días restantes con indicador visual:
  - **Verde:** vigente, más de 30 días
  - **Amarillo:** próxima a vencer (≤ 30 días)
  - **Naranja:** crítica (≤ 7 días)
  - **Rojo:** vencida
- Historial de cobros de suscripción: período, monto, estado y fecha de pago
- Botón de pago directo para cobros pendientes (abre el link de MercadoPago)

> Para renovar la licencia o cambiar de plan, contactar al equipo CLUBIO.

---

### 2.6 Actividades

Gestión de clases o tipos de actividad del gym.

- Crear actividad: nombre, monto base, color (para identificación visual), recargos por mora propios
- Editar nombre, monto o color
- Activar / desactivar actividad
- Eliminar actividad
- **Recargos independientes por actividad:** cada actividad puede tener recargos
  diferentes al recargo global del gym

> Las cuotas mensuales se generan **una por actividad** para cada alumno inscripto.
> Si un alumno está en 3 actividades, recibe 3 cuotas por mes.

---

### 2.7 Configuración del Gym

Acceso desde el menú lateral → "Configuración".

#### Datos básicos
- Nombre del gym, email de contacto, teléfono, dirección

#### Branding
- Logo del gym (se muestra en los emails a alumnos)
- Color de acento para emails (el gym puede personalizar el color de los botones y encabezados)

#### Cuotas
| Opción | Descripción |
|---|---|
| Monto base por defecto | Cuánto cobra por mes a alumnos sin actividad inscripta o sin monto personalizado |
| Día de vencimiento | Día del mes en que vencen las cuotas (ej.: 10) |
| Días de gracia | Días adicionales antes de marcar la cuota como "vencida" |
| Generar cuota al alta | Si está activo, al crear un alumno se genera automáticamente su primer cuota |
| Cuota proporcional | Si está activo, la cuota del mes de alta se calcula proporcionalmente a los días restantes |
| Días mínimos para cuota de alta | Si quedan menos de N días en el mes, no se genera cuota de alta (evita cobrar por 2 días) |

#### Recargos por mora
- **Recargo 1:** porcentaje que se aplica X días después del vencimiento
- **Recargo 2 (opcional):** un segundo recargo más alto para deudas más antiguas

#### Notificaciones por email
| Opción | Descripción |
|---|---|
| Activar / desactivar envíos | Habilita o deshabilita todos los emails automáticos |
| Días de aviso previo | Cuántos días antes del vencimiento avisar (pueden ser múltiples, ej.: 7 y 3 días) |
| Días de recordatorio | Cuántos días después del vencimiento enviar recordatorio |
| Máximo de recordatorios | Hasta cuántos avisos enviar por cuota vencida |
| Nombre del remitente | El nombre que verá el alumno como "de parte de" |
| Email del remitente | El email desde el que llegan los avisos (si se configura dominio propio) |
| Plantilla de aviso | Texto del email antes del vencimiento (variables disponibles: `{nombre}`, `{gym}`, `{monto}`, `{mes}`, `{anio}`) |
| Plantilla de recordatorio | Texto del email de deuda vencida |

#### MercadoPago
- Ingresar / actualizar el **Access Token** propio del gym
- Ingresar / actualizar la **Public Key**

> Sin configurar MercadoPago, los alumnos no pueden pagar online. Los links de pago
> no funcionarán hasta que el gym cargue sus credenciales.

---

### 2.8 Actividades

**URL:** `/dashboard/actividades`

Gestión de clases y tipos de actividad del gym.

- Crear actividad: nombre, precio mensual, color (para identificación visual), recargos por mora propios
- Editar nombre, precio o color
- Activar / desactivar actividad
- Eliminar actividad (las cuotas existentes no se ven afectadas)
- **Recargos independientes por actividad:** cada actividad puede tener días y porcentaje de mora distinto al recargo global del gym

> Las cuotas mensuales se generan **una por actividad** para cada alumno inscripto.
> Si un alumno está en 3 actividades, recibe 3 cuotas por mes.

---

### 2.9 Sucursales

- Ver la lista de sucursales activas del gym
- Identificar la sucursal principal

> La creación y configuración de nuevas sucursales se gestiona desde el panel de superadmin.

---

### 2.10 Monitoreo interno (owner / admin)

Acceso desde **Configuración → sección Avanzado**.

#### Crons (`/dashboard/configuracion/crons`)
- Ver historial de ejecuciones de las tareas automáticas
- Ver detalle de cada ejecución: cuántos items procesó, duración, mensaje de error si falló
- **Ejecutar manualmente:** cualquier cron puede dispararse desde el panel sin esperar al horario programado

#### Emails enviados (`/dashboard/configuracion/emails`)
- Historial de todos los emails enviados a alumnos
- Filtros: fecha desde / hasta
- Columnas: alumno, email destino, tipo de aviso, estado (enviado / error)

---

## 3. Panel de Superadmin — /admin

**Acceso:** solo para el equipo de CLUBIO. Misma URL base que la app, ruta `/admin`.

---

### 3.1 Dashboard

Vista ejecutiva del estado del negocio:

**KPIs principales:**
- Gyms activos
- Licencias en trial
- Licencias por vencer en 7 días
- MRR estimado (en USD)
- Total de alumnos en plataforma
- Emails enviados hoy
- Pagos procesados hoy
- Leads nuevos

**KPIs de facturación:**
- Total cobrado en suscripciones este mes (ARS)
- Tasa de conversión de cobros del mes (% de cobros pagados sobre el total generado)

**Alertas activas:**
- Gyms con licencia próxima a vencer (≤ 7 días)
- Gyms sin MercadoPago configurado
- Crons con errores en las últimas 24 hs
- Leads sin contactar por más de 48 horas

---

### 3.2 Gyms

#### Crear nuevo gym (wizard)
Pasos guiados para dar de alta un gym desde cero:
1. Datos del gym (nombre, email, teléfono, dirección)
2. Datos del owner (nombre y email — recibe email con credenciales)
3. Plan (Basic / Multi) + meses de licencia + precio acordado
4. Configuración inicial: monto base, día de vencimiento, días de aviso, recargos
5. Vinculación opcional a un lead existente (para marcar la conversión)

#### Lista de gyms
- Búsqueda por nombre o email
- Filtro por plan y por estado (activo / suspendido / trial)

#### Detalle de un gym
Vista completa del gym:
- Datos generales y licencia activa (plan, fechas, precio)
- Lista de usuarios (con rol)
- Lista de sucursales
- Estadísticas: alumnos activos, cobrado este mes
- Últimos 5 cobros de suscripción + link "Ver todos"

**Acciones disponibles:**
| Acción | Efecto |
|---|---|
| Suspender | Desactiva el gym; todos sus usuarios pierden acceso inmediatamente (cache invalidado) |
| Reactivar | Restaura el acceso; cache invalidado para que los usuarios noten el cambio de inmediato |
| Cambiar plan | Actualiza el plan con motivo opcional; notifica al gym por email; se loguea en el audit trail |
| Renovar licencia | Agrega meses de vigencia con precio acordado (0 = sin costo); campo de motivo opcional |
| Crear usuario | Genera credenciales automáticas y envía email de bienvenida |
| Activar / desactivar usuario | Invalida cache de sesión inmediatamente |
| Cambiar rol de usuario | Owner / admin / recepcionista |

---

### 3.3 Licencias

- Ver todas las licencias con búsqueda por gym
- Filtro por plan y por estado (vigente / por vencer / vencida / trial)
- Columnas: gym, plan, fecha inicio, fecha vencimiento, precio pagado, trial

---

### 3.4 Leads

Pipeline de ventas para gyms interesados.

**Estadísticas del embudo:**
- Leads nuevos, en proceso, convertidos, tasa de conversión, sin contactar +48 hs

**Acciones:**
- Cambiar estado: nuevo → contactado → demo agendada → convertido / perdido
- Agregar notas internas al lead
- **Crear gym directamente desde el lead** (datos pre-rellenados desde el formulario)

---

### 3.5 Suscripciones

Historial de cobros de suscripción a gyms.

**Tabla de cobros:**
- Gym, período, plan, monto USD, monto ARS, tipo de cambio, estado, fecha envío, fecha pago

**Filtros:** estado (pendiente / pagado / vencido / cancelado) y gym específico

**Acciones:**
| Acción | Descripción |
|---|---|
| Generar cobro | Crea una preferencia en MP y envía el link de pago al gym por email |
| Reenviar link | Regenera la preferencia si venció; actualiza fecha de envío |
| Cancelar | Marca el cobro como cancelado |

---

### 3.6 Super Admins

- Ver lista de superadmins con estado
- Crear nuevo superadmin
- Activar / desactivar

---

### 3.7 Configuración Global

Afecta a toda la plataforma:

| Parámetro | Descripción |
|---|---|
| Token MP de CLUBIO | Access token de la cuenta de MP de CLUBIO para cobrar suscripciones |
| Moneda de suscripción | USD o ARS |
| Tipo de cambio USD → ARS | Se usa para calcular el monto en ARS de los cobros |
| Días de anticipación | Con cuántos días de anticipación generar los cobros de suscripción |
| Precios de planes | Precio en USD de Basic y Multi |
| Email de alertas | A qué email llegan las alertas del sistema |

---

### 3.8 Logs y Monitoreo

#### Crons
- Ver ejecuciones de todos los crons de todos los gyms
- Filtros: tipo (dispatcher / worker), gym, con errores, fecha
- Detalle expandible: items creados, saltados, duración, mensaje de error

#### Emails
- Todos los emails enviados por la plataforma (a alumnos y a gyms)
- Filtros: tipo, estado, gym, destinatario, fecha
- Ver subject y preview del contenido

#### Pagos / Webhooks
- Todos los pagos procesados por webhooks de MP
- Estadísticas de hoy / semana / mes
- Desglose por método de pago

#### Audit Trail
- Historial completo de acciones de superadmins
- Acciones registradas: suspensión, reactivación, cambio de plan, renovación de licencia, creación de usuario, cambio de rol, cobros generados/enviados/cancelados
- Filtros: acción, gym, admin
- Click en cualquier fila para ver el detalle JSON de la acción

---

## 4. Automatizaciones

### 4.1 Crons diarios

Los crons son tareas que se ejecutan automáticamente en Vercel, sin intervención manual.
Cada uno puede dispararse manualmente desde el panel si es necesario.

| Cron | Horario (UTC) | Qué hace |
|---|---|---|
| `generar-cuotas` | 8 AM, día 1 de cada mes | Genera las cuotas mensuales para todos los alumnos activos de cada gym con licencia vigente. Si el alumno tiene actividades inscriptas, genera una cuota por actividad. Si no, genera una cuota global. |
| `enviar-avisos` | 9 AM, todos los días | Envía emails de aviso antes del vencimiento y recordatorios de cuotas vencidas, según la configuración de cada gym. Si un alumno tiene múltiples cuotas pendientes, recibe **un solo email consolidado** con la lista de cuotas, sus links individuales y un botón "Pagar todo". |
| `aplicar-recargos` | 00:01 AM, todos los días | Aplica recargos por mora sobre cuotas vencidas, según los porcentajes y días configurados por cada gym. |
| `verificar-suscripciones` | 7 AM, todos los días | Verifica si las licencias de los gyms están vigentes. Suspende automáticamente los gyms con licencia vencida e invalida su acceso de inmediato. |
| `generar-cobros-suscripcion` | 9 AM, todos los días | Genera cobros de suscripción para gyms cuya licencia vence en N días (configurable) y les envía el link de pago por email. |
| `vencer-cobros-suscripcion` | 10 AM, todos los días | Marca como "vencidos" los cobros de suscripción pendientes cuyo período ya pasó. |
| `avisos-suscripcion` | 8:30 AM, todos los días | Envía emails informativos al gym cuando su licencia está por vencer (30, 14, 7 y 3 días antes). Son avisos de alerta, no incluyen link de pago. |

### 4.2 Webhooks de MercadoPago

Los webhooks son notificaciones automáticas que MP envía a CLUBIO cuando ocurre un evento de pago.

| Webhook | Qué hace |
|---|---|
| `/api/webhooks/mercadopago` | Recibe confirmación de pago de cuota de alumno. Verifica el pago directamente con MP (no confía solo en el webhook). Deduplica por ID de transacción. Registra el pago y marca la cuota como "pagada". También maneja pagos de lote (múltiples cuotas de un mismo alumno en un solo pago). |
| `/api/webhooks/mp-suscripciones` | Recibe confirmación de pago de suscripción CLUBIO. Renueva la licencia en cascada (si el gym tenía cobros atrasados sin aplicar, extiende por todos ellos a la vez). Reactiva el gym si estaba suspendido. Invalida la cache de sesión de todos los usuarios del gym para que el cambio sea inmediato. |

---

## 5. Preguntas frecuentes

### ¿Cómo llega el email de pago al alumno?

Hay dos caminos:
1. **Al crear el alumno** — si el gym tiene activada la opción "generar cuota al alta" y el alumno tiene email, recibe el aviso en el momento.
2. **Por el cron diario** — cada día a las 9 AM UTC se envían los avisos según la configuración del gym (días antes del vencimiento y días después).

### ¿Qué pasa si un alumno tiene múltiples cuotas vencidas?

El cron envía **un solo email** con la lista de todas las cuotas pendientes. Cada cuota tiene su link de pago individual. También hay un botón "Pagar todo" que genera un solo cobro de MercadoPago por el total, y al confirmarse marca todas las cuotas como pagadas.

### ¿Cómo funciona el "pagar todo"?

El gym genera el link desde el historial del alumno. El alumno paga una sola vez en MercadoPago por el total de todas las cuotas pendientes. Cuando MP confirma el pago (webhook), CLUBIO marca automáticamente cada cuota como pagada y registra un pago por cada una.

### ¿El gym puede cambiar el monto de una cuota ya generada?

Sí, desde el detalle de la cuota se puede editar el monto base, la fecha de vencimiento y las notas, siempre que la cuota no esté pagada.

### ¿Qué pasa cuando vence la licencia del gym?

El cron `verificar-suscripciones` (7 AM UTC diario) detecta licencias vencidas y suspende el gym automáticamente. Los usuarios del gym pierden acceso de inmediato. El gym recibe un email de aviso a los 30, 14, 7 y 3 días antes del vencimiento para que pague a tiempo.

### ¿Cómo se renueva la suscripción del gym?

De dos formas:
- **Automática (recomendada):** el cron genera un cobro y envía el link de pago. Al pagar, la licencia se extiende automáticamente.
- **Manual:** el superadmin puede renovar la licencia desde el detalle del gym en el panel de admin.

### ¿Cuántos alumnos puede tener un gym?

**Ilimitados en todos los planes** (Basic y Multi). No hay límite de alumnos.

### ¿Qué diferencia hay entre los planes?

| | Basic (USD 28/mes) | Multi (USD 75/mes) |
|---|---|---|
| Alumnos | Ilimitados | Ilimitados |
| Sucursales | 1 | Hasta 5 |
| Administradores | Hasta 3 | Hasta 10 |
| Cobros automáticos | ✓ | ✓ |
| Avisos por email | ✓ | ✓ |
| Branding en emails | ✓ | ✓ |
| Avisos por WhatsApp | — | ✓ |

Sin setup fee. Sin permanencia.

### ¿Existe un plan "starter", "pro" o "plus"?

No. Los únicos planes activos son **Basic** y **Multi**.
