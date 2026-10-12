plugins {
    id("com.android.application")
}

android {
    namespace = "org.neurolinux.desktop"
    compileSdk = 35
    defaultConfig {
        applicationId = "org.neurolinux.desktop"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes {
        release { isMinifyEnabled = false }
    }
}
