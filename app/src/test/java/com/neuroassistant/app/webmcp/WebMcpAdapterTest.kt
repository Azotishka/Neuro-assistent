package com.neuroassistant.app.webmcp

import com.neuroassistant.app.tools.ToolRequest
import com.neuroassistant.app.tools.ToolRouter
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WebMcpAdapterTest {
    @Test
    fun onlyExplicitlyRegisteredToolsAreAvailable() = runBlocking {
        val router = ToolRouter()
        val adapter = WebMcpAdapter(router)
        adapter.register(WebMcpTool("page.read", "Read page", capability = "web", requiredArguments = setOf("url"))) { it.arguments.getValue("url") }
        assertTrue(adapter.list().any { it.name == "page.read" })
        assertEquals("NOT_FOUND", router.execute(ToolRequest(toolName = "page.write")).errorCode)
    }

    @Test
    fun schemaAndCapabilityAreEnforcedByAdapter() = runBlocking {
        val router = ToolRouter()
        val adapter = WebMcpAdapter(router)
        adapter.register(WebMcpTool("page.read", "Read page", capability = "web", requiredArguments = setOf("url"))) { "ok" }
        assertEquals("INVALID_ARGUMENTS", adapter.execute(ToolRequest(toolName = "page.read", capabilities = setOf("web"))).errorCode)
        assertEquals("CAPABILITY_REQUIRED", adapter.execute(ToolRequest(toolName = "page.read", arguments = mapOf("url" to "https://example.com"))).errorCode)
    }
}
