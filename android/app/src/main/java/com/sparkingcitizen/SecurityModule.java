package com.sparkingcitizen;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;

import android.util.Log;

public class SecurityModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public SecurityModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "SecurityModule";
    }

    @ReactMethod
    public void isRooted(Promise promise) {
        try {
            boolean testKeys = checkTestKeys();
            boolean suPaths = checkSuBinaryPaths();
            boolean suExec = checkSuExec();
            boolean rootPkgs = checkRootPackages();
            boolean rooted = testKeys || suPaths || suExec || rootPkgs;
            Log.i("SecurityModule", "🛡️ [RootCheck] testKeys: " + testKeys + ", suPaths: " + suPaths + ", suExec: " + suExec + ", rootPkgs: " + rootPkgs + " => IS_ROOTED: " + rooted);
            promise.resolve(rooted);
        } catch (Exception e) {
            Log.e("SecurityModule", "❌ [RootCheck] Error", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void isEmulator(Promise promise) {
        try {
            boolean emulator = checkEmulator();
            Log.i("SecurityModule", "🛡️ [EmulatorCheck] Model: " + Build.MODEL + ", Product: " + Build.PRODUCT + " => IS_EMULATOR: " + emulator);
            promise.resolve(emulator);
        } catch (Exception e) {
            Log.e("SecurityModule", "❌ [EmulatorCheck] Error", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void getMapsApiKey(Promise promise) {
        try {
            android.content.pm.ApplicationInfo appInfo = reactContext.getPackageManager().getApplicationInfo(
                reactContext.getPackageName(), 
                android.content.pm.PackageManager.GET_META_DATA
            );
            if (appInfo != null && appInfo.metaData != null && appInfo.metaData.containsKey("com.google.android.geo.API_KEY")) {
                String key = appInfo.metaData.getString("com.google.android.geo.API_KEY");
                promise.resolve(key != null ? key : "EMPTY");
            } else {
                promise.resolve("NOT_FOUND_IN_MANIFEST");
            }
        } catch (Exception e) {
            promise.resolve("ERROR: " + e.getMessage());
        }
    }

    /**
     * Native AES-256-GCM Encryption
     * Returns Base64 of (IV 12-bytes + Ciphertext + GCM Tag 16-bytes)
     */
    @ReactMethod
    public void encryptAESGCM(String plainText, String keyHex, Promise promise) {
        try {
            byte[] keyBytes = hexStringToByteArray(keyHex);
            byte[] iv = new byte[12]; // 12-byte IV standard for AES-GCM
            java.security.SecureRandom random = new java.security.SecureRandom();
            random.nextBytes(iv);

            javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
            javax.crypto.spec.GCMParameterSpec spec = new javax.crypto.spec.GCMParameterSpec(128, iv);
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(keyBytes, "AES");
            cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, keySpec, spec);

            byte[] cipherBytes = cipher.doFinal(plainText.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherBytes.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherBytes, 0, combined, iv.length, cipherBytes.length);

            String base64Result = android.util.Base64.encodeToString(combined, android.util.Base64.NO_WRAP);
            promise.resolve(base64Result);
        } catch (Exception e) {
            Log.e("SecurityModule", "❌ [encryptAESGCM] Error", e);
            promise.reject("ENCRYPTION_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Native AES-256-GCM Decryption
     * Expects Base64 of (IV 12-bytes + Ciphertext + GCM Tag 16-bytes)
     */
    @ReactMethod
    public void decryptAESGCM(String cipherTextBase64, String keyHex, Promise promise) {
        try {
            byte[] keyBytes = hexStringToByteArray(keyHex);
            byte[] combined = android.util.Base64.decode(cipherTextBase64, android.util.Base64.NO_WRAP);

            if (combined.length < 12 + 16) {
                promise.reject("DECRYPTION_ERROR", "Invalid ciphertext length");
                return;
            }

            byte[] iv = new byte[12];
            System.arraycopy(combined, 0, iv, 0, 12);

            int cipherLength = combined.length - 12;
            byte[] cipherBytes = new byte[cipherLength];
            System.arraycopy(combined, 12, cipherBytes, 0, cipherLength);

            javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
            javax.crypto.spec.GCMParameterSpec spec = new javax.crypto.spec.GCMParameterSpec(128, iv);
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(keyBytes, "AES");
            cipher.init(javax.crypto.Cipher.DECRYPT_MODE, keySpec, spec);

            byte[] plainBytes = cipher.doFinal(cipherBytes);
            String plainText = new String(plainBytes, java.nio.charset.StandardCharsets.UTF_8);
            promise.resolve(plainText);
        } catch (Exception e) {
            Log.e("SecurityModule", "❌ [decryptAESGCM] Error", e);
            promise.reject("DECRYPTION_ERROR", e.getMessage(), e);
        }
    }

    private static byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                                 + Character.digit(s.charAt(i + 1), 16));
        }
        return data;
    }

    // 1. Check build tags for test-keys
    private boolean checkTestKeys() {
        String buildTags = Build.TAGS;
        return buildTags != null && buildTags.contains("test-keys");
    }

    // 2. Check existence of common su binaries and paths
    private boolean checkSuBinaryPaths() {
        String[] paths = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su",
            "/system/xbin/daemonsu"
        };
        for (String path : paths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        return false;
    }

    // 3. Try to execute 'which su' or 'su'
    private boolean checkSuExec() {
        Process process = null;
        try {
            process = Runtime.getRuntime().exec(new String[]{"which", "su"});
            BufferedReader in = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = in.readLine();
            return line != null && line.trim().length() > 0;
        } catch (Throwable t) {
            return false;
        } finally {
            if (process != null) {
                process.destroy();
            }
        }
    }

    // 4. Check for known root/management packages
    private boolean checkRootPackages() {
        String[] dangerousPackages = {
            "com.topjohnwu.magisk",
            "com.noshufou.android.su",
            "com.thirdparty.superuser",
            "eu.chainfire.supersu",
            "com.koushikdutta.superuser",
            "com.zachspong.temprootremovejb",
            "com.ramdroid.appquarantine",
            "com.formyhm.rshash"
        };
        PackageManager pm = reactContext.getPackageManager();
        for (String pkg : dangerousPackages) {
            try {
                pm.getPackageInfo(pkg, 0);
                return true;
            } catch (PackageManager.NameNotFoundException ignored) {
            }
        }
        return false;
    }

    // Emulator detection (CWE-276 compliance as per AppSealing reference)
    private boolean checkEmulator() {
        boolean buildCheck = (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
            || Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.startsWith("unknown")
            || Build.FINGERPRINT.contains("sdk_gphone")
            || Build.HARDWARE.contains("goldfish")
            || Build.HARDWARE.contains("ranchu")
            || Build.HARDWARE.toLowerCase().contains("nox")
            || Build.HARDWARE.toLowerCase().contains("vbox86")
            || Build.MODEL.contains("google_sdk")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for x86")
            || Build.MANUFACTURER.contains("Genymotion")
            || Build.PRODUCT.contains("sdk_google")
            || Build.PRODUCT.contains("google_sdk")
            || Build.PRODUCT.contains("sdk")
            || Build.PRODUCT.contains("sdk_x86")
            || Build.PRODUCT.contains("sdk_gphone64_arm64")
            || Build.PRODUCT.contains("sdk_gphone64_x86_64")
            || Build.PRODUCT.toLowerCase().contains("nox")
            || Build.PRODUCT.contains("vbox86p")
            || Build.PRODUCT.contains("emulator")
            || Build.PRODUCT.contains("simulator");

        boolean qemuPipes = new File("/dev/socket/qemud").exists() || new File("/dev/qemu_pipe").exists();

        return buildCheck || qemuPipes;
    }
}
