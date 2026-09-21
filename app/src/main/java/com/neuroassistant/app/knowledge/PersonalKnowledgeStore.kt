package com.neuroassistant.app.knowledge

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

/** Private, offline, bounded lexical retrieval. No network or model training is performed. */
class PersonalKnowledgeStore(context: Context) {
    private val root = File(context.filesDir, "personal_knowledge").apply { mkdirs() }
    private val index = File(root, "index.json")
    private val lock = Any()

    data class Entry(val id: String, val source: String, val text: String, val memory: Boolean)
    private fun read(): MutableList<Entry> = synchronized(lock) {
        if (!index.exists()) return@synchronized mutableListOf()
        val array = JSONArray(index.readText(Charsets.UTF_8))
        (0 until array.length()).map { i ->
            val o = array.getJSONObject(i)
            Entry(o.getString("id"), o.getString("source"), o.getString("text"), o.getBoolean("memory"))
        }.toMutableList()
    }
    private fun write(entries: List<Entry>) {
        val data = JSONArray()
        entries.forEach { e ->
            data.put(JSONObject().put("id", e.id).put("source", e.source)
                .put("text", e.text).put("memory", e.memory))
        }
        val temp = File(root, "index.tmp")
        temp.writeText(data.toString(), Charsets.UTF_8)
        check(temp.renameTo(index)) { "Не удалось сохранить базу знаний" }
    }
    fun add(source: String, text: String, memory: Boolean = false): Int = synchronized(lock) {
        require(source.isNotBlank() && source.length <= 160)
        require(text.length <= 2_000_000) { "Документ слишком большой" }
        val entries = read()
        require(entries.size < 10_000) { "Локальная база заполнена" }
        val chunks = if (memory) listOf(text.trim()) else text.chunked(900)
        chunks.filter { it.isNotBlank() }.forEach { chunk ->
            require(entries.size < 10_000) { "Локальная база заполнена" }
            entries += Entry(UUID.randomUUID().toString(), source, chunk, memory)
        }
        write(entries)
        chunks.count { it.isNotBlank() }
    }
    fun all(): List<Entry> = synchronized(lock) { read() }
    fun delete(id: String): Boolean = synchronized(lock) {
        val entries = read()
        val changed = entries.removeAll { it.id == id }
        if (changed) write(entries)
        changed
    }
    fun clear() = synchronized(lock) { write(emptyList()) }

    fun retrieve(query: String, maxChars: Int = 3500): String = synchronized(lock) {
        val terms = tokenize(query).toSet()
        if (terms.isEmpty()) return@synchronized ""
        read().map { entry ->
            val words = tokenize(entry.text).toSet()
            entry to terms.count { it in words }
        }.filter { it.second > 0 }
            .sortedWith(compareByDescending<Pair<Entry, Int>> { it.second }.thenBy { it.first.id })
            .take(5)
            .joinToString("\n\n") { (entry, _) ->
                "[Источник: ${entry.source}; id: ${entry.id}]\n${entry.text}"
            }.take(maxChars.coerceIn(0, 6000))
    }

    fun exportTrainingJsonl(): String = synchronized(lock) {
        // This is a dataset draft, NOT an on-device LoRA trainer.
        read().filter { it.memory }.joinToString("\n") { e ->
            JSONObject().put("messages", JSONArray()
                .put(JSONObject().put("role", "user").put("content", "Что ты помнишь об источнике ${e.source}?"))
                .put(JSONObject().put("role", "assistant").put("content", e.text))).toString()
        }
    }
    companion object {
        fun tokenize(text: String): List<String> =
            Regex("[\\p{L}\\p{N}]{3,}").findAll(text.lowercase()).map { it.value }.toList()
    }
}
