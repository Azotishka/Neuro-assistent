package com.neuroassistant.app.lifecycle

import com.neuroassistant.app.memory.MemoryStore
import com.neuroassistant.app.model.ChatMessage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AssistantLifecycleStateTest {
    @Test
    fun snapshotRestoresActiveSession() {
        val memory = MemoryStore()
        val controller = AssistantLifecycleController(memory)
        memory.appendMessage(ChatMessage(role = com.neuroassistant.app.model.MessageRole.USER, text = "hello"))
        val snapshot = controller.snapshot()
        memory.clearSession()
        controller.restore(snapshot)
        assertEquals("hello", memory.sessionSnapshot().single().text)
    }

    @Test
    fun constrainedMemoryEntersDegradedMode() {
        val controller = AssistantLifecycleController(MemoryStore())
        assertTrue(controller.isDegraded("constrained"))
    }
}
