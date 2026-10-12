# Organizador

App móvil nativa (iOS / Android) de organización personal: **tareas, agenda, notas y hábitos**.
Datos 100 % locales en el dispositivo (SQLite) con backup manual a JSON.

## Stack

| Capa | Elección | Motivo |
|---|---|---|
| Runtime | Expo SDK 57 · React Native 0.86 · React 19 | Un solo código para iOS y Android, builds en la nube con EAS |
| Navegación | Expo Router (rutas por archivo en `src/app/`) | Pestañas + modales sin configuración manual |
| Datos | `expo-sqlite` con migraciones versionadas (`PRAGMA user_version`) | Consultas por fecha e índices; sin backend ni cuentas |
| Backup | `expo-file-system` + `expo-sharing` | Exporta JSON a Drive/mail/Archivos; importa desde el selector de archivos |

## Estructura

```
src/
  app/                    Rutas (cada archivo es una pantalla)
    _layout.tsx           SQLiteProvider + Stack raíz
    (tabs)/               Hoy · Tareas · Agenda · Notas · Hábitos
    tarea/[id].tsx        Editor (id = "nueva" para crear)
    evento/[id].tsx       Editor (id = "nuevo")
    nota/[id].tsx         Editor con autoguardado al salir
    habito/[id].tsx       Editor (id = "nuevo")
    ajustes.tsx           Exportar / importar backup
  db/
    schema.ts             Esquema + migraciones
    repo.ts               Consultas por entidad, cálculo de rachas
    backup.ts             Export / validación / restore transaccional
  components/             UI compartida y tema claro/oscuro
  lib/                    Fechas locales (YYYY-MM-DD) y hook useQuery
tests/db.test.mts         Tests de la capa de datos sobre SQLite real (Node)
```

## Modelo de datos

- **tasks**: título, notas, lista (Casa, Salud…), prioridad 1–3, vencimiento opcional, hecha.
- **events**: fecha, hora inicio/fin opcionales (sin hora = todo el día), lugar, notas.
- **notes**: título, cuerpo, fijada.
- **habits**: nombre, días de la semana como máscara de bits (bit 0 = lunes).
- **habit_logs**: (habit_id, fecha) por cada día cumplido. Borrado en cascada con el hábito.

Las fechas se guardan como `YYYY-MM-DD` en hora local, así el orden de texto coincide con el cronológico.

**Racha de un hábito:** días programados consecutivos cumplidos hacia atrás desde hoy. Si hoy está programado
y todavía no se marcó, no corta la racha. Los días no programados se saltean.

## Desarrollo

```bash
npm install
npx expo start          # abrir con Expo Go o con un development build
npm run typecheck
npm run lint
npm run test:db         # capa de datos contra node:sqlite (Node ≥ 22.5)
```

Para instalar en el teléfono sin tienda: `npx eas-cli@latest build --profile preview --platform android` (genera un APK).

## Cómo agregar un cambio de esquema

Agregar un nuevo string al final de `MIGRATIONS` en `src/db/schema.ts`. Nunca editar una migración publicada.
El restore de backups solo inserta columnas que existen, así que backups viejos siguen siendo importables.

## Próximos pasos posibles

- Notificaciones locales para vencimientos y eventos (`expo-notifications`).
- Tareas recurrentes.
- Selector de fecha/hora nativo.
- Sincronización opcional (por ejemplo, con Google Calendar) si en algún momento se necesita multi-dispositivo.
