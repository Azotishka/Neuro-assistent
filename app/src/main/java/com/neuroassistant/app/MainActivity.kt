package com.neuroassistant.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity

/** Launcher and Android assistant entry point share the same conversation screen. */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startActivity(Intent(this, LocalModelsActivity::class.java)
            .putExtra(EXTRA_START_VOICE, intent.getBooleanExtra(EXTRA_START_VOICE, false) || intent.action == Intent.ACTION_ASSIST))
        finish()
    }

    companion object {
        const val EXTRA_START_VOICE = "com.neuroassistant.app.START_VOICE"
    }
}
