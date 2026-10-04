package com.neuroassistant.app.memory

import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole

data class MemoryFact(val key: String, val value: String)

interface MemoryPersistence {
    fun loadFacts(): List<MemoryFact>
    fun saveFact(fact: MemoryFact)
}

class InMemoryMemoryPersistence(private val facts: MutableList<MemoryFact> = mutableListOf()) : MemoryPersistence {
    override fun loadFacts(): List<MemoryFact> = facts.toList()
    override fun saveFact(fact: MemoryFact) { facts.removeAll { it.key == fact.key }; facts += fact }
}

class MemoryStore(private val persistence: MemoryPersistence = InMemoryMemoryPersistence()) {
    private val session = mutableListOf<ChatMessage>()
    private val facts = mutableListOf<MemoryFact>()
    init { runCatching { facts += persistence.loadFacts() } }
    fun appendMessage(message: ChatMessage) { session += message }
    fun saveFact(key: String, value: String): Boolean {
        if (key.isBlank() || value.isBlank()) return false
        val fact = MemoryFact(key.trim(), value.trim())
        return runCatching { persistence.saveFact(fact); facts.removeAll { it.key == fact.key }; facts += fact }.isSuccess
    }
    fun buildContext(budget: Int): List<ChatMessage> {
        if (budget <= 0) return emptyList()
        var remaining = budget
        val result = mutableListOf<ChatMessage>()
        facts.forEach { fact ->
            val message = ChatMessage(role = MessageRole.SYSTEM, text = "Память: " + fact.key + " = " + fact.value)
            val cost = estimate(message)
            if (cost <= remaining) { result += message; remaining -= cost }
        }
        session.asReversed().forEach { message ->
            val cost = estimate(message)
            if (cost <= remaining) { result.add(0, message); remaining -= cost }
        }
        return result
    }
    fun clearSession() { session.clear() }
    private fun estimate(message: ChatMessage): Int = message.text.length / 4 + 1
}