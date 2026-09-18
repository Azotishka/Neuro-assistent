package com.neuroassistant.app.data

import android.content.Context

enum class ProviderMode { LOCAL_DEMO, OPENAI_COMPATIBLE }

data class AssistantSettings(
    val providerMode: ProviderMode = ProviderMode.LOCAL_DEMO,
    val baseUrl: String = "https://api.openai.com/v1",
    val model: String = "gpt-5-mini",
    val apiKey: String = "",
    val autoSpeak: Boolean = false
)

class SettingsRepository(context: Context) {
    private val prefs = context.getSharedPreferences("neuroassistant_settings", Context.MODE_PRIVATE)

    fun load(): AssistantSettings = AssistantSettings(
        providerMode = runCatching {
            ProviderMode.valueOf(prefs.getString("providerMode", ProviderMode.LOCAL_DEMO.name)!!)
        }.getOrDefault(ProviderMode.LOCAL_DEMO),
        baseUrl = prefs.getString("baseUrl", "https://api.openai.com/v1") ?: "https://api.openai.com/v1",
        model = prefs.getString("model", "gpt-5-mini") ?: "gpt-5-mini",
        apiKey = prefs.getString("apiKey", "") ?: "",
        autoSpeak = prefs.getBoolean("autoSpeak", false)
    )

    fun save(settings: AssistantSettings) {
        prefs.edit()
            .putString("providerMode", settings.providerMode.name)
            .putString("baseUrl", settings.baseUrl.trim())
            .putString("model", settings.model.trim())
            .putString("apiKey", settings.apiKey.trim())
            .putBoolean("autoSpeak", settings.autoSpeak)
            .apply()
    }
}
