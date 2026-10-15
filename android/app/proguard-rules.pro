# Add project specific ProGuard rules here.

# React Native Core Rules
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.proguard.annotations.KeepGettersAndSetters *;
}
-keep class com.facebook.react.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    public *;
}
-keepclassmembers class * extends com.facebook.react.uimanager.ViewManager {
    public *;
}

# App Native Modules & Security Checks
-keep class com.sparkingcitizen.** { *; }

# Google Play Services & Maps
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
-keep class com.google.maps.android.** { *; }

# Nitro Modules
-keep class com.margelo.nitro.** { *; }

# Async Storage & Device Info
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-keep class com.learnium.RNDeviceInfo.** { *; }

# Image Picker & UCrop
-keep class com.camerakit.** { *; }
-keep class com.yalantis.ucrop.** { *; }
-keep class com.imagepicker.** { *; }

# Strip Android debug logging from Release bytecode (CWE-656 compliance)
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}

# R8 Obfuscation & Source file attribute scrambling
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable
