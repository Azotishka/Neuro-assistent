package com.neuroassistant.app.ai

import com.neuroassistant.app.model.ChatMessage
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.runBlocking

class AiProviderContractTest {
    @Test
    fun providerGeneratesAndStreamsThroughOneBoundary() = runBlocking {
        val chunks = AtomicInteger(0)
        val provider = object : AiProvider {
            override val displayName = "test"
            override suspend fun reply(messages: List<ChatMessage>) = "ok"
        }

        val request = AiRequest(messages = listOf(ChatMessage(role = com.neuroassistant.app.model.MessageRole.USER, text = "hi")))
        assertEquals("ok", provider.generate(request).text)
        provider.stream(request) {
            chunks.incrementAndGet()
        }
        assertEquals(1, chunks.get())
        assertEquals("test", provider.capabilities.providerId)
    }
}
