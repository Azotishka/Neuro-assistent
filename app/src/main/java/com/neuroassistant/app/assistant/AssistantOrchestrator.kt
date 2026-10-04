package com.neuroassistant.app.assistant

import com.neuroassistant.app.ai.AiProvider
import com.neuroassistant.app.ai.AiRequest
import com.neuroassistant.app.memory.MemoryStore
import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import com.neuroassistant.app.tools.ToolRequest
import com.neuroassistant.app.tools.ToolResult
import com.neuroassistant.app.tools.ToolRouter
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.cancel

data class AssistantResult(
    val requestId: String,
    val success: Boolean,
    val text: String = "",
    val errorCode: String? = null,
    val toolResults: List<ToolResult> = emptyList(),
)

class AssistantOrchestrator(
    private val provider: AiProvider,
    private val memory: MemoryStore,
    private val toolRouter: ToolRouter? = null,
    private val maxSteps: Int = 4,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val activeJobs = ConcurrentHashMap<String, Job>()
    private val activeTools = ConcurrentHashMap<String, MutableSet<String>>()

    suspend fun submit(
        text: String,
        toolRequests: List<ToolRequest> = emptyList(),
        requestId: String = UUID.randomUUID().toString(),
    ): AssistantResult {
        if (text.isBlank()) return AssistantResult(requestId, false, errorCode = "EMPTY_INPUT")
        val execution = scope.async {
            execute(requestId, text, toolRequests)
        }
        activeJobs[requestId] = execution
        return try {
            execution.await()
        } catch (_: CancellationException) {
            AssistantResult(requestId, false, errorCode = "CANCELLED")
        } finally {
            activeJobs.remove(requestId)
            activeTools.remove(requestId)
        }
    }

    private suspend fun execute(
        requestId: String,
        text: String,
        toolRequests: List<ToolRequest>,
    ): AssistantResult {
        memory.appendMessage(ChatMessage(role = MessageRole.USER, text = text.trim()))
        val toolResults = mutableListOf<ToolResult>()
        activeTools[requestId] = ConcurrentHashMap.newKeySet()
        return try {
            if (toolRequests.size > maxSteps) return AssistantResult(requestId, false, errorCode = "STEP_LIMIT")
            if (toolRouter != null) {
                toolRequests.forEach { request ->
                    activeTools[requestId]?.add(request.requestId)
                    toolResults += toolRouter.execute(request)
                    activeTools[requestId]?.remove(request.requestId)
                }
            } else if (toolRequests.isNotEmpty()) {
                return AssistantResult(requestId, false, errorCode = "TOOLS_UNAVAILABLE")
            }
            val context = memory.buildContext(4096).toMutableList()
            toolResults.forEach { result ->
                context += ChatMessage(
                    role = MessageRole.SYSTEM,
                    text = "Инструмент: " + (result.errorCode ?: "OK") + " " + result.output
                )
            }
            val response = provider.generate(AiRequest(requestId = requestId, messages = context))
            memory.appendMessage(ChatMessage(role = MessageRole.ASSISTANT, text = response.text))
            AssistantResult(requestId, true, response.text, toolResults = toolResults)
        } catch (_: CancellationException) {
            throw
        } catch (_: Throwable) {
            AssistantResult(requestId, false, errorCode = "PROVIDER_ERROR", toolResults = toolResults)
        }
    }

    fun cancel(requestId: String) {
        activeTools[requestId]?.forEach { toolRouter?.cancel(it) }
        provider.cancel(requestId)
        activeJobs[requestId]?.cancel(CancellationException("Cancelled by user"))
    }

    fun shutdown() {
        scope.cancel()
        activeJobs.clear()
        activeTools.clear()
    }
}
