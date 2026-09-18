package com.neuroassistant.app.assistant

import android.content.Intent
import android.service.voice.VoiceInteractionService
import com.neuroassistant.app.MainActivity

class NeuroVoiceInteractionService : VoiceInteractionService() {
    override fun onLaunchVoiceAssistFromKeyguard() {
        launchAssistant()
    }

    private fun launchAssistant() {
        startActivity(
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra(MainActivity.EXTRA_START_VOICE, true)
        )
    }
}
