# /snapshot — Generar o actualizar mapa de arquitectura

Genera `ARCHITECTURE.md` con el mapa técnico completo del proyecto.
Una vez generado, Claude lo carga automáticamente en cada sesión via CLAUDE.md.

## Uso

```
/snapshot           # Genera o regenera ARCHITECTURE.md completo
/snapshot --update  # Actualiza solo las secciones afectadas por cambios recientes
```

## Proceso de ejecución

### Paso 1 — Determinar modo
Si existe `ARCHITECTURE.md` y se usó `--update`: modo diff (actualización quirúrgica).
Si no existe o se usó sin flags: modo generación completa.

### Paso 2 — Leer contexto base
Leé `AGENTS.md` para entender el negocio, el stack y los flujos críticos.

### Paso 3 — Explorar el codebase
Explorá la estructura con profundidad máxima de 3 niveles.
Leé en este orden:
1. `package.json` — dependencias y scripts
2. `next.config.ts` / `next.config.js` — configuración y headers
3. `middleware.ts` — lógica de auth y routing
4. `lib/` — helpers, servicios y clientes de terceros
5. `app/` — estructura de rutas y layouts principales
6. Cualquier carpeta de dominio relevante (`services/`, `hooks/`, `types/`, etc.)

### Paso 4 — Analizar patrones
Identificá cómo este proyecto resuelve: acceso a datos, autenticación, manejo de errores,
multi-tenancy (si aplica), llamadas a servicios externos.

### Paso 5 — Buscar trabajo en curso
```bash
git log --oneline -10
```
Buscá TODOs y FIXMEs relevantes en archivos de lógica (no en node_modules).

### Paso 6 — Ejecutar snapshot-architect
Adoptá la identidad definida en `.review/agents/snapshot-architect.md`.
Generá el contenido de `ARCHITECTURE.md` con las 4 secciones.

### Paso 7 — Escribir el archivo
Guardá en `ARCHITECTURE.md` en la raíz del proyecto.

### Paso 8 — Actualizar CLAUDE.md
Si `CLAUDE.md` no referencia `ARCHITECTURE.md`, agregá la línea:
```
@ARCHITECTURE.md
```
Esto garantiza que el snapshot se cargue automáticamente en cada sesión.

Confirmá al usuario qué secciones fueron generadas o actualizadas.

## Cuándo usarlo

- Al iniciar trabajo en un proyecto nuevo o desconocido
- Después de una refactorización importante
- Cuando Claude lleva varias sesiones re-explorando los mismos archivos
- Antes de un sprint largo para dejar el contexto fresco
