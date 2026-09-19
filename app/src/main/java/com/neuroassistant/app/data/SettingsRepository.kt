package com.neuroassistant.app.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec

enum class ProviderMode { LOCAL_DEMO, OPENAI_COMPATIBLE }

data class AssistantSettings(
    val providerMode: ProviderMode = ProviderMode.LOCAL_DEMO,
    val baseUrl: String = "https://api.openai.com/v1",
    val model: String = "gpt-5-mini",
    val apiKey: String = "",
    val autoSpeak: Boolean = false,
    val speechVolume: Float = 1f,
    val speechRate: Float = 1f
)

class SettingsRepository(context: Context) {
    private val prefs = context.getSharedPreferences("neuroassistant_settings", Context.MODE_PRIVATE)
    private val alias = "neuroassistant_api_key_v1"

    private fun secretKey(): java.security.Key {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        store.getKey(alias, null)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }

    private fun encrypt(value: String): String {
        if (value.isBlank()) return ""
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, secretKey()) }
        return Base64.encodeToString(cipher.iv + cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
    }

    private fun decrypt(value: String): String = runCatching {
        if (value.isBlank()) return ""
        val bytes = Base64.decode(value, Base64.DEFAULT)
        require(bytes.size > 12)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
        }
        String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8)
    }.getOrDefault("")

    fun load(): AssistantSettings {
        // Migrate keys saved by older releases without leaving the plaintext copy behind.
        val oldKey = prefs.getString("apiKey", "").orEmpty()
        if (oldKey.isNotEmpty()) prefs.edit().putString("encryptedApiKey", encrypt(oldKey)).remove("apiKey").commit()
        return AssistantSettings(
        providerMode = runCatching {
            ProviderMode.valueOf(prefs.getString("providerMode", ProviderMode.LOCAL_DEMO.name)!!)
        }.getOrDefault(ProviderMode.LOCAL_DEMO),
        baseUrl = prefs.getString("baseUrl", "https://api.openai.com/v1") ?: "https://api.openai.com/v1",
        model = prefs.getString("model", "gpt-5-mini") ?: "gpt-5-mini",
        apiKey = decrypt(prefs.getString("encryptedApiKey", "").orEmpty()),
        autoSpeak = prefs.getBoolean("autoSpeak", false),
        speechVolume = prefs.getFloat("speechVolume", 1f).coerceIn(0f, 1f),
        speechRate = prefs.getFloat("speechRate", 1f).coerceIn(.65f, 1.35f)
    )
    }

    fun save(settings: AssistantSettings) {
        prefs.edit()
            .putString("providerMode", settings.providerMode.name)
            .putString("baseUrl", settings.baseUrl.trim())
            .putString("model", settings.model.trim())
            .putString("encryptedApiKey", encrypt(settings.apiKey.trim()))
            .remove("apiKey")
            .putBoolean("autoSpeak", settings.autoSpeak)
            .putFloat("speechVolume", settings.speechVolume.coerceIn(0f, 1f))
            .putFloat("speechRate", settings.speechRate.coerceIn(.65f, 1.35f))
            .apply()
    }

    fun saveAudioPreferences(autoSpeak: Boolean, speechVolume: Float, speechRate: Float) {
        prefs.edit()
            .putBoolean("autoSpeak", autoSpeak)
            .putFloat("speechVolume", speechVolume.coerceIn(0f, 1f))
            .putFloat("speechRate", speechRate.coerceIn(.65f, 1.35f))
            .apply()
    }
}
