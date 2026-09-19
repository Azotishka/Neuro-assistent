package com.neuroassistant.app

import android.content.Intent

enum class AssistantEntryDestination { FULL_CHAT, QUICK_OVERLAY }

object AssistantEntryRouter {
    const val ACTION_VOICE_ASSIST = "android.intent.action.VOICE_ASSIST"

    fun destinationFor(action: String?, startVoice: Boolean): AssistantEntryDestination =
        if (startVoice || action == Intent.ACTION_ASSIST || action == ACTION_VOICE_ASSIST) {
            AssistantEntryDestination.QUICK_OVERLAY
        } else {
            AssistantEntryDestination.FULL_CHAT
        }
}
