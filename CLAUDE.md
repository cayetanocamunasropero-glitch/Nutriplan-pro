# NutriPlan · Cayetano Camuñas Coach (CYC-FITNESLAB)

App de nutrición coach–cliente. Idioma de la app y de la comunicación con Cayetano: **español**.
El repositorio es **público**: nunca subir PDFs de clientes, datos de salud, claves (`*.pem`) ni `.env`.

## Estructura
- `app/` → **NutriPlan 2** (la app nueva). React 19 + TypeScript + Vite + Tailwind v4 + motion. PWA.
  - `src/lib/` datos y lógica: `supabase.ts` (cliente, OWNER, ORIGIN), `data.ts` (todas las consultas), `nutrition.ts` (macros, Harris-Benedict, objetivos), `foods.ts` (biblioteca de 215 alimentos + Open Food Facts vía `/api/foods`), `pdf/` (lector de PDF por tabla, mismo que la versión clásica).
  - `src/client/` app del cliente: Hoy (anillo kcal, comidas, agua, actividad/pasos, nota, ayuda inicial), Mi plan (opciones A/B/C → «Registrar»; combinaciones a elegir como wraps/pizzas, «Cambiar» alimento por sus intercambios, «Tu día con estas opciones», «Notas de tu coach»), Progreso (kcal 14 días, peso, fotos), Yo (privacidad + descarga de datos); código de WhatsApp, consentimiento RGPD al registrarse y cuestionario inicial.
  - `src/lib/plan.ts`: combinaciones (`kit`), intercambios (`choices`) y su formato clásico (`withOriginalFirst`).
  - `src/coach/` panel del coach: lista con alertas y constancia 7 días, detalle por cliente (Resumen, Diario, Plan + importar PDF, Ficha + cálculo de objetivo, Acceso por WhatsApp).
  - `src/ui/` componentes (kit, Sheet, Toast, Charts, back). `window.npBack()` = botón atrás de la APK.
  - `api/foods.js` (Open Food Facts), `api/clasica.js` + `clasica/` → **la versión clásica intacta en `/clasica`** (editor por gramos, generador, alternativas).
  - `vercel.json`: Vite + funciones, CORS en `/` y `/assets/*` (necesario para la APK).
- `legacy/` → código de la versión clásica tal como estaba (base original, APK, pruebas antiguas). `legacy/NOTAS_VERSION_CLASICA.md` = notas anteriores (deployments, rollback).

## Datos (Supabase `dmztwsrfsydouuiviutc`, coach UUID `9b3479bd-128a-464b-844f-bb49892affec`)
La app nueva usa **las mismas tablas y formatos** que la clásica; ambas pueden convivir.
- `nutriplan_private_store.payload` = {clients, foods, plans, templates, …}: se guarda con *leer → modificar → escribir* (`updateStore`) para no pisar cambios hechos desde la clásica.
- `nutriplan_published_plans.content`: `{groups,target,planType:'alternative-tracker-v1'}` (PDF), `{meals,targets,totals}` (editor clásico) o `{groups:[],target,diaryOnly:true}`. Publicar = PATCH si existe (conserva `client_uid`).
  - Extras (la clásica los ignora sin romperse): `option.kit = {base, slots:[{id,label,dependsOn?,at?,choices:[{id,label,items|by}]}]}` (wraps: relleno × queso × salsa; pizzas: queso), y `option.items` guarda la combinación por defecto. `item.choices` = intercambios **empezando por el propio alimento** (convención de la clásica) + `alternativesText`; `item.portion` = nota de ración en texto; `content.coachNotes = [{title, lines}]`.
  - Lector de PDF «menú»: además de opciones, lee la tabla de wraps (despeja con sus totales lo que falte), quesos alternativos, intercambios de hidratos (si el PDF los calcula para otros gramos, los recalcula con los mismos hidratos y lo avisa), variantes «A -> B 65 g» y guía/reglas/día de ejemplo.
- `nutriplan_meal_logs.entries`: entradas libres `{id,freeEntry:true,meal:'Libre:<id>',mealSlot,letter:'Libre',status,items}`; del plan `{meal:<grupo>,letter,status,items}`; `kind:'activity'` se conserva sin tocar. Items con kcal/c/p/f **por 100 g**.
- `nutriplan_invitations` (hash SHA-256 del código NP-…, 7 días) + RPC `nutriplan_claim_invitation(p_code)`.
- `nutriplan_client_onboarding` / `nutriplan_client_health_private`, `nutriplan_weight_entries`, `nutriplan_progress_photos` + bucket `nutriplan-client-progress-private`.
- No tocar tablas de Atlas Coach (`profiles`, `memberships`, `training_logs`…).

