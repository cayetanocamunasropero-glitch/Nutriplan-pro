package com.cycfitnesslab.nutriplan;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * NutriPlan para Android.
 * Carga assets/index.html, que descarga la app web de producción y la muestra (con copia para usar sin conexión).
 * Lo nativo se limita a lo que la web no puede hacer sola:
 *  - botón atrás → window.npBack() (cierra hojas y vuelve a «Hoy»);
 *  - AndroidBridge.saveFile/share/print (p. ej. «Descargar mis datos»);
 *  - cámara para el escáner de códigos de barras y selector de fotos para el progreso;
 *  - los enlaces externos (WhatsApp, correo, web) se abren fuera de la app.
 */
public class MainActivity extends Activity {
    private static final int REQ_FILE = 1;
    private static final int REQ_CAMERA = 2;
    private static final int REQ_STORAGE = 3;
    private static final String START = "file:///android_asset/index.html";

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingPermission;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xFF17231D);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        // El cargador vive en file:// y pide la app a https:// (el servidor responde con CORS)
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " NutriPlanAndroid/2");

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            // Android 7+ (la plataforma de compilación es la 6, por eso sin @Override)
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openOutside(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openOutside(Uri.parse(url));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                            request.grant(request.getResources());
                        } else {
                            pendingPermission = request;
                            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                        }
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
            }
        });

        web.loadUrl(START);
    }

    /** Solo el cargador local se abre dentro; cualquier otra navegación va al navegador o a su app. */
    private boolean openOutside(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme();
        if (scheme.equals("file") || scheme.equals("about") || scheme.equals("data") || scheme.equals("blob") || scheme.equals("javascript")) return false;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            toast("No hay ninguna app para abrir este enlace");
        }
        return true;
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(function(){try{return !!(window.npBack&&window.npBack())}catch(e){return false}})()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String handled) {
                if (!"true".equals(handled)) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        if (requestCode == REQ_CAMERA && pendingPermission != null) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) pendingPermission.grant(pendingPermission.getResources());
            else pendingPermission.deny();
            pendingPermission = null;
        } else if (requestCode == REQ_STORAGE && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            toast("Permiso concedido. Vuelve a pulsar «Descargar».");
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    private void toast(final String text) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(MainActivity.this, text, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Funciones que la web llama como window.AndroidBridge.* */
    public class Bridge {
        @JavascriptInterface
        public void saveFile(String name, String text, String mime) {
            String safe = (name == null || name.isEmpty() ? "nutriplan.txt" : name).replaceAll("[^A-Za-z0-9._-]", "_");
            String type = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
            try {
                byte[] bytes = (text == null ? "" : text).getBytes("UTF-8");
                if (Build.VERSION.SDK_INT >= 29) {
                    // MediaStore.Downloads (Android 10+), sin permisos
                    ContentValues values = new ContentValues();
                    values.put("_display_name", safe);
                    values.put("mime_type", type);
                    values.put("relative_path", "Download/");
                    Uri uri = getContentResolver().insert(Uri.parse("content://media/external/downloads"), values);
                    if (uri == null) throw new IllegalStateException("sin destino");
                    OutputStream out = getContentResolver().openOutputStream(uri);
                    out.write(bytes);
                    out.close();
                } else {
                    if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                        return;
                    }
                    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    dir.mkdirs();
                    FileOutputStream out = new FileOutputStream(new File(dir, safe));
                    out.write(bytes);
                    out.close();
                }
                toast("Guardado en Descargas: " + safe);
            } catch (Exception e) {
                toast("No se pudo guardar el archivo");
            }
        }

        @JavascriptInterface
        public void share(String text) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, text == null ? "" : text);
            try {
                startActivity(Intent.createChooser(send, "Compartir"));
            } catch (ActivityNotFoundException e) {
                toast("No hay ninguna app para compartir");
            }
        }

        @JavascriptInterface
        public void print() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                    if (pm != null) pm.print("NutriPlan", web.createPrintDocumentAdapter("NutriPlan"), null);
                }
            });
        }
    }
}
