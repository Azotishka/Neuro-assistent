package com.neuroassistant.app.ai

import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import kotlinx.coroutines.delay
import java.util.Locale

class LocalDemoAiProvider : AiProvider {
    override val displayName: String = "Локальный демо-режим"

    override suspend fun reply(messages: List<ChatMessage>): String {
        delay(180)
        val text = messages.lastOrNull { it.role == MessageRole.USER }?.text?.trim().orEmpty()
        val normalized = text.lowercase(Locale.getDefault())
        return when {
            normalized.isBlank() -> "Напиши команду или вопрос."
            "привет" in normalized || "здравств" in normalized ->
                "Привет! Я NeuroAssistant. Голос, системные команды и история уже работают; для полноценного ИИ подключи OpenAI-compatible API в настройках."
            "что ты умеешь" in normalized || "возможност" in normalized ->
                "Я умею работать голосом, хранить несколько чатов, озвучивать и копировать ответы, открывать системные разделы и приложения Android. Для обычных вопросов можно подключить совместимый AI API."
            "кто ты" in normalized || "как тебя зовут" in normalized ->
                "Я NeuroAssistant — системный помощник Android."
            else -> "Локальный демо-движок не генерирует полноценные ответы. Подключи AI API в ⚙, либо используй системную команду Android."
        }
    }
}
