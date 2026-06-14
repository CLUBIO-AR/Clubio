# Checklist — Seguridad General

Referencia para revisiones de seguridad. Basado en OWASP Top 10 adaptado al stack.

## A01 — Broken Access Control

- [ ] Usuarios solo acceden a sus propios datos (filtro por user_id/gym_id en todas las queries)
- [ ] No existen endpoints que devuelvan recursos por ID sin verificar propiedad
- [ ] Los roles/permisos se verifican server-side (no solo en el frontend)
- [ ] Las rutas de admin están protegidas por middleware (no solo por UI)
- [ ] Cambiar el ID en la URL no permite acceder a datos de otro usuario

## A02 — Cryptographic Failures

- [ ] HTTPS forzado (Vercel lo maneja, pero verificar redirects)
- [ ] Datos sensibles no almacenados en `localStorage` o cookies sin `httpOnly`
- [ ] Passwords nunca almacenados en texto plano (Supabase Auth los hashea)
- [ ] Tokens JWT firmados con secret fuerte y con expiración
- [ ] Datos PII (nombre, email, CUIT, etc.) no expuestos en logs o URLs

## A03 — Injection

- [ ] No existen queries construidas con string concatenation + input del usuario
- [ ] Inputs sanitizados antes de usarse en operaciones de base de datos
- [ ] No existen eval(), Function(), o ejecución dinámica de código con input del usuario
- [ ] Headers y parámetros de URL validados antes de usar

## A05 — Security Misconfiguration

- [ ] Variables de entorno sensibles no commiteadas (`.env` en `.gitignore`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no en variables `NEXT_PUBLIC_*`
- [ ] Headers de seguridad configurados en `next.config.ts` (CSP, X-Frame-Options, etc.)
- [ ] Mensajes de error no revelan información de infraestructura al cliente
- [ ] No existen endpoints de debug activos en producción

## A07 — Identification and Authentication Failures

- [ ] Sesiones invalidan correctamente al hacer logout
- [ ] Tokens de reset de password tienen expiración corta
- [ ] Rate limiting en endpoints de auth (login, reset, signup)
- [ ] No existen credenciales hardcodeadas en el código
- [ ] Los tokens JWT se verifican correctamente: firma, expiración, issuer, audience

## A08 — Software and Data Integrity Failures

- [ ] Webhooks externos validan firma antes de procesar (MercadoPago x-signature, Telegram token, etc.)
- [ ] No existen deserializaciones de datos externos sin validación
- [ ] Las dependencias de npm no tienen vulnerabilidades conocidas críticas

## A09 — Security Logging and Monitoring Failures

- [ ] Los errores se loguean server-side (no se pierden silenciosamente)
- [ ] Los logs NO contienen: passwords, tokens, datos PII, números de tarjeta
- [ ] Los eventos críticos se loguean: login fallido, acceso denegado, pago procesado

## A10 — Server-Side Request Forgery (SSRF)

- [ ] Las URLs externas construidas con input del usuario están validadas
- [ ] No existen endpoints que hagan fetch a URLs arbitrarias del usuario
- [ ] Los redirects post-login validan que la URL destino es del mismo dominio

## Exposición de datos sensibles en frontend

- [ ] No existen datos sensibles en el HTML inicial renderizado innecesariamente
- [ ] Las respuestas de API devuelven solo los campos necesarios (no `SELECT *`)
- [ ] Los errores de Supabase no se propagan directamente al cliente
- [ ] Los console.log con datos sensibles eliminados antes de producción
