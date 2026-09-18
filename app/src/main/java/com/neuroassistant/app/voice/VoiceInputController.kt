package com.neuroassistant.app.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import java.util.Locale

class VoiceInputController(
    private val context: Context,
    private val onState: (Boolean) -> Unit,
    private val onText: (String) -> Unit,
    private val onError: (String) -> Unit
) {
    private var recognizer: SpeechRecognizer? = null
    private var listening = false

    fun start() {
        if (listening) return
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            onError("Распознавание речи недоступно на этом устройстве.")
            return
        }
        if (recognizer == null) recognizer = createRecognizer()
        listening = true
        onState(true)
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
        }
        runCatching { recognizer?.startListening(intent) }
            .onFailure {
                listening = false
                onState(false)
                onError("Не удалось запустить микрофон: ${it.message ?: "ошибка"}")
            }
    }

    fun stop() {
        if (!listening) return
        runCatching { recognizer?.stopListening() }
        listening = false
        onState(false)
    }

    fun destroy() {
        runCatching { recognizer?.cancel() }
        runCatching { recognizer?.destroy() }
        recognizer = null
        listening = false
        onState(false)
    }

    private fun createRecognizer(): SpeechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).also { sr ->
        sr.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) = Unit
            override fun onBeginningOfSpeech() = Unit
            override fun onRmsChanged(rmsdB: Float) = Unit
            override fun onBufferReceived(buffer: ByteArray?) = Unit
            override fun onEndOfSpeech() { listening = false; onState(false) }
            override fun onError(error: Int) {
                listening = false
                onState(false)
                if (error != SpeechRecognizer.ERROR_CLIENT && error != SpeechRecognizer.ERROR_NO_MATCH) {
                    onError("Ошибка распознавания речи ($error).")
                }
            }
            override fun onResults(results: Bundle?) {
                listening = false
                onState(false)
                results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.trim()?.takeIf { it.isNotBlank() }?.let(onText)
            }
            override fun onPartialResults(partialResults: Bundle?) = Unit
            override fun onEvent(eventType: Int, params: Bundle?) = Unit
        })
    }
}
