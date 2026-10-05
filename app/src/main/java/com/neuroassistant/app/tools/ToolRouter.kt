package com.neuroassistant.app.tools

import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.withTimeout

data class ToolDefinition(
    val name: String,
    val description: String,
    val inputSchemaJson: String = "{}",
    val requiredArguments: Set<String> = emptySet(),
    val capability: String? = null,
    val skillId: String? = null,
)

data class ToolRequest(
    val requestId: String = java.util.UUID.randomUUID().toString(),
    val toolName: String,
    val arguments: Map<String, String> = emptyMap(),
    val capabilities: Set<String> = emptySet(),
    val timeoutMs: Long = 30_000L,
)

data class ToolResult(
    val requestId: String,
    val success: Boolean,
    val output: String = "",
    val errorCode: String? = null,
    val errorMessage: String? = null,
)

fun interface ToolHandler {
    suspend fun handle(request: ToolRequest): String
}

class ToolRouter(
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
    private val skillRegistry: SkillRegistry? = null,
) {
    private data class RegisteredTool(val definition: ToolDefinition, val handler: ToolHandler)
    private val tools = ConcurrentHashMap<String, RegisteredTool>()
    private val jobs = ConcurrentHashMap<String, Job>()

    fun register(definition: ToolDefinition, handler: ToolHandler) {
        require(definition.name.isNotBlank()) { "Tool name must not be blank" }
        tools[definition.name] = RegisteredTool(definition, handler)
    }

    suspend fun execute(request: ToolRequest): ToolResult {
        val registered = tools[request.toolName]
            ?: return ToolResult(request.requestId, false, errorCode = "NOT_FOUND", errorMessage = "Tool is not registered")
        val definition = registered.definition

        if (definition.skillId != null && skillRegistry?.isEnabled(definition.skillId) == false) {
            return ToolResult(request.requestId, false, errorCode = "SKILL_DISABLED", errorMessage = "Required skill is disabled")
        }
        if (definition.capability != null && definition.capability !in request.capabilities) {
            return ToolResult(request.requestId, false, errorCode = "CAPABILITY_REQUIRED", errorMessage = "Required capability is missing")
        }
        if (!definition.requiredArguments.all { request.arguments.containsKey(it) }) {
            return ToolResult(request.requestId, false, errorCode = "INVALID_ARGUMENTS", errorMessage = "Required tool arguments are missing")
        }
        if (request.timeoutMs <= 0L) {
            return ToolResult(request.requestId, false, errorCode = "INVALID_ARGUMENTS", errorMessage = "Timeout must be positive")
        }

        val schemaResult = ToolSchemaValidator.validate(definition.inputSchemaJson, request.arguments)
        if (!schemaResult.valid) {
            return ToolResult(request.requestId, false, errorCode = "INVALID_SCHEMA", errorMessage = schemaResult.error ?: "Tool arguments do not match schema")
        }

        val job = scope.async { withTimeout(request.timeoutMs) { registered.handler.handle(request) } }
        jobs[request.requestId] = job
        return try {
            ToolResult(request.requestId, true, output = job.await())
        } catch (_: kotlinx.coroutines.TimeoutCancellationException) {
            ToolResult(request.requestId, false, errorCode = "TIMEOUT", errorMessage = "Tool execution timed out")
        } catch (_: CancellationException) {
            ToolResult(request.requestId, false, errorCode = "CANCELLED", errorMessage = "Tool execution was cancelled")
        } catch (error: Throwable) {
            ToolResult(request.requestId, false, errorCode = "TOOL_ERROR", errorMessage = error.message ?: "Tool execution failed")
        } finally {
            jobs.remove(request.requestId)
        }
    }

    fun cancel(requestId: String) { jobs[requestId]?.cancel(CancellationException("Cancelled by user")) }

    fun shutdown() {
        scope.cancel()
        jobs.clear()
        tools.clear()
    }
}
