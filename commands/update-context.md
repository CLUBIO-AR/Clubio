# /update-context — Actualizar contexto del proyecto

Analiza los cambios recientes y actualiza `AGENTS.md` para que refleje el estado actual del sistema.

## Uso

```
/update-context                  # Analiza el último commit
/update-context --last [N]       # Analiza los últimos N commits
/update-context --area [texto]   # Describís vos el cambio a documentar
```

## Proceso de ejecución

### Paso 1 — Leer el contexto actual
Leé `AGENTS.md` completo. Es la fuente de verdad actual del proyecto.

### Paso 2 — Obtener los cambios a analizar

Si no se especificó área:
```bash
git log --oneline -1
git diff HEAD~1 HEAD
```

Si se usó `--last N`:
```bash
git log --oneline -N
git diff HEAD~N HEAD
```

Si se usó `--area [texto]`: usá la descripción del usuario como input directo.

### Paso 3 — Ejecutar context-updater
Adoptá la identidad definida en `.review/agents/context-updater.md`.
Analizá los cambios contra el `AGENTS.md` actual.
Identificá qué está desactualizado, qué falta y qué sobra.

### Paso 4 — Proponer cambios
Mostrá la propuesta de cambios al usuario ANTES de aplicar.
Esperá confirmación explícita.

### Paso 5 — Aplicar
Con confirmación del usuario, editá `AGENTS.md` de forma quirúrgica.
No reescribas el archivo completo — modificá solo lo necesario.

Confirmá al final qué secciones fueron actualizadas.

## Cuándo usarlo

- Después de implementar una nueva feature significativa
- Cuando cambia una regla de negocio (precio, límite, plan)
- Cuando se agrega o elimina un servicio externo
- Cuando un flujo crítico cambia de comportamiento
- Antes de hacer un /review, para asegurarse de que el contexto está fresco
