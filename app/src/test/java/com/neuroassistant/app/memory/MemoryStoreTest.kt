package com.neuroassistant.app.memory

import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MemoryStoreTest {
    @Test
    fun contextIsBoundedByRequestedBudget() {
        val store = MemoryStore()
        repeat(20) { store.appendMessage(ChatMessage(role = MessageRole.USER, text = "x".repeat(400))) }
        val context = store.buildContext(200)
        assertTrue(context.isNotEmpty())
        assertTrue(context.sumOf { it.text.length / 4 + 1 } <= 200)
    }

    @Test
    fun persistenceFailureDoesNotBreakChatMemory() {
        val backend = object : MemoryPersistence {
            override fun loadFacts() = emptyList<MemoryFact>()
            override fun saveFact(fact: MemoryFact) { error("storage unavailable") }
        }
        val store = MemoryStore(backend)
        assertFalse(store.saveFact("name", "Ashot"))
        store.appendMessage(ChatMessage(role = MessageRole.USER, text = "hello"))
        assertEquals("hello", store.buildContext(100).last().text)
    }
}
