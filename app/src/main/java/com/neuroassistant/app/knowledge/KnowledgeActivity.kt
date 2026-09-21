package com.neuroassistant.app.knowledge

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** First-stage offline knowledge editor: text notes, UTF-8 documents, memory, search and export. */
class KnowledgeActivity : ComponentActivity() {
    private val store by lazy { PersonalKnowledgeStore(this) }
    private var notice by mutableStateOf("")
    private var refresh by mutableIntStateOf(0)
    private val importText = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            runCatching {
                val bytes = contentResolver.openInputStream(uri)?.use { stream ->
                    stream.readNBytes(2_000_001)
                } ?: error("Файл не удалось открыть")
                require(bytes.size <= 2_000_000) { "Файл слишком большой (максимум 2 МБ)" }
                val name = uri.lastPathSegment?.takeLast(100) ?: "Документ"
                val count = store.add(name, bytes.toString(Charsets.UTF_8))
                notice = "Добавлено фрагментов: $count"
                refresh++
            }.onFailure { notice = it.message ?: "Ошибка импорта" }
        }
    }
    private val exportTraining = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) runCatching {
            contentResolver.openOutputStream(uri)?.use {
                it.write(store.exportTrainingJsonl().toByteArray(Charsets.UTF_8))
            } ?: error("Невозможно сохранить файл")
            notice = "Черновик датасета экспортирован"
        }.onFailure { notice = it.message ?: "Ошибка экспорта" }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var source by remember { mutableStateOf("Моя заметка") }
            var text by remember { mutableStateOf("") }
            var memory by remember { mutableStateOf(false) }
            var query by remember { mutableStateOf("") }
            val version = refresh
            val entries = remember(version) { store.all() }
            MaterialTheme {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Мои знания · офлайн", style = MaterialTheme.typography.headlineSmall)
                    Text("Данные хранятся только в памяти приложения. Удаление приложения удалит эту базу.")
                    OutlinedTextField(source, { source = it }, label = { Text("Источник") })
                    OutlinedTextField(text, { text = it }, label = { Text("Заметка или факт") },
                        modifier = Modifier.fillMaxWidth(), minLines = 3)
                    Row { Checkbox(memory, { memory = it }); Text("Сохранить как постоянную память") }
                    Button(onClick = {
                        runCatching { store.add(source, text, memory); text = ""; refresh++; notice = "Сохранено" }
                            .onFailure { notice = it.message ?: "Ошибка" }
                    }, enabled = text.isNotBlank()) { Text("Сохранить") }
                    OutlinedButton(onClick = { importText.launch(arrayOf("text/plain", "text/markdown", "application/json", "text/*")) }) {
                        Text("Импортировать текстовый файл")
                    }
                    OutlinedTextField(query, { query = it }, label = { Text("Поиск по знаниям") })
                    if (query.isNotBlank()) Text(store.retrieve(query).ifBlank { "Совпадений нет" })
                    Text("Записей: ${entries.size}")
                    entries.takeLast(30).asReversed().forEach { entry ->
                        Text("${entry.source}: ${entry.text.take(130)}")
                        TextButton(onClick = { store.delete(entry.id); refresh++ }) { Text("Удалить запись") }
                    }
                    OutlinedButton(onClick = { exportTraining.launch("neuroassistant-training.jsonl") }) {
                        Text("Экспортировать черновик датасета JSONL")
                    }
                    if (notice.isNotBlank()) Text(notice)
                }
            }
        }
    }
}
