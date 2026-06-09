# CLUBIO — Funcionalidades implementadas

> Estado al 09/06/2026 — actualizado tras implementación de Features 1.1.1, 1.2.1, 1.2.2, 1.3.1, 1.3.2

---

## APP — Panel del Gym (app.clubio.com.ar)

### Dashboard
- Ver cantidad de alumnos activos
- Ver cuotas vencidas del mes actual
- Ver cuotas pendientes del mes actual
- Ver total cobrado en el mes (resumen de caja)
- Acceso rápido a crear nuevo alumno
- Acceso rápido a ver cuotas

### Alumnos
- Crear alumno con datos completos (nombre, apellido, DNI, email, teléfono, dirección, fecha de alta)
- **Aviso inmediato por email al crear alumno:** si el gym generó una cuota de alta y el alumno tiene email, recibe el aviso con link de pago en el momento (sin esperar el cron diario)
- Editar datos de alumno
- Activar / desactivar alumno
- Eliminar alumno
- Ver perfil detallado: información de contacto, actividades inscritas, historial de cuotas (últimas 6)
- **Ver historial completo de cuotas del alumno:** página dedicada `/alumnos/[id]/cuotas` con paginación (50/cuota), filtros por mes, año y estado, nombre de actividad por cuota, y link de pago generado por demanda
- Buscar alumnos por nombre, apellido, DNI, email
- Filtrar alumnos por estado (activo / inactivo)
- Filtrar alumnos por actividad
- Inscribir alumno a una o más actividades
- Personalizar monto de cuota por actividad para cada alumno
- Desuscribir alumno de una actividad

### Cuotas
- Crear cuota manual para un alumno
- Ver todas las cuotas con filtros por:
  - Mes y año
  - Estado (pagada / pendiente / vencida)
  - Alumno (nombre, apellido, DNI)
  - Actividad
- Ver estadísticas del período: total, pagadas, vencidas, pendientes, monto cobrado
- Ver detalle de cuota: monto base, recargos, total, historial de pagos, notas
- Marcar cuota como pagada (efectivo, transferencia, MercadoPago, otro)
- Registrar pago parcial de cuota
- Condonar cuota con notas
- **Generar link de pago por demanda** para cualquier cuota pendiente/vencida (desde el historial del alumno); el link va a `/pagar/{token}` con JWT firmado de 30 días
- **Pagar todo:** desde el historial del alumno, generar un único link de MercadoPago que engloba todas las cuotas pendientes y vencidas en un solo pago; el webhook marca todas las cuotas como pagadas al confirmar
- Verificar manualmente un pago de MP ingresando el ID de transacción

### Pagos
- Ver historial completo de pagos
- Filtrar por: fecha desde/hasta, método de pago (efectivo, transferencia, MP, otro), actividad, alumno
- Ver estadísticas: total cobrado este mes, cantidad de pagos, total del período seleccionado
- Exportar historial de pagos a CSV (respeta filtros activos, incluye encabezado con metadatos del reporte)

### Suscripción CLUBIO
- Ver estado de la licencia activa: plan, fechas de inicio y vencimiento, días restantes
- Indicador visual de urgencia según proximidad del vencimiento (normal / próxima / crítica / vencida)
- Ver historial de cobros de suscripción con estado, monto, período y fecha de pago
- Botón de pago directo en cobros pendientes (abre el link de MP del cobro)

### Actividades
- Crear actividad (nombre, monto base, color, recargos por mora propios)
- Editar actividad
- Activar / desactivar actividad
- Eliminar actividad
- Configurar recargos de mora específicos por actividad (independientes del global)

### Configuración del Gimnasio
**Datos básicos**
- Editar nombre, email de contacto, teléfono, dirección

**Branding**
- Subir / cambiar logo del gimnasio
- Elegir color de acento para emails (se aplica en notificaciones a alumnos)

**Cuotas**
- Configurar monto base por defecto
- Configurar día de vencimiento mensual
- Configurar días de gracia antes de marcar como vencida
- Activar / desactivar generación automática de cuota al dar de alta un alumno
- Configurar cuota de alta proporcional o completa
- Configurar días mínimos para generar cuota de alta

