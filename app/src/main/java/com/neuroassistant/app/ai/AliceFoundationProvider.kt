package com.neuroassistant.app.ai

import com.neuroassistant.app.data.AssistantSettings
import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

/**
 * Experimental adapter for the PRETRAINED AliceAI Foundation model.
 * It exposes /v1/completions, not /v1/chat/completions.
 * The model is not instruction-tuned; responses may not behave like a chat assistant.
 * baseUrl is the authenticated HTTPS gateway's OpenAI-compatible /v1 URL.
 */
class AliceFoundationProvider(private val settings: AssistantSettings) : AiProvider {
    override val displayName = "AliceAI Foundation (эксперимент)"
    override suspend fun reply(messages: List<ChatMessage>): String = withContext(Dispatchers.IO) {
        val uri = URI(settings.baseUrl.trim())
        require(uri.scheme == "https" && !uri.host.isNullOrBlank() &&
            uri.userInfo == null && uri.query == null && uri.fragment == null) {
            "Нужен HTTPS-адрес защищённого API."
        }
        require(settings.apiKey.isNotBlank()) { "Укажи ключ доступа к своему API-шлюзу." }
        require(settings.model == MODEL_ID) { "Неверный идентификатор AliceAI." }
        val prompt = buildString {
            messages.takeLast(8).forEach { message ->
                val speaker = when (message.role) {
                    MessageRole.USER -> "Пользователь"
                    MessageRole.ASSISTANT -> "Ассистент"
                    MessageRole.SYSTEM -> "Контекст"
                }
                append(speaker).append(": ").append(message.text.take(4000)).append("\n")
            }
            append("Ассистент:")
        }
        val url = URL(settings.baseUrl.trimEnd('/') + "/completions")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 20_000
            readTimeout = 90_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Authorization", "Bearer ${settings.apiKey}")
        }
        try {
            val request = JSONObject()
                .put("model", MODEL_ID)
                .put("prompt", prompt)
                .put("max_tokens", 512)
                .put("temperature", 0.3)
                .put("stream", false)
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(request.toString()) }
            val status = connection.responseCode
            val response = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (status !in 200..299) throw IllegalStateException("AliceAI API: HTTP $status")
            JSONObject(response).optJSONArray("choices")?.optJSONObject(0)
                ?.optString("text")?.trim()?.takeIf { it.isNotBlank() }
                ?: throw IllegalStateException("AliceAI вернула пустой ответ.")
        } finally {
            connection.disconnect()
        }
    }

    companion object {
        const val MODEL_ID = "yandex/AliceAI-Foundation-80B-A3B-Base"
    }
}
