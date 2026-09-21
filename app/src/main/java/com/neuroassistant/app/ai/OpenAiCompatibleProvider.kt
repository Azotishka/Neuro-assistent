package com.neuroassistant.app.ai

import com.neuroassistant.app.data.AssistantSettings
import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.coroutines.coroutineContext

class OpenAiCompatibleProvider(
    private val settings: AssistantSettings
) : AiProvider {
    override val displayName: String = settings.model.ifBlank { "OpenAI-compatible" }

    override suspend fun reply(messages: List<ChatMessage>): String = withContext(Dispatchers.IO) {
        if (settings.model == AliceFoundationProvider.MODEL_ID) {
            return@withContext AliceFoundationProvider(settings).reply(messages)
        }
        require(settings.apiKey.isNotBlank()) { "API-ключ не задан. Открой настройки ⚙." }
        val base = runCatching { java.net.URI(settings.baseUrl.trim()) }.getOrNull()
        require(base?.scheme == "https" && !base.host.isNullOrBlank() && base.userInfo == null && base.query == null && base.fragment == null) {
            "Укажи HTTPS-адрес API без параметров и пароля."
        }
        require(settings.model.isNotBlank()) { "Модель не задана." }

        coroutineContext.ensureActive()
        val endpoint = settings.baseUrl.trimEnd('/') + "/chat/completions"
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 20_000
            readTimeout = 90_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer ${settings.apiKey}")
        }

        try {
            val payloadMessages = JSONArray().apply {
                put(JSONObject().put("role", "system").put("content", "Ты NeuroAssistant — краткий и полезный мобильный ассистент. Отвечай на языке пользователя."))
                messages.takeLast(30).forEach { message ->
                    val role = when (message.role) {
                        MessageRole.USER -> "user"
                        MessageRole.ASSISTANT -> "assistant"
                        MessageRole.SYSTEM -> "system"
                    }
                    put(JSONObject().put("role", role).put("content", message.text))
                }
            }
            val payload = JSONObject()
                .put("model", settings.model)
                .put("messages", payloadMessages)
                .put("stream", false)

            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(payload.toString()) }
            coroutineContext.ensureActive()

            val code = connection.responseCode
            val body = (if (code in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()

            if (code !in 200..299) {
                val detail = runCatching { JSONObject(body).optJSONObject("error")?.optString("message") }.getOrNull()
                throw IllegalStateException(detail?.takeIf { it.isNotBlank() } ?: "HTTP $code от AI API")
            }

            val json = JSONObject(body)
            json.optJSONArray("choices")
                ?.optJSONObject(0)
                ?.optJSONObject("message")
                ?.optString("content")
                ?.trim()
                ?.takeIf { it.isNotBlank() }
                ?: throw IllegalStateException("AI API вернул пустой ответ.")
        } finally {
            connection.disconnect()
        }
    }
}
