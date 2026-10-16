package com.neuroassistant.app.memory

import java.io.File

class FileMemoryPersistence(private val file: File) : MemoryPersistence {
    override fun loadFacts(): List<MemoryFact> {
        if (!file.exists()) return emptyList()
        return runCatching {
            file.readLines(Charsets.UTF_8).mapNotNull { line ->
                val parts = line.split('\t', limit = 2)
                if (parts.size != 2) null else MemoryFact(unescape(parts[0]), unescape(parts[1]))
            }
        }.getOrDefault(emptyList())
    }

    @Synchronized
    override fun saveFact(fact: MemoryFact) {
        val facts = loadFacts().toMutableList()
        facts.removeAll { it.key == fact.key }
        facts += fact
        write(facts)
    }

    @Synchronized
    override fun deleteFact(key: String) {
        write(loadFacts().filterNot { it.key == key })
    }

    private fun write(facts: List<MemoryFact>) {
        file.parentFile?.mkdirs()
        val tmp = File(file.absolutePath + ".tmp")
        tmp.writeText(facts.joinToString("\n") { escape(it.key) + "\t" + escape(it.value) }, Charsets.UTF_8)
        if (!tmp.renameTo(file)) {
            tmp.copyTo(file, overwrite = true)
            tmp.delete()
        }
    }

    private fun escape(value: String): String =
        value.replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n")

    private fun unescape(value: String): String =
        value.replace("\\n", "\n").replace("\\t", "\t").replace("\\\\", "\\")
}
