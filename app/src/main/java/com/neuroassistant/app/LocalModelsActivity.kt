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
import androidx.lifecycle.lifecycleScope
import com.neuroassistant.app.ai.OpenAiCompatibleProvider
import com.neuroassistant.app.data.ChatRepository
import com.neuroassistant.app.data.SettingsRepository
import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import com.neuroassistant.app.system.AndroidActionHandler
import com.neuroassistant.app.system.AssistantRoleHelper
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

class LocalModelsActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var pageReady = false
    private var voicePending = false
    private val settings by lazy { SettingsRepository(this) }
    private val voice = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if(result.resultCode == RESULT_OK) result.data?.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.let {
            web.evaluateJavascript("window.NeuroShell?.setPrompt(${JSONObject.quote(it)})", null)
        }
    }
    private val notifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        if(allowed) {
            startKeepAlive()
            if(::web.isInitialized) web.evaluateJavascript("window.NeuroShell?.setBackgroundState(true)", null)
        } else if(::web.isInitialized) {
            web.evaluateJavascript("window.NeuroShell?.setBackgroundState(false, 'Разрешение на уведомления отклонено')", null)
        }
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
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = false; allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString += " QwenLocalAndroid PocoX6Pro"
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? = loader.shouldInterceptRequest(request.url)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.scheme != "https" || request.url.host != "appassets.androidplatform.net"
            override fun onPageFinished(view: WebView, url: String) {
                pageReady = url.startsWith("https://appassets.androidplatform.net/assets/local/")
                if(voicePending) { voicePending = false; startVoice() }
            }
        }
        web.webChromeClient = object : WebChromeClient() { override fun onPermissionRequest(request: PermissionRequest) { request.deny() } }
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "NeuroNative", setOf("https://appassets.androidplatform.net")) { _, message, origin, mainFrame, proxy ->
                if(mainFrame && origin.toString() == "https://appassets.androidplatform.net") {
                    val reply = runCatching {
                        val data = JSONObject(message.data.orEmpty())
                        val op = data.optString("op")
                        if (op == "cloud") {
                            val items = data.optJSONArray("messages") ?: JSONArray()
                            val history = (maxOf(0, items.length() - 30) until items.length()).mapNotNull { index ->
                                val item = items.optJSONObject(index) ?: return@mapNotNull null
                                val role = when (item.optString("role")) {
                                    "user" -> MessageRole.USER
                                    "assistant" -> MessageRole.ASSISTANT
                                    else -> return@mapNotNull null
                                }
                                ChatMessage(role = role, text = item.optString("content").take(9000))
                            }
                            lifecycleScope.launch {
                                val response = runCatching { OpenAiCompatibleProvider(settings.load()).reply(history) }
                                    .fold({ JSONObject().put("reply", it) }, { JSONObject().put("error", it.message?.take(300) ?: "Ошибка API") })
                                proxy.postMessage(response.put("id", data.optString("id")).toString())
                            }
                            return@addWebMessageListener
                        }
                        val answer = when(op) {
                            "command" -> AndroidActionHandler(this).tryHandle(data.optString("text").take(8000)).let {
                                JSONObject().put("handled", it.handled).put("reply", it.reply)
                            }
                            "getSettings" -> settings.load().let { s -> JSONObject().put("baseUrl", s.baseUrl).put("model", s.model).put("hasKey", s.apiKey.isNotBlank()).put("autoSpeak", s.autoSpeak).put("speechVolume", s.speechVolume).put("speechRate", s.speechRate) }
                            "saveAudioSettings" -> {
                                settings.saveAudioPreferences(
                                    data.optBoolean("autoSpeak", false),
                                    data.optDouble("speechVolume", 1.0).toFloat(),
                                    data.optDouble("speechRate", 1.0).toFloat()
                                )
                                JSONObject().put("ok", true)
                            }
                            "saveSettings" -> {
                                val current = settings.load()
                                val base = data.optString("baseUrl").trim().trimEnd('/')
                                val uri = runCatching { java.net.URI(base) }.getOrNull()
                                require(uri?.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.query == null && uri.fragment == null) { "Нужен HTTPS-адрес API." }
                                val model = data.optString("model").trim()
                                require(model.isNotBlank() && model.length <= 120) { "Укажи модель (до 120 символов)." }
                                val key = data.optString("apiKey").trim().ifEmpty { current.apiKey }
                                require(key.isNotEmpty()) { "Укажи API-ключ." }
                                settings.save(current.copy(baseUrl = base, model = model, apiKey = key))
                                JSONObject().put("ok", true)
                            }
                            "legacyChats" -> JSONObject().put("chats", JSONArray().apply {
                                ChatRepository(this@LocalModelsActivity).loadConversations().filter { it.messages.isNotEmpty() }.forEach { chat ->
                                    put(JSONObject().put("id", chat.id).put("title", chat.title).put("messages", JSONArray().apply {
                                        chat.messages.forEach { msg -> put(JSONObject().put("role", msg.role.name.lowercase()).put("content", msg.text).put("createdAt", msg.timestamp)) }
                                    }))
                                }
                            })
                            "voice" -> { startVoice(); JSONObject().put("ok", true) }
                            "role" -> { startActivity(AssistantRoleHelper.requestIntent(this)); JSONObject().put("ok", true) }
                            "background" -> if (requestKeepAlive()) JSONObject().put("enabled", true).put("reply", "Фоновый режим включён. Микрофон не прослушивается.") else JSONObject().put("pending", true).put("reply", "Разреши уведомления — после этого фоновый режим включится.")
                            "stopBackground" -> { stopService(Intent(this, AssistantStandbyService::class.java)); JSONObject().put("reply", "Режим ожидания выключен.") }
                            else -> JSONObject().put("error", "Неизвестная операция")
                        }
                        answer.put("id", data.optString("id"))
                    }.getOrElse { JSONObject().put("error", it.message?.take(200) ?: "Не удалось выполнить действие") }
                    proxy.postMessage(reply.toString())
                }
            }
        }
        setContentView(FrameLayout(this).apply { addView(web, FrameLayout.LayoutParams(-1, -1)) })
        // Keep the POCO profile explicit: Android WebView often hides the exact model
        // from navigator.userAgent and navigator.deviceMemory.
        web.loadUrl("https://appassets.androidplatform.net/assets/local/index.html?profile=poco-x6-pro&app=android#chat")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.NeuroShell?.handleBack() === true") { consumed ->
                    if (consumed != "true") moveTaskToBack(true)
                }
            }
        })
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
    private fun requestKeepAlive(): Boolean {
        if(android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            notifications.launch(Manifest.permission.POST_NOTIFICATIONS)
            return false
        }
        startKeepAlive()
        return true
    }
    private fun startKeepAlive() { ContextCompat.startForegroundService(this, Intent(this, AssistantStandbyService::class.java)) }
    override fun onDestroy() {
        if(::web.isInitialized) { web.stopLoading(); (web.parent as? android.view.ViewGroup)?.removeView(web); web.destroy() }
        super.onDestroy()
    }
}
