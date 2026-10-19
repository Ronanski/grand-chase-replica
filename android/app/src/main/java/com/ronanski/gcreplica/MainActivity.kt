package com.ronanski.gcreplica

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : Activity() {
    lateinit var gameFiles: GameFiles
    private lateinit var updater: Updater
    private lateinit var prefs: Prefs
    private lateinit var web: WebView
    private var loader: WebViewAssetLoader? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= 28) {
            window.attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        prefs = Prefs(this)
        gameFiles = GameFiles(this)
        gameFiles.cleanup()
        updater = Updater(this)

        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
        }
        web.isVerticalScrollBarEnabled = false
        web.isHorizontalScrollBarEnabled = false
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.addJavascriptInterface(Bridge(), "GCShell")
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader?.shouldInterceptRequest(request.url)

            // The game never navigates away; block any external link.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.host != HOST
        }
        loadGame()
        hideSystemUi()
        web.postDelayed({ updater.check(false) }, 2500)
    }

    private fun loadGame() {
        loader = WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/game/", gameFiles.pathHandler())
            .build()
        web.loadUrl("https://$HOST/game/index.html")
    }

    fun reloadGame() {
        web.clearCache(true)
        loadGame()
    }

    fun pauseGame() = web.evaluateJavascript("window.gcPause&&window.gcPause()", null)

    fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()

    override fun onResume() {
        super.onResume()
        web.onResume()
        hideSystemUi()
        updater.installPendingApk()
        updater.checkIfStale()
    }

    override fun onPause() {
        web.evaluateJavascript("window.gcPause&&window.gcPause()", null)
        web.onPause()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUi()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("window.gcOnBack?window.gcOnBack():false") { handled ->
            if (handled != "true") confirmExit()
        }
    }

    private fun confirmExit() {
        AlertDialog.Builder(this, R.style.DialogTheme)
            .setMessage("Lalabas na sa game?")
            .setPositiveButton("Oo") { _, _ -> finish() }
            .setNegativeButton("Hindi", null)
            .show()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
        }
    }

    /** JS API exposed to the game as window.GCShell (see game/js/shell.js). */
    inner class Bridge {
        @JavascriptInterface
        fun info(): String = JSONObject()
            .put("appVersion", BuildConfig.VERSION_NAME)
            .put("appVersionCode", BuildConfig.VERSION_CODE)
            .put("gameVersion", gameFiles.activeVersion())
            .put("channel", prefs.channel)
            .put("autoPatch", prefs.autoPatch)
            .put("shellApi", Updater.SHELL_API)
            .toString()

        @JavascriptInterface
        fun checkUpdates() = runOnUiThread { updater.check(true) }

        @JavascriptInterface
        fun openUpdates() = runOnUiThread { updater.openSettings() }

        @JavascriptInterface
        fun setChannel(c: String) = runOnUiThread { updater.setChannel(c) }

        @JavascriptInterface
        fun vibrate(ms: Int) {
            val v = getSystemService(VIBRATOR_SERVICE) as? Vibrator ?: return
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms.toLong().coerceIn(1, 500), VibrationEffect.DEFAULT_AMPLITUDE))
            else @Suppress("DEPRECATION") v.vibrate(ms.toLong())
        }

        @JavascriptInterface
        fun exit() = runOnUiThread { confirmExit() }
    }

    companion object {
        const val HOST = "appassets.androidplatform.net"
    }
}
