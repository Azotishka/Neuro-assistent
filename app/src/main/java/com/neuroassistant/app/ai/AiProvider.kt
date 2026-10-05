package com.neuroassistant.app.ai

import com.neuroassistant.app.model.ChatMessage
import java.util.UUID

data class AiRequest(
    val requestId: String = UUID.randomUUID().toString(),
    val messages: List<ChatMessage>,
    val maxTokens: Int? = null,
    val temperature: Double? = null,
    val metadata: Map<String, String> = emptyMap()
)

data class AiResponse(
    val requestId: String,
    val text: String,
    val provider: String
)

data class AiCapabilities(
    val providerId: String,
    val local: Boolean = false,
    val streaming: Boolean = true,
    val cancellation: Boolean = false,
    val toolCalls: Boolean = false
)

interface AiProvider {
    val displayName: String
    val capabilities: AiCapabilities
        get() = AiCapabilities(providerId = displayName)

    suspend fun reply(messages: List<ChatMessage>): String

    suspend fun generate(request: AiRequest): AiResponse =
        AiResponse(request.requestId, reply(request.messages), capabilities.providerId)

    suspend fun stream(request: AiRequest, onChunk: suspend (String) -> Unit): AiResponse {
        val response = generate(request)
        if (response.text.isNotEmpty()) onChunk(response.text)
        return response
    }

    fun cancel(requestId: String) {
        // Providers that own a cancellable runtime override this hook.
    }
}
