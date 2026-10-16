---
name: auditoria-semanal
description: Auditoría semanal del propio trabajo de Claude Code con Lucas (últimos 7 días). Releva transcripts .jsonl, git log de los repos tocados y CLAUDE.md/skills, analiza fallas y complejidades, propone mejoras sin aplicarlas y guarda el informe en el vault de Obsidian. Usar cuando Lucas pida "auditoría semanal", "auditoría de Claude Code", "/auditoria-semanal" o cuando la dispare la tarea programada de los viernes 18:00.
allowed-tools: Read, Glob, Grep, Write, Bash(git log:*), Bash(git -C:*), Bash(powershell:*), Bash(pwsh:*), Bash(date:*), Bash(ls:*), Bash(dir:*)
---

# Auditoría semanal de Claude Code

Español rioplatense, técnico, crítico. Sin validación, sin relleno.
**Regla dura:** solo evidencia. Si algo no surge de los registros, no se afirma. Cada afirmación lleva su fuente (sesión + fecha, o commit).

## 0. Período y rutas

- Período: últimos 7 días hasta hoy, zona `America/Argentina/Buenos_Aires`. Calcular fecha de hoy (`AAAA-MM-DD`) y fecha de inicio en esa zona antes de empezar.
- Transcripts: `C:\Users\lucho\.claude\projects\**\*.jsonl`
- CLAUDE.md global: `C:\Users\lucho\.claude\CLAUDE.md`
- Skills / commands globales: `C:\Users\lucho\.claude\skills\`, `C:\Users\lucho\.claude\commands\`
- Vault: `C:\Users\lucho\OneDrive\Documentos\Claude\Luc\`
- Salida: `C:\Users\lucho\OneDrive\Documentos\Claude\Luc\Auditorias\AAAA-MM-DD Auditoria Claude Code.md`

## 1. Relevar (SOLO LECTURA)

Prohibido modificar código, CLAUDE.md, skills, settings o cualquier archivo fuera del archivo de salida.

a. **Transcripts** modificados en el período. Para listarlos:
   `powershell -NoProfile -Command "Get-ChildItem 'C:\Users\lucho\.claude\projects' -Recurse -Filter *.jsonl | Where-Object { $_.LastWriteTime -ge (Get-Date).AddDays(-7) } | Select-Object FullName, LastWriteTime, Length"`
   Excluir el transcript de la sesión actual de auditoría.
   Por sesión extraer:
   - proyecto/carpeta (`cwd` de los eventos)
   - objetivo pedido (primer mensaje `user` no sintético)
   - resultado (último mensaje `assistant` + commits/archivos generados)
   - cantidad de idas y vueltas (mensajes `user` humanos)
   - errores de herramientas (`tool_result` con `is_error: true`)
   - correcciones de Lucas: buscar en mensajes `user` patrones `\bno\b`, `eso no`, `otra vez`, `rehac`, `mal`, `no era`, `te dije`, interrupciones (`[Request interrupted`)
   - comandos Bash que fallaron (exit code ≠ 0) y permisos denegados
   - cambios de rumbo (el pedido cambia de alcance a mitad de sesión)
   Si un .jsonl es grande, leerlo por partes o con Grep; no inventar lo que no se leyó.

b. **Repos tocados**: por cada `cwd` distinto que sea repo git:
   `git -C "<cwd>" log --since="7 days ago" --stat`

c. **Contexto**: leer CLAUDE.md global, el CLAUDE.md de cada proyecto tocado, y los skills/commands que aparezcan invocados en los transcripts.

## 2. Analizar

- **Qué hicimos**: por proyecto, resultado concreto y entregable (commit con hash corto, archivo, deploy).
- **Complejidades**: dónde se trabó y por qué (falta de contexto, permisos, entorno, ambigüedad, error de Claude, limitación de herramienta). Ordenar por costo en turnos/tiempo, con el número.
- **Qué me ayudaría (Claude)**: contexto redescubierto en varias sesiones, convenciones no escritas, rutas/comandos/credenciales faltantes (nunca copiar valores de secretos), permisos que frenaron, herramientas o MCP que habrían ahorrado pasos. Cada punto con evidencia (sesión + fecha).
- **Mejoras de planteo**: pedidos ambiguos o sin criterio de "terminado", alcances que cambiaron, tareas a partir o agrupar, cosas pedidas en Code que convenía hacer en la app (o al revés). Incluir al menos un pedido real reescrito como ejemplo.
- **Fallas mías**: error concreto → regla que lo habría evitado.

## 3. Proponer (NO aplicar)

- Cambios a CLAUDE.md (global o por proyecto) como bloque ```diff listo para pegar.
- Skills, commands o hooks nuevos o a ajustar: nombre + propósito en una línea.
- **Máximo 5 propuestas**, priorizadas por impacto.
- Comparar con la auditoría anterior (si existe en `Auditorias\`): marcar propuestas repetidas que siguen sin aplicarse.

## 4. Guardar en Obsidian

1. Si existe `C:\Users\lucho\OneDrive\Documentos\Claude\Luc\_CLAUDE.md`, leerlo y respetar sus reglas (prevalecen sobre el formato de abajo salvo en el contenido obligatorio).
2. Crear la carpeta `Auditorias` si no existe. No tocar ningún otro archivo.
3. Si el archivo del día ya existe, no sobrescribirlo: guardar como `AAAA-MM-DD Auditoria Claude Code (2).md`.

Plantilla:

```markdown
---
tags: [auditoria, claude-code]
fecha: AAAA-MM-DD
periodo: AAAA-MM-DD a AAAA-MM-DD
fuente: claude-code
---

# Auditoría Claude Code — AAAA-MM-DD

## Resumen
(máx. 5 líneas)

## Qué hicimos

## Complejidades

## Qué me ayudaría

## Mejoras de planteo

## Fallas mías

## Propuestas

## Sesiones relevadas
| Fecha | Proyecto | Objetivo | Resultado |
|---|---|---|---|
```

Si no hubo sesiones en el período, guardar igual el archivo con "Sin sesiones en el período" y la lista de rutas revisadas.

## 5. Cierre en el chat

- Primera línea: **la acción a tomar** (la propuesta #1).
- Luego máx. 5 ítems numerados.
- Última línea: ruta completa del archivo guardado.
