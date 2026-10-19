package com.ronanski.gcreplica

import android.app.AlertDialog
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlin.concurrent.thread

/**
 * In-app updates, no browser / external links.
 *
 *  - Manifest:  <UPDATE_BASE_URL>/<channel>/manifest.json  (published by GitHub Actions to Pages)
 *  - Game patch: zip of the HTML5 game, downloaded only when the user allows it
 *                (or automatically if they turned on auto-patch), applied on next restart.
 *  - App update: APK downloaded in-app and installed through PackageInstaller.
 */
class Updater(private val act: MainActivity) {
    private val prefs = Prefs(act)
    private val main = Handler(Looper.getMainLooper())
    @Volatile private var busy = false
    private var pendingApk: File? = null
    private var patchReadyVersion = 0

    data class Asset(val url: String, val sha256: String, val size: Long)
    data class Manifest(
        val appCode: Int, val appName: String, val appNotes: String, val apk: Asset?,
        val gameVersion: Int, val minShellApi: Int, val gameNotes: String, val zip: Asset?,
    )

    fun manifestUrl(channel: String = prefs.channel): String =
        BuildConfig.UPDATE_BASE_URL.trimEnd('/') + "/$channel/manifest.json"

    /** @param manual true when the player pressed "Check for updates" (shows "up to date" message). */
    fun check(manual: Boolean) {
        if (busy) { if (manual) act.toast("May update na nagda-download pa…"); return }
        val channel = prefs.channel
        thread(name = "update-check") {
            try {
                val url = manifestUrl(channel)
                val m = parse(httpGet("$url?t=${System.currentTimeMillis()}"), url)
                prefs.lastCheck = System.currentTimeMillis()
                main.post { onManifest(m, manual) }
            } catch (e: Exception) {
                if (manual) main.post { act.toast("Hindi ma-check ang updates: ${e.message ?: "network error"}") }
            }
        }
    }

    fun checkIfStale() {
        if (System.currentTimeMillis() - prefs.lastCheck > 30 * 60 * 1000L) check(false)
    }

    private fun onManifest(m: Manifest, manual: Boolean) {
        if (act.isFinishing) return
        val curGame = act.gameFiles.activeVersion()
        when {
            m.apk != null && m.appCode > BuildConfig.VERSION_CODE -> askAppUpdate(m)
            m.zip != null && m.gameVersion > curGame && m.gameVersion > patchReadyVersion && m.minShellApi <= SHELL_API -> {
                if (prefs.autoPatch) downloadPatch(m) else askPatch(m)
            }
            manual -> {
                val newerButUnsupported = m.gameVersion > curGame && m.minShellApi > SHELL_API
                act.toast(if (newerButUnsupported) "May bagong patch pero kailangan muna ng app update." else "Updated ka na! (${prefs.channel})")
            }
        }
    }

    // ------------------------------------------------------------------ dialogs
    private fun dialog() = AlertDialog.Builder(act, R.style.DialogTheme)

    private fun askPatch(m: Manifest) {
        act.pauseGame()
        dialog()
            .setTitle("Bagong Game Patch #${m.gameVersion}")
            .setMessage(buildString {
                append("May bagong patch para sa ${prefs.channel.uppercase()} channel.\n")
                append("Laki: ${mb(m.zip!!.size)}\n")
                if (m.gameNotes.isNotBlank()) append("\n${m.gameNotes}\n")
                append("\nI-download at i-apply?")
            })
            .setPositiveButton("I-patch") { _, _ -> downloadPatch(m) }
            .setNegativeButton("Mamaya", null)
            .setNeutralButton("Laging i-auto") { _, _ -> prefs.autoPatch = true; downloadPatch(m) }
            .show()
    }

