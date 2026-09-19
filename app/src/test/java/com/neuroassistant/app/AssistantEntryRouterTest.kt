package com.neuroassistant.app

import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Test

class AssistantEntryRouterTest {
    @Test fun launcherOpensFullChat() {
        assertEquals(AssistantEntryDestination.FULL_CHAT, AssistantEntryRouter.destinationFor(Intent.ACTION_MAIN, false))
    }

    @Test fun assistActionOpensQuickOverlay() {
        assertEquals(AssistantEntryDestination.QUICK_OVERLAY, AssistantEntryRouter.destinationFor(Intent.ACTION_ASSIST, false))
    }

    @Test fun voiceAssistActionOpensQuickOverlay() {
        assertEquals(AssistantEntryDestination.QUICK_OVERLAY, AssistantEntryRouter.destinationFor(AssistantEntryRouter.ACTION_VOICE_ASSIST, false))
    }

    @Test fun explicitVoiceExtraOpensQuickOverlay() {
        assertEquals(AssistantEntryDestination.QUICK_OVERLAY, AssistantEntryRouter.destinationFor(Intent.ACTION_MAIN, true))
    }
}
