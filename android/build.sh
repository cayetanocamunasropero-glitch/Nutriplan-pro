#!/usr/bin/env bash
# Construye y firma la APK de NutriPlan con las herramientas de Android de Debian/Ubuntu:
#   sudo apt-get install -y aapt apksigner zipalign android-sdk-platform-23 dalvik-exchange default-jdk-headless
# Uso: KEYSTORE=/ruta/nutriplan-release.jks KS_PASS=... ./build.sh [salida.apk]
# La clave de firma NUNCA va al repositorio (es público). Sin la misma clave no se puede actualizar la app instalada.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-build/NutriPlan.apk}"
JAR=/usr/lib/android-sdk/platforms/android-23/android.jar
: "${KEYSTORE:?Falta KEYSTORE (ruta al .jks)}"
: "${KS_PASS:?Falta KS_PASS}"
rm -rf build/obj build/gen build/*.unsigned.apk build/*.aligned.apk
mkdir -p build/obj build/gen
# 1) Recursos y manifiesto (R.java no se usa en el código, pero se genera por si acaso)
aapt package -f -m -J build/gen -M AndroidManifest.xml -S res -I "$JAR"
# 2) Java 8 → DEX
javac --release 8 -nowarn -classpath "$JAR" -d build/obj $(find src build/gen -name '*.java')
dalvik-exchange --dex --min-sdk-version=24 --output=build/classes.dex build/obj
# 3) Empaquetar (manifiesto, recursos, assets y classes.dex)
aapt package -f -M AndroidManifest.xml -S res -A assets -I "$JAR" -F build/app.unsigned.apk
(cd build && aapt add app.unsigned.apk classes.dex >/dev/null)
# 4) Alinear y firmar (v1 + v2 + v3)
zipalign -f -p 4 build/app.unsigned.apk build/app.aligned.apk
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias nutriplan --out "$OUT" build/app.aligned.apk
apksigner verify --verbose "$OUT" | head -6
echo "APK lista: $OUT ($(du -h "$OUT" | cut -f1))"
