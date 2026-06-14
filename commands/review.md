# /review — Comando de revisión de código

Ejecuta una revisión completa del área o diff indicado usando todos los agentes disponibles.

## Uso

```
/review                         # Revisa cambios sin commitear (staged + unstaged)
/review --last [N]              # Revisa los últimos N commits (ej: --last 5)
/review --full                  # Escaneo completo del codebase (sin diff)
/review [archivo o carpeta]     # Revisa un área específica del código
/review --area [descripción]    # Revisa una feature o flujo por nombre
/review --security-only         # Solo ejecuta security-reviewer
/review --quick                 # Security + QA únicamente (sin architecture)
```

## Paso 1 — Obtener el contexto del proyecto

Buscá el contexto del proyecto en este orden (usar el primero que exista):
1. `AGENTS.md`
2. `CLAUDE.md`

Extraé: nombre del proyecto, stack, reglas de negocio invariantes,
agente de dominio disponible (si existe) y variables de entorno críticas.

Si no encontrás ninguno, pedile al usuario una descripción breve antes de continuar.

## Paso 2 — Determinar el modo y obtener el material a revisar

### Modo por defecto (sin flags)
```bash
git diff HEAD
```
Si está vacío:
```bash
git diff --staged
```
Si sigue vacío, pedile al usuario qué revisar.

### Modo `--last N`
```bash
git log --oneline -N
git diff HEAD~N HEAD
```
Mostrá al usuario el listado de commits incluidos antes de continuar.

### Modo `--full`
No usar git diff. En cambio, explorar el codebase directamente:
1. Leer la estructura de directorios (máximo 3 niveles)
2. Leer archivos críticos: `middleware.ts`, `next.config.ts`, `lib/`, rutas de API en `app/`
3. Buscar patrones de riesgo: queries sin filtro de tenant, secrets en código, endpoints sin auth
4. Indicar al inicio: "Escaneo completo — no basado en diff. Se revisan áreas de riesgo del codebase."

### Modo `[archivo o carpeta]`
Leer directamente los archivos indicados.

### Modo `--area [descripción]`
Identificar los archivos relevantes para esa área y leerlos.

## Paso 3 — Ejecutar security-reviewer

Adoptá la identidad definida en `.review/agents/security-reviewer.md`.
Analizá el material con foco exclusivo en seguridad.
En modo `--full`: revisá RLS, endpoints públicos, secrets y multi-tenancy en todo el codebase.
Guardá el reporte internamente como SECURITY_REPORT.

## Paso 4 — Ejecutar architecture-reviewer

Adoptá la identidad definida en `.review/agents/architecture-reviewer.md`.
Analizá el material con foco exclusivo en arquitectura y calidad de código.
En modo `--full`: revisá separación de responsabilidades, patrones y deuda técnica global.
Guardá el reporte internamente como ARCH_REPORT.

## Paso 5 — Ejecutar qa-reviewer

Adoptá la identidad definida en `.review/agents/qa-reviewer.md`.
Analizá el material con foco en casos borde, robustez y cobertura de tests.
En modo `--full`: identificá flujos críticos sin tests y puntos de falla potenciales.
Guardá el reporte internamente como QA_REPORT.

## Paso 6 — Ejecutar agente de dominio (si existe)

Si el contexto del proyecto indica un agente de dominio, buscalo en `.claude/agents/`
y adoptá esa identidad. Guardá como DOMAIN_REPORT.
Si no hay agente de dominio, salteá este paso.

## Paso 7 — Ejecutar orchestrator

Adoptá la identidad definida en `.review/agents/orchestrator.md`.
Consolidá todos los reportes. Emití el veredicto final.

## Paso 8 — Guardar el reporte

```
.claude/reports/review-[YYYY-MM-DD]-[HH-MM].md
```
Mostrá el reporte completo y finalizá con el veredicto en una línea destacada.

## Reglas de comportamiento

- Si encontrás un hallazgo CRÍTICO de seguridad, alertalo inmediatamente sin esperar al orchestrator.
- En modo `--full` o `--last N` con más de 500 líneas de diff, avisalo y ofrecé revisar por área.
- Cuando adoptás la identidad de un agente, comportate EXACTAMENTE como ese agente lo indica.
- El orchestrator tiene la última palabra. Su veredicto es la decisión final del review.
