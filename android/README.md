# NutriPlan para Android (APK)

APK propia de NutriPlan 2: una WebView que abre `assets/index.html`. Esa pantalla descarga la app web de producción (`https://nutriplan-asesoria.vercel.app`) y la muestra. Por eso **cada mejora de la web llega sin reinstalar**; la APK solo hay que rehacerla para cambiar el nombre, el icono o lo nativo.

- Paquete: `com.cycfitnesslab.nutriplan`. Android 7 o superior (minSdk 24), compilada para Android 14 (targetSdk 34).
- La versión anterior es otra app (`com.cyc.nutriplan`, con otra clave). Pueden convivir; para no tener dos iconos, desinstala la antigua.
- Descarga para clientes: `https://nutriplan-asesoria.vercel.app/NutriPlan.apk` (copia en `app/public/NutriPlan.apk`).

## Qué hace lo nativo (`src/.../MainActivity.java`)
- **Botón atrás:** llama a `window.npBack()`. Si la web no tiene nada que cerrar, sale de la app.
- **`window.AndroidBridge`:**
  - `saveFile(nombre, texto, mime)`: guarda en Descargas (lo usa «Descargar mis datos»);
  - `share(texto)`;
  - `print()`.
- **Cámara del escáner:** se pide permiso al usarla.
- **Selector de archivos:** para las fotos de progreso.
- **Enlaces externos** (WhatsApp, correo, webs): se abren fuera de la app.
- **Sin conexión:** usa la última copia guardada. La primera vez necesita internet.

## Compilar (Linux, sin Android Studio)
```bash
sudo apt-get install -y aapt apksigner zipalign android-sdk-platform-23 dalvik-exchange default-jdk-headless
KEYSTORE=/ruta/nutriplan-release.jks KS_PASS='…' ./build.sh build/NutriPlan.apk
cp build/NutriPlan.apk ../app/public/NutriPlan.apk   # para publicarla en la web
```
- **Al publicar una versión nueva:** sube `android:versionCode` en `AndroidManifest.xml`.
- **La clave de firma (`nutriplan-release.jks`, alias `nutriplan`) y su contraseña:**
  - **nunca van al repositorio**, que es público (`.gitignore` lo impide);
  - las guarda Cayetano;
  - sin la misma clave, una APK nueva no puede actualizar la instalada (habría que desinstalar).
