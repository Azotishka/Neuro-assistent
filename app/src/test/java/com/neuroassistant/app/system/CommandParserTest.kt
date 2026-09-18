package com.neuroassistant.app.system

import org.junit.Assert.assertEquals
import org.junit.Test

class CommandParserTest {
    @Test fun parsesWifiVariants() {
        assertEquals(AndroidCommand.WIFI, CommandParser.parse("Открой Wi-Fi"))
        assertEquals(AndroidCommand.WIFI, CommandParser.parse("открой вайфай пожалуйста"))
    }

    @Test fun parsesAppInfoBeforeGenericSettings() {
        assertEquals(AndroidCommand.APP_INFO, CommandParser.parse("открой настройки приложения"))
    }

    @Test fun unknownTextIsNotSystemCommand() {
        assertEquals(AndroidCommand.NONE, CommandParser.parse("объясни квантовую физику"))
    }
}
