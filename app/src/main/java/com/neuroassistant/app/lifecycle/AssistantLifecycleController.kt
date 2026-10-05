package com.neuroassistant.app.lifecycle

import android.os.Bundle
import com.neuroassistant.app.memory.MemoryStore
import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import org.json.JSONArray
import org.json.JSONObject

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

    fun saveTo(bundle: Bundle, key: String = "neuroassistant.session") {
        bundle.putString(key, JSONArray().apply {
            snapshot().messages.forEach { message ->
                put(JSONObject().put("role", message.role.name).put("text", message.text).put("timestamp", message.timestamp))
            }
        }.toString())
    }

    fun restoreFrom(bundle: Bundle?, key: String = "neuroassistant.session") {
        val raw = bundle?.getString(key).orEmpty()
        if (raw.isBlank()) return
        val messages = runCatching {
            val json = JSONArray(raw)
            (0 until json.length()).mapNotNull { index ->
                val item = json.optJSONObject(index) ?: return@mapNotNull null
                val role = runCatching { MessageRole.valueOf(item.optString("role")) }.getOrNull() ?: return@mapNotNull null
                ChatMessage(role = role, text = item.optString("text"), timestamp = item.optLong("timestamp"))
            }
        }.getOrDefault(emptyList())
        restore(AssistantSessionSnapshot(messages))
    }

    fun isDegraded(memoryClass: String): Boolean =
        memoryClass.equals("constrained", ignoreCase = true)
}
