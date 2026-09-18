package com.neuroassistant.app.ai

import com.neuroassistant.app.model.ChatMessage

interface AiProvider {
    val displayName: String
    suspend fun reply(messages: List<ChatMessage>): String
}
