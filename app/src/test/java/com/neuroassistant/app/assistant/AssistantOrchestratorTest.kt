package com.neuroassistant.app.assistant

import com.neuroassistant.app.ai.AiCapabilities
import com.neuroassistant.app.ai.AiProvider
import com.neuroassistant.app.ai.AiRequest
import com.neuroassistant.app.ai.AiResponse
import com.neuroassistant.app.memory.MemoryStore
import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import com.neuroassistant.app.tools.ToolDefinition
import com.neuroassistant.app.tools.ToolRequest
import com.neuroassistant.app.tools.ToolRouter
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.async
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AssistantOrchestratorTest {
    private class FakeProvider(
        private val response: String = "AI",
        private val failure: Throwable? = null,
        private val slow: Boolean = false,
    ) : AiProvider {
        override val displayName = "fake"
        var lastRequest: AiRequest? = null
        override val capabilities = AiCapabilities("fake", local = true)
        override suspend fun reply(messages: List<ChatMessage>) = response
        override suspend fun generate(request: AiRequest): AiResponse {
            lastRequest = request
            if (slow) delay(5_000)
            failure?.let { throw it }
            return AiResponse(request.requestId, response, "fake")
        }
    }

    @Test
    fun normalChatUsesProviderAndMemory() = runBlocking {
        val provider = FakeProvider("hello")
        val orchestrator = AssistantOrchestrator(provider, MemoryStore())
        val result = orchestrator.submit("hi")
        assertTrue(result.success)
        assertEquals("hello", result.text)
        assertEquals(MessageRole.USER, provider.lastRequest?.messages?.first()?.role)
    }

    @Test
    fun toolCallFeedsStructuredResultBackToProvider() = runBlocking {
        val provider = FakeProvider("done")
        val tools = ToolRouter()
        tools.register(ToolDefinition("echo", "Echo")) { it.arguments.getValue("text") }
        val orchestrator = AssistantOrchestrator(provider, MemoryStore(), tools)
        val result = orchestrator.submit("use echo", listOf(ToolRequest(toolName = "echo", arguments = mapOf("text" to "42"))))
        assertEquals("done", result.text)
        assertEquals("42", result.toolResults.single().output)
        assertTrue(provider.lastRequest!!.messages.any { it.text.contains("42") })
    }

    @Test
    fun providerFailureIsStructured() = runBlocking {
        val orchestrator = AssistantOrchestrator(FakeProvider(failure = IllegalStateException("offline")), MemoryStore())
        val result = orchestrator.submit("hi")
        assertEquals("PROVIDER_ERROR", result.errorCode)
    }

    @Test
    fun reportsProgressThroughToolAndGenerationPhases() = runBlocking {
        val provider = FakeProvider("done")
        val tools = ToolRouter()
        tools.register(ToolDefinition("echo", "Echo")) { "42" }
        val orchestrator = AssistantOrchestrator(provider, MemoryStore(), tools)
        val phases = mutableListOf<AssistantPhase>()
        val result = orchestrator.submit(
            "use echo",
            listOf(ToolRequest(toolName = "echo")),
            onProgress = { phases += it.phase }
        )
        assertTrue(result.success)
        assertTrue(phases.contains(AssistantPhase.TOOL))
        assertTrue(phases.contains(AssistantPhase.GENERATING))
        assertEquals(AssistantPhase.COMPLETED, phases.last())
    }

    @Test
    fun cancellationStopsActiveRequest() = runBlocking {
        val provider = FakeProvider(slow = true)
        val orchestrator = AssistantOrchestrator(provider, MemoryStore())
        val requestId = "cancel-me"
        val result = coroutineScope {
            val request = async { orchestrator.submit("wait", requestId = requestId) }
            delay(25)
            orchestrator.cancel(requestId)
            request.await()
        }
        assertEquals("CANCELLED", result.errorCode)
    }
}
