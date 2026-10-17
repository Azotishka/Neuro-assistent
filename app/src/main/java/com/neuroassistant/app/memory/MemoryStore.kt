package com.neuroassistant.app.memory

import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole

data class MemoryFact(val key: String, val value: String)

interface MemoryPersistence {
    fun loadFacts(): List<MemoryFact>
    fun saveFact(fact: MemoryFact)
    fun deleteFact(key: String) {}
}

class InMemoryMemoryPersistence(private val facts: MutableList<MemoryFact> = mutableListOf()) : MemoryPersistence {
    override fun loadFacts(): List<MemoryFact> = facts.toList()
    override fun saveFact(fact: MemoryFact) {
        facts.removeAll { it.key == fact.key }
        facts += fact
    }
    override fun deleteFact(key: String) { facts.removeAll { it.key == key } }
}

class MemoryStore(private val persistence: MemoryPersistence = InMemoryMemoryPersistence()) {
    private val session = mutableListOf<ChatMessage>()
    private val facts = mutableListOf<MemoryFact>()

    init { runCatching { facts += persistence.loadFacts() } }

    @Synchronized
    fun appendMessage(message: ChatMessage) { session += message }

    @Synchronized
    fun saveFact(key: String, value: String): Boolean {
        if (key.isBlank() || value.isBlank()) return false
        val fact = MemoryFact(key.trim(), value.trim())
        return runCatching {
            persistence.saveFact(fact)
            facts.removeAll { it.key == fact.key }
            facts += fact
        }.isSuccess
    }

    @Synchronized
    fun removeFact(key: String): Boolean {
        val normalized = key.trim()
        if (normalized.isBlank()) return false
        return runCatching {
            persistence.deleteFact(normalized)
            facts.removeAll { it.key == normalized }
        }.isSuccess
    }

    @Synchronized
    fun listFacts(): List<MemoryFact> = facts.toList()

    @Synchronized
    fun searchFacts(query: String): List<MemoryFact> {
        val normalized = query.trim().lowercase()
        if (normalized.isBlank()) return facts.toList()
        return facts.filter {
            it.key.lowercase().contains(normalized) || it.value.lowercase().contains(normalized)
        }
    }

    @Synchronized
    fun appendSession(messages: Iterable<ChatMessage>) { session += messages }

    @Synchronized
    fun buildContext(budget: Int): List<ChatMessage> {
        if (budget <= 0) return emptyList()
        var remaining = budget
        val result = mutableListOf<ChatMessage>()
        facts.forEach { fact ->
            val message = ChatMessage(role = MessageRole.SYSTEM, text = "Память: " + fact.key + " = " + fact.value)
            val cost = estimate(message)
            if (cost <= remaining) {
                result += message
                remaining -= cost
            }
        }
        session.asReversed().forEach { message ->
            val cost = estimate(message)
            if (cost <= remaining) {
                result.add(0, message)
                remaining -= cost
            }
        }
        return result
    }

    fun clearSession() = synchronized(this) { session.clear() }
    @Synchronized fun sessionSnapshot(): List<ChatMessage> = session.toList()
    @Synchronized fun restoreSession(messages: List<ChatMessage>) {
        session.clear()
        session += messages
    }

    private fun estimate(message: ChatMessage): Int = message.text.length / 4 + 1
}
