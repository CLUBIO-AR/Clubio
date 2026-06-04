<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sistema de Agentes — CLUBIO
> Leer al inicio de cada sesión de trabajo.

## Agentes

| Agente | Archivo | Especialidad |
|---|---|---|
| biz-validator | .claude/agents/biz-validator.md | Negocio, producto, pricing |
| security-arch | .claude/agents/security-arch.md | Seguridad, arquitectura, RLS |
| qa-tester | .claude/agents/qa-tester.md | Tests funcionales y de estrés |
| dev | .claude/agents/dev.md | Implementación y fixes |

## Contexto de negocio (siempre presente)
- Planes: Basic (USD 28) / Plus (USD 45) / Multi (USD 75)
- Plan 'starter' NO EXISTE. Plan 'pro' NO EXISTE.
- Alumnos: ILIMITADOS en todos los planes
- Sin setup fee
- WhatsApp: solo plan Plus y Multi
- El gym conecta su propio número Meta (CLUBIO no paga WA)

## Flujo estándar de una feature

```
1. [BIZ]      Validar que tiene sentido de negocio
2. [DEV]      Implementar en branch feature/*
3. [SECURITY] Revisar si toca auth, pagos, DB o RLS
4. [QA]       Generar tests y verificar edge cases
5. [DEV]      Aplicar fixes
6. [DEV]      Merge a develop → main
```

## Cuándo activar cada agente

| Situación | Agente | Obligatorio |
|---|---|---|
| Nueva feature | biz-validator | Sí |
| Cambio en auth o pagos | security-arch | Sí |
| Cambio en RLS o schema | security-arch | Sí |
| Antes de merge a main | qa-tester | Sí |
| Bug en producción | security-arch + qa-tester | Sí |
| Cambio de pricing/planes | biz-validator | Sí |
| Nuevo endpoint público | security-arch | Sí |

## Reportes

```
.claude/reports/
├── biz-review-[fecha].md
├── security-review-[fecha].md
├── qa-review-[fecha].md
└── consolidated-[fecha].md
```

## Regla de oro
Ningún código llega a main sin pasar por security-arch y qa-tester.