**Recargos por mora**
- Configurar recargo 1: días después del vencimiento + porcentaje
- Configurar recargo 2 (opcional): días después del vencimiento + porcentaje

**Notificaciones por email**
- Activar / desactivar envíos automáticos
- Configurar días de aviso antes del vencimiento (múltiples)
- Configurar días de aviso después del vencimiento
- Configurar máximo de avisos post-vencimiento
- Personalizar nombre y email del remitente
- Editar plantilla de aviso de vencimiento (subject + body)
- Editar plantilla de recordatorio de vencido (subject + body)

**Mercado Pago**
- Ingresar / actualizar access token propio
- Ingresar / actualizar public key

### Sucursales
- Ver sucursales del gimnasio
- Ver cuál es la sucursal principal

### Monitoreo interno (owner / admin)
- Ver estado de tareas automáticas (crons) con filtros por tipo, fecha, errores, gym
- Ver historial de emails enviados por la plataforma con filtros
- Ejecutar crons manualmente desde el panel

---

## ADMIN — Panel Super Admin (admin dentro del mismo deploy)

### Dashboard
- KPIs globales: gyms activos, licencias en trial, licencias que vencen en 7 días, MRR estimado, alumnos totales, emails enviados hoy, pagos procesados hoy, leads nuevos
- KPIs de facturación: cobrado en suscripciones este mes (ARS), tasa de conversión de cobros del mes (%)
- Alertas: licencias por vencer (≤ 7 días), gyms sin MP configurado, crons con errores en las últimas 24 hs, leads sin contactar (+48 hs)

### Gyms
- Crear nuevo gym con wizard completo:
  - Datos del gym (nombre, email, teléfono, dirección)
  - Datos del owner (nombre, email)
  - Plan (Basic / Plus / Multi)
  - Meses de licencia + precio acordado en USD
  - Monto de cuota defecto y día de vencimiento
  - Días de aviso, recargos
  - Vinculación opcional a un lead existente
- Ver lista de gyms con búsqueda (nombre / email), filtro por plan y filtro por estado
- Ver detalle de gym: datos generales, licencia activa, usuarios, sucursales, estadísticas (alumnos activos, cobrado este mes), últimos 5 cobros de suscripción
- Suspender / reactivar gym (invalida cache de sesión de todos los usuarios inmediatamente)
- Cambiar plan de licencia con motivo opcional (se loguea en audit trail y notifica al gym por email)
- Renovar licencia manualmente: agregar meses, actualizar precio (0 = sin costo), campo de motivo para trazabilidad
- Crear usuario para el gym con credenciales generadas automáticamente
- Activar / desactivar usuario de gym (invalida cache de sesión)
- Cambiar rol de usuario (owner / admin / recepción)
- Ver historial completo de cobros de suscripción del gym con un click ("Ver todos")

### Licencias
- Ver todas las licencias con búsqueda por gym, filtro por plan y filtro por estado (vigente / por vencer / vencida)
- Ver fechas de inicio, vencimiento, precio pagado y si es trial

### Leads
- Ver lista de leads con estadísticas: nuevos, en proceso, convertidos, tasa de conversión, sin contactar +48 hs
- Filtrar por estado, cantidad de alumnos esperada, búsqueda por nombre / email / gym
- Ver detalle: nombre, email, teléfono, gym, alumnos, cómo nos conoció, notas, estado
- Cambiar estado del lead (nuevo → contactado → demo agendada → convertido / perdido)
- Agregar notas internas al lead
- Crear gym directamente desde el lead (datos pre-rellenados)

### Suscripciones (cobros a gyms)
- Ver tabla de cobros de suscripción con filtros por estado y por gym
- Ver período, plan, monto USD, monto ARS, tipo de cambio, estado, fecha de envío, fecha de pago
- Ver historial completo de cobros filtrado por gym individual (con back link al detalle del gym)
- Generar cobro manualmente para un gym (crea preferencia en MP, envía link por email)
- Reenviar link de pago (regenera preferencia si venció, actualiza fecha de envío)
- Cancelar cobro pendiente

### Super Admins
- Ver lista de usuarios super admin
- Crear nuevo super admin
- Activar / desactivar super admin

