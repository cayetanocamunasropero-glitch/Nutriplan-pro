# NutriPlan · Cayetano Camuñas Coach (CYC-FITNESLAB)

App de nutrición coach–cliente. Idioma de la app y de la comunicación con Cayetano: **español**.
El repositorio es **público**: nunca subir PDFs de clientes, datos de salud, claves (`*.pem`) ni `.env`.

## Estructura
- `app/` → **NutriPlan 2** (la app nueva). React 19 + TypeScript + Vite + Tailwind v4 + motion. PWA.
  - `src/lib/` datos y lógica: `supabase.ts` (cliente, OWNER, ORIGIN), `data.ts` (todas las consultas), `nutrition.ts` (macros, Harris-Benedict, objetivos), `foods.ts` (biblioteca de 215 alimentos + Open Food Facts vía `/api/foods`), `pdf/` (lector de PDF por tabla, mismo que la versión clásica).
  - `src/client/` app del cliente: Hoy (anillo kcal, comidas, agua, nota), Mi plan (opciones A/B/C → «Registrar»), Progreso (kcal 14 días, peso, fotos), Yo; código de WhatsApp y cuestionario inicial.
  - `src/coach/` panel del coach: lista con alertas y constancia 7 días, detalle por cliente (Resumen, Diario, Plan + importar PDF, Ficha + cálculo de objetivo, Acceso por WhatsApp).
  - `src/ui/` componentes (kit, Sheet, Toast, Charts, back). `window.npBack()` = botón atrás de la APK.
  - `api/foods.js` (Open Food Facts), `api/clasica.js` + `clasica/` → **la versión clásica intacta en `/clasica`** (editor por gramos, generador, alternativas).
  - `vercel.json`: Vite + funciones, CORS en `/` y `/assets/*` (necesario para la APK).
- `legacy/` → código de la versión clásica tal como estaba (base original, APK, pruebas antiguas). `legacy/NOTAS_VERSION_CLASICA.md` = notas anteriores (deployments, rollback).

## Datos (Supabase `dmztwsrfsydouuiviutc`, coach UUID `9b3479bd-128a-464b-844f-bb49892affec`)
La app nueva usa **las mismas tablas y formatos** que la clásica; ambas pueden convivir.
- `nutriplan_private_store.payload` = {clients, foods, plans, templates, …}: se guarda con *leer → modificar → escribir* (`updateStore`) para no pisar cambios hechos desde la clásica.
- `nutriplan_published_plans.content`: `{groups,target,planType:'alternative-tracker-v1'}` (PDF), `{meals,targets,totals}` (editor clásico) o `{groups:[],target,diaryOnly:true}`. Publicar = PATCH si existe (conserva `client_uid`).
- `nutriplan_meal_logs.entries`: entradas libres `{id,freeEntry:true,meal:'Libre:<id>',mealSlot,letter:'Libre',status,items}`; del plan `{meal:<grupo>,letter,status,items}`; `kind:'activity'` se conserva sin tocar. Items con kcal/c/p/f **por 100 g**.
- `nutriplan_invitations` (hash SHA-256 del código NP-…, 7 días) + RPC `nutriplan_claim_invitation(p_code)`.
- `nutriplan_client_onboarding` / `nutriplan_client_health_private`, `nutriplan_weight_entries`, `nutriplan_progress_photos` + bucket `nutriplan-client-progress-private`.
- No tocar tablas de Atlas Coach (`profiles`, `memberships`, `training_logs`…).

## Comandos (desde `app/`)
- `npm run dev` · `npm run build`
- `npm run test:e2e` → Playwright con Supabase simulado (`tests/mock.mjs`), 20+ comprobaciones de compatibilidad de datos. `PDF=/ruta.pdf` añade la prueba de importación.
- `npm run test:pdf` → lector de PDF sobre `legacy/pdf_pruebas/` (carpeta local, ignorada por git).

## APK
La APK (`legacy/apk/index.html`) descarga la web de producción con `fetch` y la escribe con `document.write` desde `file://`. La app nueva es compatible (probado): sin rutas por URL, `ORIGIN`/`NP_ORIGIN` para llamadas a `/api`, CORS en assets, `window.npBack`. Las mejoras llegan sin reinstalar.

## Despliegue
Vercel team `team_CNO0OyROIW0IYun3Vrwgzak8`, proyecto `prj_8XKbo9Zs5S2h3IhsNrzC3ZZ4VsdF` (nutriplan-asesoria). Publicar en producción **solo con el OK explícito de Cayetano** (la usan clientes reales). Probar antes en una vista previa.

## Preferencias de Cayetano
Trabajo iterativo y dirigido; conservar lo que ya funciona; no confundir apps por nombres parecidos; que los clientes no tengan que reinstalar.
