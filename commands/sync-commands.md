# /sync-commands — Sincronizar wrappers de comandos

Detecta comandos nuevos en `.review/commands/` que no tienen wrapper en `.claude/commands/`
y los crea automáticamente. Ejecutar después de cada `git subtree pull`.

## Proceso de ejecución

### Paso 1 — Listar comandos disponibles en el framework

```bash
ls .review/commands/
```

### Paso 2 — Comparar con wrappers existentes

Para cada archivo `.md` encontrado en `.review/commands/`, verificá si existe
el wrapper correspondiente en `.claude/commands/`.

### Paso 3 — Crear los wrappers faltantes

Para cada comando sin wrapper, creá `.claude/commands/[nombre].md` con este contenido exacto,
reemplazando `[nombre]` por el nombre del archivo:

```
# /[nombre]

Lee `.review/commands/[nombre].md` y ejecutá sus instrucciones exactamente.

Los agentes están en `.review/agents/`.
Los checklists están en `.review/checklists/`.
El contexto del proyecto está en `AGENTS.md`.
```

Usá herramientas de bash para escribir los archivos directamente.

### Paso 4 — Reportar resultado

Mostrá un resumen:
- Wrappers ya existentes: [lista]
- Wrappers creados ahora: [lista]

Si no faltaba ninguno: "Todos los comandos ya tienen wrapper. Nada que sincronizar."