### Configuración global
- Email de notificaciones para alertas
- Tipo de cambio USD → ARS
- Días de anticipación para generar cobros de suscripción
- Precios de planes Basic / Plus / Multi
- Moneda de suscripción (USD o ARS)
- Token de Mercado Pago de CLUBIO (para cobrar suscripciones) — configurable desde el panel, nunca hardcodeado

### Logs y monitoreo
- **Crons:** ver ejecuciones de todas las tareas automáticas con filtros por tipo, alcance (dispatcher / worker), con errores, gym y fecha; ver detalle (items creados, errores, duración, mensaje de error)
- **Emails:** ver todos los emails enviados por la plataforma con filtros por tipo, estado, gym, destinatario y fecha; ver subject y preview
- **Pagos:** ver todos los pagos procesados con filtros por método, gym y fecha; estadísticas de hoy / semana / mes; desglose por método
- **Audit Trail:** ver historial completo de acciones realizadas por superadmins (suspensiones, cambios de plan, renovaciones, cobros generados, etc.) con filtros por acción, gym y admin; ver detalle JSON expandible por fila

---

## LANDING (clubio.com.ar)

### Navbar
- Logo CLUBIO
- Links de navegación internos
- Link de acceso al app
- CTA "Solicitar demo"

### Hero
- Headline y bajada del producto
- CTA principal hacia el formulario de demo

### Sección "El Problema"
- Problemas típicos de gyms que no usan software

### Sección "Cómo funciona"
- Explicación paso a paso del producto con visuals

### Sección "Diferenciadores"
- Características principales y ventajas frente a competidores

### Planes
- Tabla de planes (Basic / Plus / Multi) con características y precios
- CTAs por plan

### Formulario de Demo
- Campos: nombre, email, teléfono, nombre del gym, cantidad de alumnos estimada, cómo nos conoció
- Validación de campos
- Envío a API de leads (POST /api/leads)
- Mensaje de confirmación al enviar

### Footer
- Links útiles, redes sociales, contacto, copyright

---

## Automatizaciones

### Crons diarios

| Cron | Horario | Qué hace |
|---|---|---|
| `generar-cuotas` | 8 AM UTC, día 1 de cada mes | Genera cuotas mensuales para todos los alumnos activos de cada gym con licencia activa |
| `enviar-avisos` | 9 AM UTC, todos los días | Envía emails de aviso de vencimiento y recordatorio de cuotas vencidas según configuración de cada gym. Si un alumno tiene múltiples cuotas pendientes, recibe UN solo email consolidado con links individuales por cuota y un botón "Pagar todo" |
| `aplicar-recargos` | 0:01 AM UTC, todos los días | Aplica recargos por mora a cuotas vencidas según la configuración de cada gym |
| `verificar-suscripciones` | 7 AM UTC, todos los días | Verifica estado de licencias; suspende gyms con licencia vencida e invalida su cache de sesión |
| `generar-cobros-suscripcion` | 9 AM UTC, todos los días | Genera cobros de suscripción y envía links de pago a gyms cuya licencia vence en N días |

| `vencer-cobros-suscripcion` | 10 AM UTC, todos los días | Marca como "vencido" los cobros pendientes cuyo período ya pasó |
| `avisos-suscripcion` | 8:30 AM UTC, todos los días | Envía emails informativos al gym cuando su licencia vence en 30, 14, 7 o 3 días (sin link de pago, solo aviso) |

### Webhooks

| Webhook | Qué hace |
|---|---|
| `/api/webhooks/mercadopago` | Recibe notificación de pago de cuota de alumno → marca cuota como pagada, registra en historial de pagos y deduplica. También maneja pagos de lote (`external_reference: lote-{id}`) → marca todas las cuotas del lote como pagadas |
| `/api/webhooks/mp-suscripciones` | Recibe notificación de pago de suscripción CLUBIO → marca cobro como pagado, renueva licencia en cascada (+1 mes por cada cobro pagado pendiente de aplicar), reactiva gym si estaba suspendido, invalida cache de sesión de todos los usuarios del gym |
| `/api/mp-redirect` | Landing de resultado de pago MP del alumno; redirige al dashboard con mensaje de éxito o error |
