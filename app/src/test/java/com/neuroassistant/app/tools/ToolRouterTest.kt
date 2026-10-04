package com.neuroassistant.app.tools

import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.coroutineScope
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ToolRouterTest {
    @Test
    fun executesRegisteredTool() = runBlocking {
        val router = ToolRouter()
        router.register(
            ToolDefinition("echo", "Echo", requiredArguments = setOf("text"), capability = "text"),
        ) { request -> request.arguments.getValue("text") }
        val result = router.execute(ToolRequest(toolName = "echo", arguments = mapOf("text" to "hi"), capabilities = setOf("text")))
        assertTrue(result.success)
        assertEquals("hi", result.output)
    }

    @Test
    fun rejectsMissingCapability() = runBlocking {
        val router = ToolRouter()
        router.register(ToolDefinition("echo", "Echo", capability = "text")) { "ok" }
        val result = router.execute(ToolRequest(toolName = "echo"))
        assertEquals("CAPABILITY_REQUIRED", result.errorCode)
    }

    @Test
    fun rejectsInvalidArguments() = runBlocking {
        val router = ToolRouter()
        router.register(ToolDefinition("echo", "Echo", requiredArguments = setOf("text"))) { "ok" }
        val result = router.execute(ToolRequest(toolName = "echo"))
        assertEquals("INVALID_ARGUMENTS", result.errorCode)
    }

    @Test
    fun returnsTimeoutResult() = runBlocking {
        val router = ToolRouter()
        router.register(ToolDefinition("slow", "Slow")) { delay(100); "late" }
        val result = router.execute(ToolRequest(toolName = "slow", timeoutMs = 10))
        assertEquals("TIMEOUT", result.errorCode)
    }

    @Test
    fun cancellationReturnsStructuredResult() = runBlocking {
        val router = ToolRouter()
        router.register(ToolDefinition("slow", "Slow")) { delay(5_000); "late" }
        val request = ToolRequest(toolName = "slow")
        val result = coroutineScope {
            val job = async { router.execute(request) }
            delay(25)
            router.cancel(request.requestId)
            job.await()
        }
        assertEquals("CANCELLED", result.errorCode)
    }
}
