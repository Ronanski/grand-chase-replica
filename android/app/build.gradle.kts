import javax.inject.Inject

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Values injected by CI (see .github/workflows/release.yml); local builds get dev defaults.
fun prop(name: String, default: String): String = (project.findProperty(name) as String?) ?: default

val keystorePath: String? = System.getenv("KEYSTORE_FILE")

android {
    namespace = "com.ronanski.gcreplica"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ronanski.gcreplica"
        minSdk = 24
        targetSdk = 35
        versionCode = prop("versionCode", "1").toInt()
        versionName = prop("versionName", "0.1.0-dev")
        buildConfigField("int", "GAME_VERSION", prop("gameVersion", "0"))
        buildConfigField("String", "UPDATE_BASE_URL", "\"${prop("updateBaseUrl", "https://ronanski.github.io/grand-chase-replica/")}\"")
        buildConfigField("String", "DEFAULT_CHANNEL", "\"${prop("channel", "beta")}\"")
    }

    signingConfigs {
        create("release") {
            if (keystorePath != null) {
                storeFile = file(keystorePath)
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (keystorePath != null) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

// Bundle the HTML5 game (../../game) into the APK as assets/game/ (the built-in fallback version).
abstract class CopyGameTask : DefaultTask() {
    @get:InputDirectory
    abstract val src: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val fs: FileSystemOperations

    @TaskAction
    fun run() {
        fs.sync {
            from(src)
            into(outputDir.dir("game"))
        }
    }
}

val copyGame = tasks.register<CopyGameTask>("copyGameAssets") {
    src.set(rootProject.layout.projectDirectory.dir("../game"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(copyGame, CopyGameTask::outputDir)
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
