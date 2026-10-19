package com.ronanski.gcreplica

import android.content.Context
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.util.zip.ZipInputStream

/**
 * Where the game's HTML/JS lives.
 *
 * The APK ships a built-in copy under assets/game/. Downloaded patches are unzipped to
 * files/game/<version>/ and win over the built-in copy when their version is newer.
 */
class GameFiles(private val ctx: Context) {
    private val root = File(ctx.filesDir, "game")
    private val prefs = Prefs(ctx)

    /** Directory of the active patch, or null when the built-in assets should be used. */
    fun activePatchDir(): File? {
        val v = prefs.patchVersion
        if (v <= BuildConfig.GAME_VERSION) return null
        val dir = File(root, v.toString())
        return if (File(dir, "index.html").isFile) dir else null
    }

    fun activeVersion(): Int = if (activePatchDir() != null) prefs.patchVersion else BuildConfig.GAME_VERSION

    /** Remove patches that are older than (or equal to) what the APK already contains. */
    fun cleanup() {
        val keep = activePatchDir()
        if (keep == null && prefs.patchVersion != 0) prefs.patchVersion = 0
        root.listFiles()?.forEach { if (it != keep) it.deleteRecursively() }
    }

    /** Unzip a verified patch archive and make it the active version. */
    @Throws(IOException::class)
    fun installPatch(zip: File, version: Int) {
        root.mkdirs()
        val tmp = File(root, "tmp-$version")
        tmp.deleteRecursively()
        tmp.mkdirs()
        val base = tmp.canonicalPath + File.separator
        ZipInputStream(zip.inputStream().buffered()).use { zis ->
            while (true) {
                val e = zis.nextEntry ?: break
                val out = File(tmp, e.name)
                if (!out.canonicalPath.startsWith(base)) throw IOException("Bad zip entry: ${e.name}")
                if (e.isDirectory) out.mkdirs()
                else {
                    out.parentFile?.mkdirs()
                    out.outputStream().use { zis.copyTo(it) }
                }
            }
        }
        if (!File(tmp, "index.html").isFile) {
            tmp.deleteRecursively()
            throw IOException("Patch has no index.html")
        }
        val dest = File(root, version.toString())
        dest.deleteRecursively()
        if (!tmp.renameTo(dest)) throw IOException("Could not activate patch")
        prefs.patchVersion = version
        cleanup()
    }

    /** Serves https://appassets.androidplatform.net/game/... from the patch dir or the APK assets. */
    fun pathHandler(): WebViewAssetLoader.PathHandler {
        val dir = activePatchDir()
        return WebViewAssetLoader.PathHandler { rawPath ->
            val path = rawPath.ifEmpty { "index.html" }
            if (path.contains("..")) return@PathHandler null
            val stream: InputStream? = try {
                if (dir != null) File(dir, path).takeIf { it.isFile }?.inputStream()
                else ctx.assets.open("game/$path")
            } catch (e: IOException) {
                null
            }
            if (stream == null) WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), "".byteInputStream())
            else WebResourceResponse(mimeOf(path), null, stream)
        }
    }

    private fun mimeOf(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
        "html", "htm" -> "text/html"
        "js", "mjs" -> "text/javascript"
        "css" -> "text/css"
        "json" -> "application/json"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "webp" -> "image/webp"
        "gif" -> "image/gif"
        "svg" -> "image/svg+xml"
        "ogg" -> "audio/ogg"
        "mp3" -> "audio/mpeg"
        "wav" -> "audio/wav"
        "woff2" -> "font/woff2"
        "ttf" -> "font/ttf"
        else -> "application/octet-stream"
    }
}

class Prefs(ctx: Context) {
    private val sp = ctx.getSharedPreferences("gcr", Context.MODE_PRIVATE)

    var channel: String
        get() = sp.getString("channel", null) ?: BuildConfig.DEFAULT_CHANNEL
        set(v) = sp.edit().putString("channel", v).apply()

    var autoPatch: Boolean
        get() = sp.getBoolean("autoPatch", false)
        set(v) = sp.edit().putBoolean("autoPatch", v).apply()

    var patchVersion: Int
        get() = sp.getInt("patchVersion", 0)
        set(v) = sp.edit().putInt("patchVersion", v).apply()

    var lastCheck: Long
        get() = sp.getLong("lastCheck", 0)
        set(v) = sp.edit().putLong("lastCheck", v).apply()
}
