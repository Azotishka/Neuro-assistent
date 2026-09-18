package com.neuroassistant.app.data

import android.content.Context
import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.Conversation
import com.neuroassistant.app.model.MessageRole
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class ChatRepository(context: Context) {
    private val prefs = context.getSharedPreferences("neuroassistant_chat_v2", Context.MODE_PRIVATE)
    private val legacyPrefs = context.getSharedPreferences("neuroassistant_chat", Context.MODE_PRIVATE)

    fun loadConversations(): List<Conversation> {
        val raw = prefs.getString(KEY_CONVERSATIONS, null) ?: return migrateLegacy()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) add(parseConversation(array.getJSONObject(i)))
            }.sortedByDescending { it.updatedAt }
        }.getOrDefault(emptyList())
    }

    fun saveConversation(conversation: Conversation) {
        val all = loadConversations().toMutableList()
        val index = all.indexOfFirst { it.id == conversation.id }
        if (index >= 0) all[index] = conversation else all.add(conversation)
        saveAll(all.sortedByDescending { it.updatedAt }.take(MAX_CONVERSATIONS))
    }

    fun deleteConversation(id: String): List<Conversation> {
        val updated = loadConversations().filterNot { it.id == id }
        saveAll(updated)
        return updated
    }

    fun newConversation(): Conversation = Conversation(
        id = UUID.randomUUID().toString(),
        title = "Новый чат",
        messages = listOf(
            ChatMessage(
                role = MessageRole.ASSISTANT,
                text = "Привет! Я NeuroAssistant. Могу отвечать, выполнять системные команды Android и работать голосом."
            )
        )
    )

    private fun migrateLegacy(): List<Conversation> {
        val raw = legacyPrefs.getString("messages", null) ?: return emptyList()
        val messages = runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    add(
                        ChatMessage(
                            id = item.optString("id").ifBlank { UUID.randomUUID().toString() },
                            role = runCatching { MessageRole.valueOf(item.optString("role")) }.getOrDefault(MessageRole.ASSISTANT),
                            text = item.optString("text"),
                            timestamp = item.optLong("timestamp", System.currentTimeMillis())
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
        if (messages.isEmpty()) return emptyList()
        val title = messages.firstOrNull { it.role == MessageRole.USER }?.text?.replace('\n', ' ')?.take(34) ?: "Старый чат"
        val chat = Conversation(title = title, updatedAt = messages.maxOfOrNull { it.timestamp } ?: System.currentTimeMillis(), messages = messages)
        saveAll(listOf(chat))
        return listOf(chat)
    }

    private fun saveAll(items: List<Conversation>) {
        val array = JSONArray()
        items.forEach { conversation ->
            val messages = JSONArray()
            conversation.messages.takeLast(MAX_MESSAGES_PER_CHAT).forEach { message ->
                messages.put(
                    JSONObject()
                        .put("id", message.id)
                        .put("role", message.role.name)
                        .put("text", message.text)
                        .put("timestamp", message.timestamp)
                )
            }
            array.put(
                JSONObject()
                    .put("id", conversation.id)
                    .put("title", conversation.title)
                    .put("updatedAt", conversation.updatedAt)
                    .put("messages", messages)
            )
        }
        prefs.edit().putString(KEY_CONVERSATIONS, array.toString()).apply()
    }

    private fun parseConversation(obj: JSONObject): Conversation {
        val messagesJson = obj.optJSONArray("messages") ?: JSONArray()
        val messages = buildList {
            for (i in 0 until messagesJson.length()) {
                val item = messagesJson.getJSONObject(i)
                add(
                    ChatMessage(
                        id = item.optString("id").ifBlank { UUID.randomUUID().toString() },
                        role = runCatching { MessageRole.valueOf(item.optString("role")) }
                            .getOrDefault(MessageRole.ASSISTANT),
                        text = item.optString("text"),
                        timestamp = item.optLong("timestamp", System.currentTimeMillis())
                    )
                )
            }
        }
        return Conversation(
            id = obj.optString("id").ifBlank { UUID.randomUUID().toString() },
            title = obj.optString("title", "Чат"),
            updatedAt = obj.optLong("updatedAt", System.currentTimeMillis()),
            messages = messages
        )
    }

    companion object {
        private const val KEY_CONVERSATIONS = "conversations"
        private const val MAX_CONVERSATIONS = 30
        private const val MAX_MESSAGES_PER_CHAT = 200
    }
}
