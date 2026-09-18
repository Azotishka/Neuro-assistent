package com.neuroassistant.app.system

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import android.provider.Settings

data class AndroidActionResult(val handled: Boolean, val reply: String = "")

class AndroidActionHandler(private val context: Context) {
    fun tryHandle(rawText: String): AndroidActionResult = when (CommandParser.parse(rawText)) {
        AndroidCommand.SETTINGS -> launch(Intent(Settings.ACTION_SETTINGS), "Открываю настройки Android.")
        AndroidCommand.WIFI -> launch(Intent(Settings.ACTION_WIFI_SETTINGS), "Открываю настройки Wi‑Fi.")
        AndroidCommand.BLUETOOTH -> launch(Intent(Settings.ACTION_BLUETOOTH_SETTINGS), "Открываю настройки Bluetooth.")
        AndroidCommand.CAMERA -> launch(Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA), "Открываю камеру.")
        AndroidCommand.BROWSER -> launch(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/")), "Открываю браузер.")
        AndroidCommand.YOUTUBE -> launchAppOrUrl("com.google.android.youtube", "https://www.youtube.com/", "Открываю YouTube.")
        AndroidCommand.MAPS -> launchAppOrUrl("com.google.android.apps.maps", "geo:0,0?q=", "Открываю карты.")
        AndroidCommand.DIALER -> launch(Intent(Intent.ACTION_DIAL), "Открываю телефон.")
        AndroidCommand.APP_INFO -> launch(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")),
            "Открываю настройки NeuroAssistant."
        )
        AndroidCommand.NONE -> AndroidActionResult(false)
    }

    private fun launchAppOrUrl(packageName: String, fallback: String, success: String): AndroidActionResult {
        val appIntent = context.packageManager.getLaunchIntentForPackage(packageName)
        return launch(appIntent ?: Intent(Intent.ACTION_VIEW, Uri.parse(fallback)), success)
    }

    private fun launch(intent: Intent, success: String): AndroidActionResult = runCatching {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        AndroidActionResult(true, success)
    }.getOrElse { AndroidActionResult(true, "Не получилось выполнить команду на этом устройстве.") }
}
