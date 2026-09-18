package com.neuroassistant.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.*
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.neuroassistant.app.system.AndroidActionHandler
import com.neuroassistant.app.system.AssistantRoleHelper
import org.json.JSONObject

class LocalModelsActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var pageReady = false
    private var voicePending = false
    private val voice = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if(result.resultCode == RESULT_OK) result.data?.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.let {
            web.evaluateJavascript("window.NeuroShell?.setPrompt(${JSONObject.quote(it)})", null)
        }
    }
    private val notifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        if(allowed) startKeepAlive()
    }
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        voicePending = intent.getBooleanExtra(MainActivity.EXTRA_START_VOICE, false)
        val loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web = WebView(this)
        // Fit system bars; the web UI owns keyboard and navigation layout.
        window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        web.settings.apply {
            javaScriptEnabled = true; domStorageEnabled = true
            allowFileAccess = false; allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString += " QwenLocalAndroid"
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? = loader.shouldInterceptRequest(request.url)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.url.host != "appassets.androidplatform.net"
            override fun onPageFinished(view: WebView, url: String) {
                pageReady = true
                if(voicePending) { voicePending = false; startVoice() }
            }
        }
        web.webChromeClient = object : WebChromeClient() { override fun onPermissionRequest(request: PermissionRequest) { request.deny() } }
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "NeuroNative", setOf("https://appassets.androidplatform.net")) { _, message, _, mainFrame, proxy ->
                if(mainFrame) {
                    val reply = runCatching {
                        val data = JSONObject(message.data.orEmpty())
                        val op = data.optString("op")
                        val answer = when(op) {
                            "command" -> AndroidActionHandler(this).tryHandle(data.optString("text").take(8000)).let {
                                JSONObject().put("handled", it.handled).put("reply", it.reply)
                            }
                            "voice" -> { startVoice(); JSONObject().put("ok", true) }
                            "role" -> { startActivity(AssistantRoleHelper.requestIntent(this)); JSONObject().put("ok", true) }
                            "settings" -> { startActivity(Intent(this, MainActivity::class.java).putExtra("native_settings", true)); JSONObject().put("ok", true) }
                            "background" -> { requestKeepAlive(); JSONObject().put("reply", "Режим ожидания включается через уведомление. Android может ограничивать вычисления; локальная генерация при сворачивании не гарантируется.") }
                            "stopBackground" -> { stopService(Intent(this, AssistantStandbyService::class.java)); JSONObject().put("reply", "Режим ожидания выключен.") }
                            else -> JSONObject().put("error", "Неизвестная операция")
                        }
                        answer.put("id", data.optString("id"))
                    }.getOrElse { JSONObject().put("error", "Не удалось выполнить действие") }
                    proxy.postMessage(reply.toString())
                }
            }
        }
        setContentView(FrameLayout(this).apply { addView(web, FrameLayout.LayoutParams(-1, -1)) })
        web.loadUrl("https://appassets.androidplatform.net/assets/local/index.html")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) { override fun handleOnBackPressed() { moveTaskToBack(true) } })
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent); setIntent(intent)
        if(intent.getBooleanExtra(MainActivity.EXTRA_START_VOICE, false)) {
            if(pageReady) startVoice() else voicePending = true
        }
    }
    private fun startVoice() {
        runCatching { voice.launch(Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, "ru-RU")) }.onFailure {
            web.evaluateJavascript("window.NeuroShell?.notice('Голосовой ввод недоступен. Проверь службу речи Android.')", null)
        }
    }
    private fun requestKeepAlive() {
        if(android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            notifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        else startKeepAlive()
    }
    private fun startKeepAlive() { ContextCompat.startForegroundService(this, Intent(this, AssistantStandbyService::class.java)) }
    override fun onDestroy() {
        if(::web.isInitialized) { web.stopLoading(); (web.parent as? android.view.ViewGroup)?.removeView(web); web.destroy() }
        super.onDestroy()
    }
}
