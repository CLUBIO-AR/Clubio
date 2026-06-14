# /review — Comando de revisión de código

Ejecuta una revisión completa del área o diff indicado usando todos los agentes disponibles.

## Uso

```
/review                         # Revisa el diff actual (staged + unstaged)
/review [archivo o carpeta]     # Revisa un área específica
/review --area [descripción]    # Revisa una feature o flujo por nombre
/review --security-only         # Solo ejecuta security-reviewer
/review --quick                 # Security + QA únicamente (sin architecture)
```

## Proceso de ejecución

### Paso 1 — Obtener el contexto del proyecto
Buscá el contexto del proyecto en este orden (usar el primero que exista):
1. `.claude/review-profile.md` — perfil de revisión dedicado
2. `AGENTS.md` — si el proyecto usa el sistema de agentes
3. `CLAUDE.md` — contexto general del proyecto

Extraé de ahí: nombre del proyecto, stack, reglas de negocio invariantes,
agente de dominio disponible (si existe) y variables de entorno críticas.

Si no encontrás ninguno, pedile al usuario una descripción breve del proyecto antes de continuar.

### Paso 2 — Obtener el diff o área a revisar
Si no se especificó área:
```bash
git diff HEAD
```
Si el diff está vacío, intentar:
```bash
git diff --staged
```
Si sigue vacío, pedile al usuario qué revisar.

### Paso 3 — Ejecutar security-reviewer
Adoptá la identidad definida en `agents/security-reviewer.md`.
Analizá el diff con foco exclusivo en seguridad.
Usá el contexto del proyecto para aplicar reglas específicas (multi-tenancy, variables críticas, etc.).
Guardá el reporte internamente como SECURITY_REPORT.

### Paso 4 — Ejecutar architecture-reviewer
Adoptá la identidad definida en `agents/architecture-reviewer.md`.
Analizá el diff con foco exclusivo en arquitectura y calidad de código.
Guardá el reporte internamente como ARCH_REPORT.

### Paso 5 — Ejecutar qa-reviewer
Adoptá la identidad definida en `agents/qa-reviewer.md`.
Analizá el diff con foco en casos borde, robustez y cobertura de tests.
Guardá el reporte internamente como QA_REPORT.

### Paso 6 — Ejecutar agente de dominio (si existe)
Si el contexto del proyecto indica un agente de dominio (biz-validator, financial-reviewer, etc.),
buscá ese agente en `.claude/agents/` del proyecto y adoptá esa identidad.
Ejecutá la revisión de dominio y guardá como DOMAIN_REPORT.

Si no hay agente de dominio, salteá este paso.

### Paso 7 — Ejecutar orchestrator
Adoptá la identidad definida en `agents/orchestrator.md`.
Consolidá todos los reportes disponibles. Emití el veredicto final.

### Paso 8 — Guardar el reporte
Guardá el reporte consolidado en:
```
.claude/reports/review-[YYYY-MM-DD]-[HH-MM].md
```
Mostrá el reporte completo al usuario y finalizá con el veredicto en una línea destacada.

## Reglas de comportamiento

- Si encontrás un hallazgo CRÍTICO de seguridad, alertalo inmediatamente sin esperar al orchestrator.
- No omitás pasos aunque el diff sea pequeño. Un cambio de una línea puede tener implicancias en múltiples dimensiones.
- Si el diff es muy grande (+500 líneas), indicalo al usuario y preguntá si prefiere revisar por área.
- Cuando adoptás la identidad de un agente, comportate EXACTAMENTE como ese agente lo indica: su foco, sus restricciones, su formato de output.
- El orchestrator tiene la última palabra. Su veredicto es la decisión final del review.
