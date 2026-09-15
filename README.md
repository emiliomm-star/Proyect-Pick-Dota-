# Dota 2 Draft Recommender

App multiplataforma (**web + iOS + Android**, un solo código con **Expo**) que recomienda
**picks de héroes** y muestra **builds de items por fase**, usando datos de la API pública de
**[OpenDota](https://docs.opendota.com/)**.

Todo lo que se muestra proviene de datos reales de OpenDota — **sin narrativa de
"estrategia" inventada**. El motor es transparente: cada recomendación enseña de qué
números sale.

## Qué hace (MVP)

- **Tablero de draft**: 5 slots para tu equipo, 5 para el enemigo y baneos.
- **Recomendación de héroes** ordenada por una ventaja combinada de tres señales reales:
  - **Meta** — win rate del héroe en el bracket elegido (`/heroStats`).
  - **Counter** — qué tan bien enfrenta al equipo enemigo (`/heroes/{id}/matchups`).
  - **Rol faltante** — cubre roles core que a tu equipo le faltan (roles de `/heroStats`).
- **Ficha de héroe**: win rate por bracket, **build de items por fase** (inicio / temprano /
  medio / tardío, de `/heroes/{id}/itemPopularity`) y tabla de matchups (fuerte/débil contra).
- **Ajustes**: pesos configurables de cada señal.

## Diferenciadores vs Dota Plus

- **Análisis de composición**: perfil del equipo (mezcla de daño, lockdown, iniciación,
  teamfight, waveclear, save), avisos de huecos y amenaza enemiga. *(Requiere expandir la
  tabla `src/data/heroAttributes.ts` a todos los héroes; hoy ~10 curados, resto neutro.)*
- **Matriz de counters transparente** (`/counters`): ranking de quién contrarresta a la
  línea enemiga con el desglose por rival (Dota Plus es una caja negra).
- **Planificador de baneos** (`/bans`): meta + amenaza a tu equipo + ban rate pro.
- **Simulador de batalla de pickeos** (`/simulator`): estima la probabilidad de victoria
  de draft A vs draft B (hot-seat), sin reproducir la partida, combinando 5 señales:
  matchups, meta, composición, **timing (curva de poder early/mid/late)** y **sinergia entre
  aliados** (combos entre héroes *distintos*: cadenas de control, save para un core expuesto,
  no depender de un solo héroe para pelear — ver `src/engine/synergy.ts`). Los coeficientes
  se calibran con resultados de partidas pro (`scripts/calibrate.ts`, `assets/weights.json`);
  el de timing arranca en 0 (inerte, dirección aprendida de los datos) y el de sinergia en 1
  (prior leve: más sinergia es objetivamente más robustez).
- **Informe educativo**: al cerrar una batalla explica *por qué* ganó un draft, fortalezas y
  debilidades de cada uno, y una idea de mejora (swap que sube la probabilidad del ganador).
- **Arena de capitanes local** (`/arena`): draft por turnos estilo Captains Mode (pass-and-play,
  2 capitanes en un dispositivo) que termina en el veredicto + informe.
- **Arena de capitanes online** (`/arena-online`): salas por internet con turnos en tiempo real
  vía Supabase. Requiere configurar el proyecto (ver más abajo); sin configurar, la app avisa y
  el resto sigue funcionando.

## Alcance honesto (qué da y qué NO da OpenDota)

| Pedido original | Estado | Fuente |
| --- | --- | --- |
| Recomendar picks según ambos equipos | ✅ Directo | `matchups` + `heroStats` |
| Items con los que iniciar la partida | ✅ Datos reales | `itemPopularity.start` |
| Items a craftear durante la partida | ✅ Datos reales | `itemPopularity.early/mid/late` |
| Meta de profesionales | ✅ Agregado | `heroStats.pro_*` |
| Items "para first blood" / "para runas" | ⚠️ No existe como dato | se muestran los items de inicio reales, sin etiquetar por propósito |
| Sinergia con héroes aliados (dúos) | ⚠️ No hay endpoint directo | se aproxima con reglas de sinergia por atributos (`synergy.ts`: cadenas de control, save-para-core-expuesto, redundancia de amenazas), no con winrate real de dúos minado de partidas |
| Texto de estrategias | ❌ No existe en la API | se decidió **no** inventar prosa; solo datos |

## Arquitectura

```
Precálculo (fuera de la app)        App cliente (Expo)
─────────────────────────────       ─────────────────────────────
scripts/build-dataset.ts    ──►     assets/dataset.json  ──►  src/engine (TS puro)
(OpenDota, 1×/día en CI)            (bundle compacto)          recommendHeroes / itemBuildFor
                                                                      │
                                                               app/ (expo-router)
```

El cliente **no** llama a OpenDota en tiempo real (evita el rate-limit de ~60 req/min y las
~124 llamadas necesarias para la matriz de counters). En su lugar consume un `dataset.json`
precalculado por GitHub Actions (cron diario) o de forma local.

### Estructura

```
app/                     Rutas (expo-router): index (Draft), hero/[id], settings
src/
  data/types.ts          Tipos del dataset
  data/dataset.ts        Carga del dataset bundled + helpers
  engine/recommend.ts    Motor de recomendación (puro, testeable)
  engine/itemBuild.ts    Resolución de builds por fase
  engine/*.test.ts       Tests con Vitest
  store/draftStore.ts    Estado del draft (Zustand)
  components/            HeroImage, DraftColumn, HeroPicker, RecommendationCard, ItemBuild, MatchupTable
  theme.ts               Tokens visuales
scripts/
  build-dataset.ts        Pipeline real de OpenDota
  build-sample-dataset.ts Dataset de muestra (offline)
assets/dataset.json       Dataset consumido por la app
.github/workflows/        CI (test) + build-dataset (cron)
```

## Puesta en marcha

```bash
npm install

# 1) Generar el dataset
npm run build:dataset          # datos REALES de OpenDota (requiere acceso a api.opendota.com)
npm run build:dataset:sample   # dataset de MUESTRA para desarrollar offline

# 2) Arrancar la app
npm run web                    # navegador
npm start                      # Expo (elige iOS / Android / web)
```

> ℹ️ `npm run build:dataset` necesita salida a `api.opendota.com`. Algunos entornos
> (sandboxes, ciertas VPN/proxies) lo bloquean; en ese caso usa el dataset de muestra o
> ejecuta el pipeline en GitHub Actions. Define `OPENDOTA_API_KEY` para subir el rate limit.

### Arena online (Supabase, opcional)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, ejecuta `db/schema.sql`.
3. En **Settings → API**, copia la *Project URL* y la *anon key*.
4. Crea un `.env` (ver `.env.example`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. `npm run web`. La pantalla `/arena-online` se activa sola.

> Las políticas RLS del esquema son abiertas (MVP). Antes de un lanzamiento público conviene
> endurecerlas (auth por sala o validación de jugadas en una Edge Function).

## Telegram Mini App (opcional)

La misma web puede abrirse **dentro de Telegram** como Mini App (identidad del usuario
gratis, entrega fiable, fácil de compartir). La integración ya está en el repo
(`app/+html.tsx` carga el SDK, `src/lib/telegram.ts` lo inicializa y lee el usuario, y no
afecta al uso normal en navegador). Pasos para activarla:

1. **Despliega la web** una vez:
   ```bash
   npx expo export --platform web   # genera la carpeta dist/
   ```
   Sube `dist/` a un hosting estático con HTTPS (Vercel, Netlify o Cloudflare Pages, gratis).
   Anota la URL pública (p. ej. `https://tu-app.vercel.app`).
2. **Crea el bot** con [@BotFather](https://t.me/BotFather): `/newbot` → obtén el token.
3. **Registra la Mini App**: en BotFather, `/newapp` (o *Bot Settings → Menu Button*) y pega la
   URL pública del paso 1.
4. Abre el bot en Telegram → botón **Abrir** → tu app corre dentro de Telegram. Si el usuario
   viene de Telegram, verás su nombre en la cabecera del draft.

> No hace falta login: dentro de Telegram, `telegramUser()` devuelve el usuario. Fuera de
> Telegram (navegador normal) la app funciona igual, sin ese dato.

## Cómo se calcula la recomendación

Para cada héroe disponible:

```
score = w_meta   · (winrate_bracket − 0.5)
      + w_counter · promedio(winrate_vs_enemigo − 0.5)
      + w_role    · (roles_faltantes_cubiertos · 0.05)
```

Los win rates se **suavizan** (shrinkage bayesiano hacia 50%) para no sobrevalorar muestras
pequeñas. Pesos por defecto: `meta=1`, `counter=2`, `role=1` (ajustables en Ajustes).

## Tests

```bash
npm test         # Vitest (motor)
npm run typecheck
```

## Roadmap

- **Arena multijugador online** (Supabase): salas por internet, turnos en tiempo real
  (la base local ya está en `/arena`).
- Expandir el overlay curado de `heroAttributes.ts` (hoy ~10 a mano; el resto usa la semilla
  derivada de habilidades) para afinar composición y predictor.
- Sinergia real por dúos (minando partidas / `explorer`).
- Timings de item avanzados (`scenarios/itemTimings`).
- Filtros por parche y persistencia de perfil.
