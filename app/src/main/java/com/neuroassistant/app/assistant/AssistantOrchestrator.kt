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

enum class AssistantPhase { RECEIVED, TOOL, GENERATING, COMPLETED, FAILED, CANCELLED }

data class AssistantProgress(
    val requestId: String,
    val phase: AssistantPhase,
    val message: String,
    val step: Int = 0,
    val totalSteps: Int = 0,
)

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
        onProgress: (AssistantProgress) -> Unit = {},
    ): AssistantResult {
        if (text.isBlank()) {
            val result = AssistantResult(requestId, false, errorCode = "EMPTY_INPUT")
            onProgress(AssistantProgress(requestId, AssistantPhase.FAILED, "Пустой запрос"))
            return result
        }

        onProgress(AssistantProgress(requestId, AssistantPhase.RECEIVED, "Запрос принят"))
        val execution = scope.async { execute(requestId, text, toolRequests, onProgress) }
        activeJobs[requestId] = execution

        return try {
            execution.await()
        } catch (_: CancellationException) {
            onProgress(AssistantProgress(requestId, AssistantPhase.CANCELLED, "Запрос отменён"))
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
        onProgress: (AssistantProgress) -> Unit,
    ): AssistantResult {
        memory.appendMessage(ChatMessage(role = MessageRole.USER, text = text.trim()))
        val toolResults = mutableListOf<ToolResult>()
        activeTools[requestId] = ConcurrentHashMap.newKeySet()

        return try {
            if (toolRequests.size > maxSteps) {
                onProgress(AssistantProgress(requestId, AssistantPhase.FAILED, "Превышен лимит шагов"))
                return AssistantResult(requestId, false, errorCode = "STEP_LIMIT")
            }

            if (toolRouter != null) {
                toolRequests.forEachIndexed { index, request ->
                    onProgress(
                        AssistantProgress(
                            requestId,
                            AssistantPhase.TOOL,
                            "Выполняю инструмент " + (index + 1) + "/" + toolRequests.size,
                            index + 1,
                            toolRequests.size
                        )
                    )
                    activeTools[requestId]?.add(request.requestId)
                    toolResults += toolRouter.execute(request)
                    activeTools[requestId]?.remove(request.requestId)
                }
            } else if (toolRequests.isNotEmpty()) {
                onProgress(AssistantProgress(requestId, AssistantPhase.FAILED, "Инструменты недоступны"))
                return AssistantResult(requestId, false, errorCode = "TOOLS_UNAVAILABLE")
            }

            onProgress(AssistantProgress(requestId, AssistantPhase.GENERATING, "Генерирую ответ"))
            val context = memory.buildContext(4096).toMutableList()
            toolResults.forEach { result ->
                context += ChatMessage(role = MessageRole.SYSTEM, text = "Инструмент: " + (result.errorCode ?: "OK") + " " + result.output)
            }

            val response = provider.generate(AiRequest(requestId = requestId, messages = context))
            memory.appendMessage(ChatMessage(role = MessageRole.ASSISTANT, text = response.text))
            onProgress(AssistantProgress(requestId, AssistantPhase.COMPLETED, "Готово", toolResults.size, toolRequests.size))
            AssistantResult(requestId, true, response.text, toolResults = toolResults)
        } catch (error: CancellationException) {
            throw error
        } catch (_: Throwable) {
            onProgress(AssistantProgress(requestId, AssistantPhase.FAILED, "Не удалось получить ответ"))
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
