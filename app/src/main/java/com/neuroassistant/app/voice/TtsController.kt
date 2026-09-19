package com.neuroassistant.app.voice

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import java.util.Locale

class TtsController(context: Context) : TextToSpeech.OnInitListener {
    private val tts = TextToSpeech(context.applicationContext, this)
    private var ready = false

    override fun onInit(status: Int) {
        ready = status == TextToSpeech.SUCCESS
        if (ready) tts.language = Locale.getDefault()
    }

    fun speak(text: String, volume: Float = 1f, rate: Float = 1f) {
        if (!ready || text.isBlank()) return
        tts.setSpeechRate(rate.coerceIn(.65f, 1.35f))
        val params = Bundle().apply {
            putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume.coerceIn(0f, 1f))
        }
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, "neuroassistant_reply")
    }

    fun stop() { if (ready) tts.stop() }
    fun shutdown() { tts.stop(); tts.shutdown(); ready = false }
}
