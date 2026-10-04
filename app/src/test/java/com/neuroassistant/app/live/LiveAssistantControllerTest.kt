package com.neuroassistant.app.live

import com.neuroassistant.app.ai.AiProvider
import com.neuroassistant.app.ai.AiRequest
import com.neuroassistant.app.ai.AiResponse
import com.neuroassistant.app.assistant.AssistantOrchestrator
import com.neuroassistant.app.memory.MemoryStore
import com.neuroassistant.app.model.ChatMessage
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class LiveAssistantControllerTest {
    @Test
    fun liveControllerUsesSharedOrchestrator() = runBlocking {
        val provider = object : AiProvider {
            override val displayName = "live-test"
            override suspend fun reply(messages: List<ChatMessage>) = "ok"
            override suspend fun generate(request: AiRequest) = AiResponse(request.requestId, "ok", "live-test")
        }
        val controller = LiveAssistantController(AssistantOrchestrator(provider, MemoryStore()))
        assertEquals("ok", controller.submit("hello").text)
    }
}
