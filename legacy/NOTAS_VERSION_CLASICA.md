# NutriPlan · Cayetano Camuñas Coach (CYC-FITNESLAB)

App de nutrición coach–cliente. Una sola app web (Vercel + Supabase) y una APK Android que la envuelve.
Idioma de la app y de la comunicación con Cayetano: **español**.

## Estado a 21-11-2026
- **Producción** (`https://nutriplan-asesoria.vercel.app`, deployment `dpl_2tyG5ikFoaRERBQg9TCbSGyTS2f8`): diario sencillo + rueda de kcal + vista coach por días + PWA.
- **Vista previa pendiente de publicar** (`dpl_5PKmuTejEYXWhrHwWDLnJGyzTq8d`): lector de PDF por tabla, catálogo vía `/api/foods`, aspecto Pro + modo oscuro, CORS para la APK. **La APK no funciona hasta publicar esto en producción** (necesita `Access-Control-Allow-Origin` en `/`). Publicar solo con el OK explícito de Cayetano (lo usan sus clientes).
- Para volver atrás: promocionar de nuevo `dpl_2tyG5ikFoaRERBQg9TCbSGyTS2f8` (o el anterior `dpl_3AD9CaF6Vsxh5Pc8YDPSYHz7qTa2`).

## Infraestructura
- Vercel: team `team_CNO0OyROIW0IYun3Vrwgzak8`, proyecto `prj_8XKbo9Zs5S2h3IhsNrzC3ZZ4VsdF` (nutriplan-asesoria). Sin repo Git: se despliega subiendo archivos (`vercel deploy` desde `web/`, o la API).
- Supabase: proyecto `dmztwsrfsydouuiviutc` (eu-west-1). Propietario/coach UUID `9b3479bd-128a-464b-844f-bb49892affec`.
  Tablas que usa esta app: `nutriplan_private_store` (biblioteca y fichas del coach), `nutriplan_published_plans` (plan publicado por cliente; vincula `client_uid`), `nutriplan_meal_logs` (registro diario: `entries` jsonb, `water_ml`, `day_notes`), `nutriplan_invitations`, `nutriplan_client_onboarding`.
  RLS: el cliente solo puede escribir en `nutriplan_meal_logs` si tiene un plan publicado; las invitaciones sin dieta publican un plan `diaryOnly` con `target` calculado de la ficha.
- No tocar las tablas de Atlas Coach (`profiles`, `memberships`, `training_logs`…), son de otra app.

## Cómo está construida la web (`web/`)
- `lib/base.js` + `chunks/*.js`: HTML original de NutriPlan comprimido (Brotli) con los primeros parches (pasos/actividad, rueda antigua). **No editar a mano.** Original editable en `base_original/APP_EDITABLE.html` (+ `reconstruir_nutriplan.cjs`).
- `api/index.js`: sirve el HTML y le aplica parches por **anclas de texto** (lista `ADD`; cada ancla debe aparecer una sola vez). Inyecta, dentro del IIFE principal de la app:
  - `diario/diario.js` + `diario.css`: diario sencillo del cliente (rueda kcal, comidas, buscador, escáner, agua) y vista coach por días (`npdCoachRefresh`). Fuente legible: `diario/diario.src.js` + `diario/foods.txt` (215 alimentos /100 g). Nota: el `diario.js` desplegado tiene "crusán", corregido por una ancla.
  - `diario/extra.js`: lector de PDF por tabla (`npTableParse`, fuente en `diario/pdftable.js`), `npParseFile` elige entre lector clásico y por tabla, `npdCatalogProducts` (biblioteca + `/api/foods`), tema claro/oscuro, `window.npBack` y descargas vía `AndroidBridge`.
  - `diario/pro.css`: aspecto Pro (Bricolage Grotesque + Instrument Sans, verde #1E5B49, modo oscuro con `html[data-theme=dark]`).
- `api/foods.js`: búsqueda Open Food Facts (funciona). `api/product.js` (antiguo, roto) solo existe en Vercel (sha `6c32c224…`, 2760 bytes); se referencia por sha al desplegar.
- `vercel.json`: rewrite `/` → `/api/index`, `includeFiles: diario/**`, cabeceras CORS y del service worker.

## APK (`apk/`)
- Base: la APK NutriPlan Pro de Cayetano (`com.cyc.nutriplan`, minSdk 24, WebView que carga `file:///android_asset/index.html`; abre en el navegador cualquier navegación no `file:`; expone `AndroidBridge.saveFile/share/print`; botón atrás llama a `window.npBack()`).
- `apk/index.html`: carga la web de producción con `fetch`, inyecta `<base>` y `NP_ORIGIN`, la escribe con `document.write` y guarda copia offline. Así las mejoras llegan sin reinstalar.
- `apk/build_apk.py ORIGINAL.apk index.html SALIDA.apk CARPETA_FIRMA`: reempaqueta, alinea y firma con APK Signature Scheme v2 (Python `cryptography`). Verificar con `apksigtool verify`. La clave (`nutriplan-key.pem`) la tiene Cayetano aparte; reutilizarla para futuras versiones (si cambia, hay que desinstalar la app).
- Con herramientas reales (Android SDK, o Expo/EAS) conviene rehacer la APK como proyecto nativo propio.

## Pruebas (`tests/`)
Playwright + Chrome headless con Supabase simulado. Las rutas son absolutas del entorno anterior: ajustarlas.
- `test_app.py`: flujo cliente (añadir alimentos, rueda = 1090 kcal) y coach (días).
- `test_pdf.py`: importa los 10 PDF de `pdf_pruebas/` (deben salir 10/10 "Macros completados"). pdf.js 3.11.174 (`npm pack pdfjs-dist@3.11.174`).
- `test_shell.py`: la APK cargando la web desde `file://`.
- `runparse.js` / `check.js`: lector por tabla en Node, compara kcal calculadas con las del PDF (±6 kcal).

## Pendientes
1. Publicar la vista previa en producción (con OK de Cayetano) y probar la APK en un móvil real.
2. Comida D "wraps a elegir" del PDF vFinal no se importa (tabla de combinaciones): revisión manual.
3. Con Supabase conectado: valorar tabla propia para el diario y revisar RLS/advisors.
4. Con Expo conectado: valorar app nativa (Expo/EAS) para Google Play.

## Preferencias de Cayetano
Trabajo iterativo y dirigido; conservar lo que ya funciona entre versiones; no fusionar ni confundir apps por nombres parecidos; que los clientes no tengan que reinstalar en cada mejora.
