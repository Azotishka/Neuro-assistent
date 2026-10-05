package com.neuroassistant.app.live

import com.neuroassistant.app.assistant.AssistantOrchestrator
import com.neuroassistant.app.assistant.AssistantResult

class LiveAssistantController(
    private val orchestrator: AssistantOrchestrator,
) {
    suspend fun submit(text: String): AssistantResult =
        orchestrator.submit(text)

    fun cancel(requestId: String) {
        orchestrator.cancel(requestId)
    }

    fun shutdown() {
        orchestrator.shutdown()
    }
}
