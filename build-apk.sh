#!/bin/bash
set -e

APPLET_DIR="/app/applet"
cd "$APPLET_DIR"

echo "=== 1. Building Web Assets with Vite ==="
npm run build

BUILD_DIR="/tmp/android-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/pl/karty/terenow"
mkdir -p "$BUILD_DIR/res/drawable"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/assets"
mkdir -p "$BUILD_DIR/bin"

echo "=== 2. Copying Web Assets to APK Assets ==="
cp -r "$APPLET_DIR/dist"/* "$BUILD_DIR/assets/"

echo "=== 3. Creating AndroidManifest.xml ==="
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="pl.karty.terenow"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="Karty Terenów"
        android:icon="@drawable/icon"
        android:allowBackup="true"
        android:theme="@android:style/Theme.NoTitleBar"
        android:usesCleartextTraffic="true">
        <activity
            android:name="pl.karty.terenow.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Karty Terenów</string>
</resources>
EOF

# Copy app icon
ICON_PATH=$(find / -name "pwa-192x192.png" 2>/dev/null | head -n 1)
if [ -n "$ICON_PATH" ]; then
    cp "$ICON_PATH" "$BUILD_DIR/res/drawable/icon.png"
fi

echo "=== 4. Creating MainActivity.java ==="
cat << 'EOF' > "$BUILD_DIR/src/pl/karty/terenow/MainActivity.java"
package pl.karty.terenow;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        // Load offline web assets bundled directly inside the APK
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if ((keyCode == KeyEvent.KEYCODE_BACK) && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
EOF

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
DX="/usr/lib/android-sdk/build-tools/debian/dx"

echo "=== 5. Compiling Java sources ==="
javac -source 8 -target 8 \
      -bootclasspath "$ANDROID_JAR" \
      -d "$BUILD_DIR/bin" \
      "$BUILD_DIR/src/pl/karty/terenow/MainActivity.java"

echo "=== 6. Compiling bytecode to classes.dex ==="
"$DX" --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/bin"

echo "=== 7. Packaging resources and assets into APK ==="
aapt package -f \
     -M "$BUILD_DIR/AndroidManifest.xml" \
     -S "$BUILD_DIR/res" \
     -A "$BUILD_DIR/assets" \
     -I "$ANDROID_JAR" \
     -F "$BUILD_DIR/unsigned.apk"

echo "=== 8. Adding classes.dex to APK ==="
cd "$BUILD_DIR/bin"
aapt add "$BUILD_DIR/unsigned.apk" classes.dex
cd "$APPLET_DIR"

echo "=== 9. Signing APK ==="
KEYSTORE="/tmp/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkey -v -keystore "$KEYSTORE" \
            -storepass android -alias androiddebugkey -keypass android \
            -keyalg RSA -keysize 2048 -validity 10000 \
            -dname "CN=KartyTerenow,O=KartyTerenow,C=PL"
fi

jarsigner -sigalg SHA256withRSA -digestalg SHA-256 \
          -keystore "$KEYSTORE" -storepass android \
          "$BUILD_DIR/unsigned.apk" androiddebugkey

echo "=== 10. Aligning APK ==="
zipalign -f -p 4 "$BUILD_DIR/unsigned.apk" "$APPLET_DIR/KartyTerenow.apk"
cp "$APPLET_DIR/KartyTerenow.apk" /public/KartyTerenow.apk 2>/dev/null || true
mkdir -p "$APPLET_DIR/public"
cp "$APPLET_DIR/KartyTerenow.apk" "$APPLET_DIR/public/KartyTerenow.apk" 2>/dev/null || true
cp "$APPLET_DIR/KartyTerenow.apk" /KartyTerenow.apk 2>/dev/null || true

echo "=== APK Built Successfully! ==="
ls -lh "$APPLET_DIR/KartyTerenow.apk"
