package com.neuroassistant.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.neuroassistant.app.ai.LocalDemoAiProvider
import com.neuroassistant.app.ai.OpenAiCompatibleProvider
import com.neuroassistant.app.data.SettingsRepository
import com.neuroassistant.app.model.ChatMessage
import com.neuroassistant.app.model.MessageRole
import com.neuroassistant.app.system.AndroidActionHandler
import com.neuroassistant.app.ui.theme.NeuroAssistantTheme
import com.neuroassistant.app.voice.TtsController
import com.neuroassistant.app.voice.VoiceInputController
import kotlinx.coroutines.launch

private data class QuickUiMessage(val role: MessageRole, val text: String)

class AssistantOverlayActivity : ComponentActivity() {
    private val settings by lazy { SettingsRepository(this) }
    private var tts: TtsController? = null
    private val messages = mutableStateListOf<QuickUiMessage>()
    private lateinit var voiceInput: VoiceInputController

    private var prompt by mutableStateOf("")
    private var listening by mutableStateOf(false)
    private var busy by mutableStateOf(false)
    private var status by mutableStateOf("Спроси голосом или текстом")

    private val micPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        if (allowed) voiceInput.start() else addAssistant("Разреши доступ к микрофону в настройках приложения, чтобы говорить голосом.")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        window.setDimAmount(0.34f)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        voiceInput = VoiceInputController(
            context = this,
            onState = { listening = it; status = if (it) "Слушаю…" else "Спроси голосом или текстом" },
            onText = { recognized -> prompt = recognized; submitPrompt(recognized) },
            onError = { addAssistant(it) }
        )

        if (messages.isEmpty()) {
            messages += QuickUiMessage(MessageRole.ASSISTANT, "Я здесь. Можешь сказать вопрос голосом или написать его, не открывая полный чат.")
        }

        setContent {
            NeuroAssistantTheme {
                QuickAssistantOverlay(
                    messages = messages,
                    prompt = prompt,
                    onPromptChange = { prompt = it },
                    status = when {
                        busy -> "Думаю…"
                        listening -> "Слушаю…"
                        else -> status
                    },
                    busy = busy,
                    listening = listening,
                    onMic = { if (listening) voiceInput.stop() else startListeningWithPermission() },
                    onSubmit = { submitPrompt(prompt) },
                    onOpenFull = { openFullChat() },
                    onClose = { finish() }
                )
            }
        }

        if (intent.getBooleanExtra(MainActivity.EXTRA_START_VOICE, false)) {
            window.decorView.postDelayed({ startListeningWithPermission() }, 350)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.getBooleanExtra(MainActivity.EXTRA_START_VOICE, false)) startListeningWithPermission()
    }

    private fun startListeningWithPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            voiceInput.start()
        } else {
            micPermission.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun submitPrompt(raw: String) {
        val clean = raw.trim()
        if (clean.isBlank() || busy) return
        prompt = ""
        messages += QuickUiMessage(MessageRole.USER, clean)
        busy = true
        status = "Думаю…"
        lifecycleScope.launch {
            val reply = runCatching { answer(clean) }
                .getOrElse { it.message?.take(320) ?: "Не удалось получить ответ." }
            addAssistant(reply)
            if (settings.load().autoSpeak) {
                if (tts == null) tts = TtsController(this@AssistantOverlayActivity)
                tts?.speak(reply.take(900))
            }
            busy = false
            status = "Готово"
        }
    }

    private suspend fun answer(text: String): String {
        val command = AndroidActionHandler(this).tryHandle(text)
        if (command.handled) return command.reply

        val currentSettings = settings.load()
        val provider = if (currentSettings.apiKey.isNotBlank()) {
            OpenAiCompatibleProvider(currentSettings)
        } else {
            LocalDemoAiProvider()
        }
        return provider.reply(
            messages.takeLast(16).map { ChatMessage(role = it.role, text = it.text.take(9000)) }
        )
    }

    private fun addAssistant(text: String) {
        messages += QuickUiMessage(MessageRole.ASSISTANT, text.ifBlank { "Пустой ответ." })
    }

    private fun openFullChat() {
        startActivity(Intent(this, LocalModelsActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        runCatching { voiceInput.destroy() }
        runCatching { tts?.shutdown() }
        super.onDestroy()
    }
}

@Composable
private fun QuickAssistantOverlay(
    messages: List<QuickUiMessage>,
    prompt: String,
    onPromptChange: (String) -> Unit,
    status: String,
    busy: Boolean,
    listening: Boolean,
    onMic: () -> Unit,
    onSubmit: () -> Unit,
    onOpenFull: () -> Unit,
    onClose: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.22f)),
        contentAlignment = Alignment.BottomCenter
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 14.dp, vertical = 16.dp)
                .heightIn(max = 560.dp),
            shape = RoundedCornerShape(30.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f),
            tonalElevation = 8.dp,
            shadowElevation = 16.dp
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(14.dp)
                            .clip(CircleShape)
                            .background(if (listening) Color(0xFF67F6A3) else MaterialTheme.colorScheme.primary)
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("NeuroAssistant Live", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Text(status, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    OutlinedButton(onClick = onClose, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)) { Text("×") }
                }

                Column(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    messages.takeLast(6).forEach { message ->
                        QuickBubble(message)
                    }
                    if (busy) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            Spacer(Modifier.width(10.dp))
                            Text("Готовлю ответ…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(onClick = onMic, label = { Text(if (listening) "Стоп" else "Голос") })
                    AssistChip(onClick = onOpenFull, label = { Text("Полный чат") })
                }

                OutlinedTextField(
                    value = prompt,
                    onValueChange = onPromptChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Напиши вопрос…") },
                    minLines = 1,
                    maxLines = 4,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { onSubmit() })
                )

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    FilledTonalButton(onClick = onMic, enabled = !busy, modifier = Modifier.weight(1f)) {
                        Text(if (listening) "Остановить" else "🎙 Говорить")
                    }
                    Button(onClick = onSubmit, enabled = prompt.isNotBlank() && !busy, modifier = Modifier.weight(1f)) {
                        Text("Спросить")
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickBubble(message: QuickUiMessage) {
    val user = message.role == MessageRole.USER
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (user) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            color = if (user) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
            shape = RoundedCornerShape(
                topStart = 20.dp,
                topEnd = 20.dp,
                bottomStart = if (user) 20.dp else 6.dp,
                bottomEnd = if (user) 6.dp else 20.dp
            ),
            modifier = Modifier.fillMaxWidth(if (user) 0.82f else 0.9f)
        ) {
            Text(
                text = message.text,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                color = if (user) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
