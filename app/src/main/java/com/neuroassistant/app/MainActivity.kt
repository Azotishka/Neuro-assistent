package com.neuroassistant.app

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.neuroassistant.app.ai.LocalDemoAiProvider
import com.neuroassistant.app.ai.OpenAiCompatibleProvider
import com.neuroassistant.app.data.*
import com.neuroassistant.app.model.*
import com.neuroassistant.app.system.AndroidActionHandler
import com.neuroassistant.app.system.AssistantRoleHelper
import com.neuroassistant.app.ui.theme.NeuroAssistantTheme
import com.neuroassistant.app.voice.TtsController
import com.neuroassistant.app.voice.VoiceInputController
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val assistantVoiceLaunch = mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        assistantVoiceLaunch.value = shouldStartVoice(intent)
        setContent {
            NeuroAssistantTheme {
                NeuroAssistantApp(
                    voiceLaunchRequested = assistantVoiceLaunch.value,
                    consumeVoiceLaunch = { assistantVoiceLaunch.value = false }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (shouldStartVoice(intent)) assistantVoiceLaunch.value = true
    }

    private fun shouldStartVoice(intent: Intent?): Boolean =
        intent?.getBooleanExtra(EXTRA_START_VOICE, false) == true || intent?.action == Intent.ACTION_ASSIST

    companion object {
        const val EXTRA_START_VOICE = "com.neuroassistant.app.START_VOICE"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NeuroAssistantApp(
    voiceLaunchRequested: Boolean,
    consumeVoiceLaunch: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val repo = remember { ChatRepository(context.applicationContext) }
    val settingsRepo = remember { SettingsRepository(context.applicationContext) }
    val actionHandler = remember { AndroidActionHandler(context.applicationContext) }
    val tts = remember { TtsController(context.applicationContext) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    var settings by remember { mutableStateOf(settingsRepo.load()) }
    var conversations by remember { mutableStateOf(repo.loadConversations()) }
    var current by remember {
        mutableStateOf(conversations.firstOrNull() ?: repo.newConversation().also(repo::saveConversation))
    }
    var input by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var listening by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }
    var showSettings by remember { mutableStateOf(false) }
    var showHistory by remember { mutableStateOf(false) }
    var requestJob by remember { mutableStateOf<Job?>(null) }
    var roleHeld by remember { mutableStateOf(AssistantRoleHelper.isAssistant(context)) }

    val provider = remember(settings) {
        when (settings.providerMode) {
            ProviderMode.LOCAL_DEMO -> LocalDemoAiProvider()
            ProviderMode.OPENAI_COMPATIBLE -> OpenAiCompatibleProvider(settings)
        }
    }

    fun refresh() {
        conversations = repo.loadConversations()
    }

    fun persist(chat: Conversation) {
        current = chat
        repo.saveConversation(chat)
        refresh()
    }

    val voiceController = remember {
        VoiceInputController(
            context.applicationContext,
            onState = { listening = it },
            onText = { input = it },
            onError = { status = it }
        )
    }

    val micPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) voiceController.start() else status = "Нужен доступ к микрофону."
    }

    fun startVoice() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            voiceController.start()
        } else micPermission.launch(Manifest.permission.RECORD_AUDIO)
    }

    val roleLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        roleHeld = AssistantRoleHelper.isAssistant(context)
        status = if (roleHeld) "NeuroAssistant назначен системным ассистентом." else "Роль ассистента не назначена."
    }

    fun send() {
        val text = input.trim()
        if (text.isBlank() || sending) return
        input = ""
        val user = ChatMessage(role = MessageRole.USER, text = text)
        val title = if (current.title == "Новый чат") text.replace('\n', ' ').take(34) else current.title
        val withUser = current.copy(
            title = title,
            updatedAt = System.currentTimeMillis(),
            messages = current.messages + user
        )
        persist(withUser)

        requestJob = scope.launch {
            sending = true
            try {
                val action = actionHandler.tryHandle(text)
                val answer = if (action.handled) action.reply else provider.reply(withUser.messages)
                val updated = withUser.copy(
                    updatedAt = System.currentTimeMillis(),
                    messages = withUser.messages + ChatMessage(role = MessageRole.ASSISTANT, text = answer)
                )
                persist(updated)
                if (settings.autoSpeak) tts.speak(answer)
            } catch (_: CancellationException) {
                status = "Запрос отменён."
            } catch (e: Exception) {
                val message = e.message?.takeIf { it.isNotBlank() } ?: "Неизвестная ошибка"
                persist(withUser.copy(
                    updatedAt = System.currentTimeMillis(),
                    messages = withUser.messages + ChatMessage(role = MessageRole.ASSISTANT, text = "Ошибка: $message")
                ))
            } finally {
                sending = false
                requestJob = null
            }
        }
    }

    fun newChat() {
        requestJob?.cancel()
        current = repo.newConversation().also(repo::saveConversation)
        refresh()
        input = ""
        showHistory = false
    }

    LaunchedEffect(current.messages.size) {
        if (current.messages.isNotEmpty()) listState.animateScrollToItem(current.messages.lastIndex)
    }

    LaunchedEffect(voiceLaunchRequested) {
        if (voiceLaunchRequested) {
            consumeVoiceLaunch()
            startVoice()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            requestJob?.cancel()
            voiceController.destroy()
            tts.shutdown()
        }
    }

    if (showSettings) {
        SettingsDialog(
            initial = settings,
            roleHeld = roleHeld,
            onDismiss = { showSettings = false },
            onRequestAssistant = { roleLauncher.launch(AssistantRoleHelper.requestIntent(context)) },
            onSave = {
                settingsRepo.save(it)
                settings = it
                showSettings = false
            }
        )
    }

    if (showHistory) {
        AlertDialog(
            onDismissRequest = { showHistory = false },
            title = { Text("История чатов") },
            text = {
                Column {
                    Button(onClick = ::newChat, modifier = Modifier.fillMaxWidth()) { Text("＋ Новый чат") }
                    Spacer(Modifier.height(8.dp))
                    LazyColumn(Modifier.heightIn(max = 420.dp)) {
                        items(conversations, key = { it.id }) { chat ->
                            Row(
                                Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                TextButton(
                                    onClick = { current = chat; showHistory = false },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text(chat.title, maxLines = 1)
                                }
                                TextButton(onClick = {
                                    val remaining = repo.deleteConversation(chat.id)
                                    conversations = remaining
                                    if (chat.id == current.id) {
                                        current = remaining.firstOrNull() ?: repo.newConversation().also(repo::saveConversation)
                                        refresh()
                                    }
                                }) { Text("Удалить") }
                            }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showHistory = false }) { Text("Закрыть") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("NeuroAssistant")
                        Text(
                            if (roleHeld) "Системный ассистент • ${provider.displayName}" else provider.displayName,
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                },
                actions = {
                    TextButton(onClick = { context.startActivity(Intent(context, LocalModelsActivity::class.java)) }) { Text("Локальный ИИ") }
                    TextButton(onClick = { showHistory = true }) { Text("Чаты") }
                    TextButton(onClick = { showSettings = true }) { Text("⚙") }
                }
            )
        },
        bottomBar = {
            Surface {
                Row(
                    Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(10.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    TextButton(onClick = { if (listening) voiceController.stop() else startVoice() }) {
                        Text(if (listening) "■" else "🎙")
                    }
                    OutlinedTextField(
                        value = input,
                        onValueChange = { input = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Сообщение или команда…") },
                        maxLines = 4
                    )
                    Spacer(Modifier.width(6.dp))
                    Button(
                        onClick = { if (sending) requestJob?.cancel() else send() },
                        enabled = sending || input.isNotBlank()
                    ) { Text(if (sending) "■" else "➤") }
                }
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (!roleHeld) {
                AssistChip(
                    onClick = { roleLauncher.launch(AssistantRoleHelper.requestIntent(context)) },
                    label = { Text("Назначить системным ассистентом") },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
            }

            status?.let {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(it, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                    TextButton(onClick = { status = null }) { Text("OK") }
                }
            }

            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(current.messages, key = { it.id }) { message ->
                    val isUser = message.role == MessageRole.USER
                    Surface(
                        tonalElevation = 2.dp,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(if (isUser) "Вы" else "NeuroAssistant", style = MaterialTheme.typography.labelSmall)
                            Text(message.text)
                            Row {
                                TextButton(onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    clipboard.setPrimaryClip(ClipData.newPlainText("NeuroAssistant", message.text))
                                    status = "Скопировано."
                                }) { Text("Копировать") }
                                if (!isUser) TextButton(onClick = { tts.speak(message.text) }) { Text("Озвучить") }
                            }
                        }
                    }
                }
                if (sending) {
                    item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
                }
            }
        }
    }
}

@Composable
private fun SettingsDialog(
    initial: AssistantSettings,
    roleHeld: Boolean,
    onDismiss: () -> Unit,
    onRequestAssistant: () -> Unit,
    onSave: (AssistantSettings) -> Unit
) {
    var mode by remember { mutableStateOf(initial.providerMode) }
    var baseUrl by remember { mutableStateOf(initial.baseUrl) }
    var model by remember { mutableStateOf(initial.model) }
    var apiKey by remember { mutableStateOf(initial.apiKey) }
    var autoSpeak by remember { mutableStateOf(initial.autoSpeak) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Настройки") },
        text = {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(mode == ProviderMode.LOCAL_DEMO, onClick = { mode = ProviderMode.LOCAL_DEMO })
                    Text("Локальный демо")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(mode == ProviderMode.OPENAI_COMPATIBLE, onClick = { mode = ProviderMode.OPENAI_COMPATIBLE })
                    Text("OpenAI-compatible API")
                }
                if (mode == ProviderMode.OPENAI_COMPATIBLE) {
                    OutlinedTextField(baseUrl, { baseUrl = it }, label = { Text("Base URL") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(model, { model = it }, label = { Text("Модель") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(
                        apiKey,
                        { apiKey = it },
                        label = { Text("API key") },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Автоозвучивание", modifier = Modifier.weight(1f))
                    Switch(autoSpeak, onCheckedChange = { autoSpeak = it })
                }
                if (!roleHeld) {
                    Button(onClick = onRequestAssistant) { Text("Назначить ассистентом") }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSave(
                    initial.copy(
                        providerMode = mode,
                        baseUrl = baseUrl.trim(),
                        model = model.trim(),
                        apiKey = apiKey.trim(),
                        autoSpeak = autoSpeak
                    )
                )
            }) { Text("Сохранить") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена") } }
    )
}
