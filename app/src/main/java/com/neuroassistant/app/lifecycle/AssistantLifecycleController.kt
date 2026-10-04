package com.neuroassistant.app.lifecycle

import com.neuroassistant.app.memory.MemoryStore
import com.neuroassistant.app.model.ChatMessage

data class AssistantSessionSnapshot(
    val messages: List<ChatMessage>,
)

class AssistantLifecycleController(
    private val memory: MemoryStore,
) {
    fun snapshot(): AssistantSessionSnapshot =
        AssistantSessionSnapshot(memory.sessionSnapshot())

    fun restore(snapshot: AssistantSessionSnapshot) {
        memory.restoreSession(snapshot.messages)
    }

    fun isDegraded(memoryClass: String): Boolean =
        memoryClass.equals("constrained", ignoreCase = true)
}
