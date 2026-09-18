package com.neuroassistant.app.system

import java.util.Locale

enum class AndroidCommand {
    SETTINGS, WIFI, BLUETOOTH, CAMERA, BROWSER, YOUTUBE, MAPS, DIALER, APP_INFO, NONE
}

object CommandParser {
    fun parse(rawText: String): AndroidCommand {
        val text = rawText.lowercase(Locale.ROOT).trim().replace(Regex("\\s+"), " ").trimEnd('.', '!', '?').trim().removeSuffix(" пожалуйста").trim()
        return when {
            has(text, "открой настройки приложения", "информация о приложении", "настройки приложения") -> AndroidCommand.APP_INFO
            has(text, "открой настройки", "открыть настройки") -> AndroidCommand.SETTINGS
            has(text, "открой wifi", "открой wi-fi", "открой вайфай", "настройки wifi", "настройки wi-fi") -> AndroidCommand.WIFI
            has(text, "открой bluetooth", "открой блютуз", "настройки bluetooth") -> AndroidCommand.BLUETOOTH
            has(text, "открой камеру", "запусти камеру") -> AndroidCommand.CAMERA
            has(text, "открой youtube", "открой ютуб", "запусти youtube", "запусти ютуб") -> AndroidCommand.YOUTUBE
            has(text, "открой карты", "открой maps", "запусти карты") -> AndroidCommand.MAPS
            has(text, "открой телефон", "открой звонилку", "позвонить") -> AndroidCommand.DIALER
            has(text, "открой браузер", "запусти браузер", "открой интернет") -> AndroidCommand.BROWSER
            else -> AndroidCommand.NONE
        }
    }

    private fun has(text: String, vararg variants: String) = variants.any { it == text }
}
