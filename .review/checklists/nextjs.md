# Checklist — Next.js App Router

Referencia técnica para usar durante revisiones de proyectos Next.js 13+.

## Server Components vs Client Components

- [ ] `"use client"` presente solo donde se necesita: hooks, event handlers, browser APIs
- [ ] Los Server Components no importan módulos que usan `window`, `document` o `localStorage`
- [ ] Los datos se fetchean en Server Components cuando es posible (no via API Route interna)
- [ ] Los Client Components reciben datos como props desde Server Components padre
- [ ] No existen Client Components que hacen fetch a APIs internas innecesariamente

## API Routes y Server Actions

- [ ] Las API Routes existen solo para: webhooks externos, crons, endpoints públicos
- [ ] Las Server Actions tienen validación de autenticación al inicio
- [ ] Las Server Actions validan inputs con Zod antes de operar
- [ ] Las Server Actions no exponen mensajes de error internos al cliente
- [ ] Los API Routes retornan errores genéricos (no stack traces ni mensajes internos)
- [ ] `revalidatePath` o `revalidateTag` usados en Server Actions que modifican datos

## Caché y revalidación

- [ ] `fetch` con `cache: 'no-store'` en datos que deben ser siempre frescos
- [ ] `revalidate` configurado correctamente en pages que usan datos semi-estáticos
- [ ] No existen datos de usuario cacheados entre sesiones diferentes
- [ ] `unstable_noStore()` usado en componentes que no deben cachearse

## Layouts y estructura

- [ ] Los layouts no hacen fetches que puedan bloquear la navegación
- [ ] `loading.tsx` presente en rutas con datos lentos
- [ ] `error.tsx` presente en rutas con operaciones que pueden fallar
- [ ] `not-found.tsx` presente en rutas con recursos por ID
- [ ] Los grupos de rutas `(grupo)` usados correctamente para layouts compartidos

## Performance

- [ ] `next/image` usado para todas las imágenes (con `width`, `height` o `fill`)
- [ ] `next/font` usado para todas las fuentes (no `@import` en CSS)
- [ ] `next/link` usado para navegación interna (no `<a href>`)
- [ ] No existen imports de librerías completas donde solo se usa una función
- [ ] `React.memo`, `useMemo`, `useCallback` usados solo donde el profiler lo justifica
- [ ] No existen re-renders innecesarios por objetos/arrays creados inline como props

## Middleware

- [ ] El middleware protege todas las rutas que requieren autenticación
- [ ] El middleware no realiza operaciones costosas (DB queries, fetch externos)
- [ ] El `matcher` del middleware está correctamente configurado
- [ ] Las rutas públicas están explícitamente excluidas del middleware de auth

## Metadata y SEO (para landings/páginas públicas)

- [ ] `generateMetadata` implementado en páginas públicas
- [ ] `og:image` configurado para páginas importantes
- [ ] `robots.txt` y `sitemap.xml` presentes si el proyecto es público