## Comandos (desde `app/`)
- `npm run dev` · `npm run build`
- `npm run test:e2e` → Playwright con Supabase simulado (`tests/mock.mjs`), 20+ comprobaciones de compatibilidad de datos. `PDF=/ruta.pdf` añade la prueba de importación.
- `npm run test:pdf` → lectores de PDF (tabla y «menú con opciones», `lib/pdf/menu.ts`) sobre `legacy/pdf_pruebas/` (carpeta local, ignorada por git).
- `npm run test:audit` → detector de Impeccable sobre cada pantalla renderizada (contraste, tamaños, títulos…). Objetivo: 0 hallazgos.

## APK
La APK (`legacy/apk/index.html`) descarga la web de producción con `fetch` y la escribe con `document.write` desde `file://`. La app nueva es compatible (probado): sin rutas por URL, `ORIGIN`/`NP_ORIGIN` para llamadas a `/api`, CORS en assets, `window.npBack`. Las mejoras llegan sin reinstalar.

## Despliegue
- **GitHub Pages** (vista previa): `.github/workflows/pages.yml` publica `app/dist` en cada push a `main` o a la rama de trabajo → `https://cayetanocamunasropero-glitch.github.io/Nutriplan-pro/`. Requiere Settings → Pages → Source «GitHub Actions». Sin servidor: el buscador llama directo a Open Food Facts y `/clasica` no existe allí.
- La app usa rutas relativas (`base: './'`), funciona en raíz o en subcarpeta.
Vercel team `team_CNO0OyROIW0IYun3Vrwgzak8`, proyecto `prj_8XKbo9Zs5S2h3IhsNrzC3ZZ4VsdF` (nutriplan-asesoria). Publicar en producción **solo con el OK explícito de Cayetano** (la usan clientes reales). Probar antes en una vista previa.

## Diseño (tokens en `app/src/index.css`; decisión en `.impeccable/surfaces/app-src.md`, producto en `PRODUCT.md`)
- Look «Menú del día + Información nutricional» (elegido por Cayetano, nov 2026): cabeceras y navegación en pizarra (`bg-board`, `text-chalk`, `<BoardHeader>`), contenido en papel claro con tinta (`border-rule`), acento mostaza (`bg-accent`, botón «+»), Barlow Condensed rotulada (`caps`) para títulos/cifras/botones y Barlow para texto. Oscuro = pizarra completa.
- Firma: resumen del día como tabla nutricional (reglas 8/3/1 px), comidas y opciones con línea de puntos (`leader`), Nutri-Score real de Open Food Facts (`<NutriScore>`).
- Texto secundario `muted`/`faint` (≥4,5:1); texto de color con `text-carb-ink`/`text-fat-ink`/`text-go`; `carb`/`prot`/`fat` solo para marcas. Tarjetas: `<Card>` (borde de tinta) o `tone="brand|ink"`, nunca `bg-*` por className.
- Movimiento: `--ease-out`/`--ease-drawer`, solo `transform`/`opacity`, `MotionConfig reducedMotion="user"`; la hoja inferior se cierra arrastrando.
- Acceso: fondo 3D de hojas y comida con Three.js (`ui/FoodScene.tsx`, todo procedural, carga diferida solo en el login). Sin WebGL → menú en tiza (`MenuBackdrop`); con «reducir movimiento» → fotograma fijo; se pausa con la pestaña oculta y baja resolución si el móvil va lento.
- Resets de `input`/`select` en `@layer base` (si no, pisan las clases de tamaño).

## Skills del proyecto (`.claude/skills/`, ver su README)
Para la app (es una app, no una landing):
- Diseño: `impeccable` (auditar/criticar, evita el «AI slop»), `web-design-guidelines`, `ui-ux-pro-max`. Respetar el sistema de diseño actual (ver «Diseño»; macros validados para daltonismo).
- Animación: skills de Emil Kowalski (`review-animations`, `improve-animations`, `emil-design-eng`); respetar `prefers-reduced-motion`.
- Rendimiento React: `vercel-react-best-practices`.
- Para webs comerciales/landing (no la app): `design-taste-frontend`, `scroll-world`, `refero-design`.

## Preferencias de Cayetano
Trabajo iterativo y dirigido; conservar lo que ya funciona; no confundir apps por nombres parecidos; que los clientes no tengan que reinstalar.