    private fun askAppUpdate(m: Manifest) {
        act.pauseGame()
        dialog()
            .setTitle("App Update ${m.appName}")
            .setMessage(buildString {
                append("May bagong version ng app (${prefs.channel.uppercase()}).\n")
                append("Ngayon: ${BuildConfig.VERSION_NAME}\nBago: ${m.appName}\n")
                append("Laki: ${mb(m.apk!!.size)}\n")
                if (m.appNotes.isNotBlank()) append("\n${m.appNotes}\n")
                append("\nSa loob ng app ida-download at i-install, walang browser.")
            })
            .setPositiveButton("I-update") { _, _ -> downloadApk(m) }
            .setNegativeButton("Mamaya", null)
            .show()
    }

    fun openSettings() {
        val channels = arrayOf("Stable", "Beta")
        val cur = if (prefs.channel == "beta") 1 else 0
        val info = "App ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})\nGame patch #${act.gameFiles.activeVersion()}"
        val layout = LinearLayout(act).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 0)
            addView(TextView(act).apply { text = info })
        }
        dialog()
            .setTitle("Update Settings")
            .setView(layout)
            .setSingleChoiceItems(channels, cur) { d, which ->
                setChannel(if (which == 1) "beta" else "stable")
                d.dismiss()
            }
            .setPositiveButton(if (prefs.autoPatch) "I-off ang auto-patch" else "I-on ang auto-patch") { _, _ ->
                prefs.autoPatch = !prefs.autoPatch
                act.toast(if (prefs.autoPatch) "Auto-patch ON, kusa nang mag-a-update ang game." else "Auto-patch OFF, tatanungin ka muna bago mag-patch.")
            }
            .setNeutralButton("Check ngayon") { _, _ -> check(true) }
            .setNegativeButton("Isara", null)
            .show()
    }

    fun setChannel(c: String) {
        if (c != "stable" && c != "beta") return
        if (c == prefs.channel) return
        prefs.channel = c
        act.toast(if (c == "beta") "BETA channel na (mas bago, baka may bugs)." else "STABLE channel na.")
        check(true)
    }

    // ------------------------------------------------------------------ downloads
    private class Progress(val dlg: AlertDialog, val bar: ProgressBar, val label: TextView)

    private fun progressDialog(title: String): Progress {
        val bar = ProgressBar(act, null, android.R.attr.progressBarStyleHorizontal).apply { max = 100 }
        val label = TextView(act).apply { gravity = Gravity.END }
        val box = LinearLayout(act).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 8)
            addView(bar); addView(label)
        }
        val dlg = dialog().setTitle(title).setView(box).setCancelable(false).show()
        return Progress(dlg, bar, label)
    }

    private fun downloadPatch(m: Manifest) {
        val asset = m.zip ?: return
        busy = true
        val p = progressDialog("Dina-download ang patch #${m.gameVersion}")
        thread(name = "patch-download") {
            val f = File(act.cacheDir, "patch.zip")
            try {
                download(asset, f, p)
                act.gameFiles.installPatch(f, m.gameVersion)
                patchReadyVersion = m.gameVersion
                main.post {
                    p.dlg.dismiss()
                    dialog()
                        .setTitle("Patch na-install!")
                        .setMessage("Patch #${m.gameVersion} ready na. I-restart ang game para gamitin?\n(Naka-save ang progress mo.)")
                        .setPositiveButton("Restart ngayon") { _, _ -> act.reloadGame() }
                        .setNegativeButton("Mamaya", null)
                        .show()
                }
            } catch (e: Exception) {
                main.post { p.dlg.dismiss(); act.toast("Pumalya ang patch: ${e.message}") }
            } finally {
                f.delete()
                busy = false
            }
        }
    }

    private fun downloadApk(m: Manifest) {
        val asset = m.apk ?: return
        busy = true
        val p = progressDialog("Dina-download ang ${m.appName}")
        thread(name = "apk-download") {
            val f = File(act.cacheDir, "update.apk")
            try {
                download(asset, f, p)
                pendingApk = f
                main.post { p.dlg.dismiss(); installPendingApk() }
            } catch (e: Exception) {
                f.delete()
                main.post { p.dlg.dismiss(); act.toast("Pumalya ang download: ${e.message}") }
            } finally {
                busy = false
            }
        }
    }

    /** Called after download, and again in onResume (after the user allows "install unknown apps"). */
    fun installPendingApk() {
        val apk = pendingApk ?: return
        if (!apk.isFile) { pendingApk = null; return }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !act.packageManager.canRequestPackageInstalls()) {
            dialog()
                .setTitle("Kailangan ng permission")
                .setMessage("Para ma-install ang update sa loob ng app, i-allow ang \"Install unknown apps\" para sa GC Replica. Isang beses lang 'to.")
                .setPositiveButton("Buksan ang Settings") { _, _ ->
                    act.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${act.packageName}")))
                }
                .setNegativeButton("Kanselahin") { _, _ -> pendingApk = null; apk.delete() }
                .show()
            return
        }
        pendingApk = null
        thread(name = "apk-install") {
            try {
                val installer = act.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
                }
                val id = installer.createSession(params)
                installer.openSession(id).use { s ->
                    s.openWrite("update.apk", 0, apk.length()).use { out ->
                        apk.inputStream().use { it.copyTo(out) }
                        s.fsync(out)
                    }
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                        (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
                    val pi = PendingIntent.getBroadcast(act, id, Intent(act, InstallReceiver::class.java), flags)
                    s.commit(pi.intentSender)
                }
            } catch (e: Exception) {
                main.post { act.toast("Pumalya ang install: ${e.message}") }
            } finally {
                apk.delete()
            }
        }
    }

    @Throws(IOException::class)
    private fun download(a: Asset, dest: File, p: Progress) {
        val conn = open(a.url)
        try {
            val total = if (a.size > 0) a.size else conn.contentLengthLong
            val md = MessageDigest.getInstance("SHA-256")
            var done = 0L
            var lastPct = -1
            conn.inputStream.use { input ->
                dest.outputStream().use { out ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                        md.update(buf, 0, n)
                        done += n
                        val pct = if (total > 0) (done * 100 / total).toInt() else 0
                        if (pct != lastPct) {
                            lastPct = pct
                            main.post { p.bar.progress = pct; p.label.text = "${mb(done)} / ${mb(total)}" }
                        }
                    }
                }
            }
            val hash = md.digest().joinToString("") { "%02x".format(it) }
            if (a.sha256.isNotEmpty() && !hash.equals(a.sha256, ignoreCase = true)) {
                dest.delete()
                throw IOException("sira ang file (checksum mismatch)")
            }
        } finally {
            conn.disconnect()
        }
    }

    // ------------------------------------------------------------------ http + json
    private fun open(url: String): HttpURLConnection {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 15000
        c.readTimeout = 30000
        c.instanceFollowRedirects = true
        c.setRequestProperty("Cache-Control", "no-cache")
        if (c.responseCode !in 200..299) {
            val code = c.responseCode
            c.disconnect()
            throw IOException("HTTP $code")
        }
        return c
    }

    private fun httpGet(url: String): String {
        val c = open(url)
        try { return c.inputStream.bufferedReader().readText() } finally { c.disconnect() }
    }

    private fun parse(json: String, manifestUrl: String): Manifest {
        val o = JSONObject(json)
        fun asset(x: JSONObject?): Asset? {
            if (x == null || !x.has("url")) return null
            val u = URL(URL(manifestUrl), x.getString("url")).toString()
            return Asset(u, x.optString("sha256"), x.optLong("size"))
        }
        val app = o.optJSONObject("app")
        val game = o.optJSONObject("game")
        return Manifest(
            appCode = app?.optInt("versionCode") ?: 0,
            appName = app?.optString("versionName").orEmpty(),
            appNotes = app?.optString("notes").orEmpty(),
            apk = asset(app),
            gameVersion = game?.optInt("version") ?: 0,
            minShellApi = game?.optInt("minShellApi", 1) ?: 1,
            gameNotes = game?.optString("notes").orEmpty(),
            zip = asset(game),
        )
    }

    private fun mb(b: Long) = "%.1f MB".format(b / 1048576.0)

    companion object {
        /** Bump when the JS<->native bridge changes in a way old app shells can't handle. */
        const val SHELL_API = 1
    }
}
