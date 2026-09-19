package com.neuroassistant.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity

/** Launcher entry opens the full chat; Android assistant entry opens the quick overlay. */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val startVoice = intent.getBooleanExtra(EXTRA_START_VOICE, false)
        val destination = AssistantEntryRouter.destinationFor(intent.action, startVoice)
        val target = when (destination) {
            AssistantEntryDestination.FULL_CHAT -> LocalModelsActivity::class.java
            AssistantEntryDestination.QUICK_OVERLAY -> AssistantOverlayActivity::class.java
        }
        startActivity(
            Intent(this, target)
                .putExtra(EXTRA_START_VOICE, startVoice || destination == AssistantEntryDestination.QUICK_OVERLAY)
                .putExtra(EXTRA_BACKGROUND_ACTIVE, intent.getBooleanExtra(EXTRA_BACKGROUND_ACTIVE, false))
        )
        finish()
    }

    companion object {
        const val EXTRA_START_VOICE = "com.neuroassistant.app.START_VOICE"
        const val EXTRA_BACKGROUND_ACTIVE = "com.neuroassistant.app.BACKGROUND_ACTIVE"
    }
}
