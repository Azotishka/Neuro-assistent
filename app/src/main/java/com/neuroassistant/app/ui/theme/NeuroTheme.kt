package com.neuroassistant.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Shared newspaper-like palette used by the WebView chat and the native overlay. */
private val NeuroPaperColors = lightColorScheme(
    primary = Color(0xFF111214),
    onPrimary = Color(0xFFF3F0E9),
    primaryContainer = Color(0xFFF0D94F),
    onPrimaryContainer = Color(0xFF111214),
    secondary = Color(0xFF3858E9),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFDCE3FF),
    onSecondaryContainer = Color(0xFF111214),
    tertiary = Color(0xFFF0642E),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFFE1D5),
    onTertiaryContainer = Color(0xFF351007),
    background = Color(0xFFF3F0E9),
    onBackground = Color(0xFF111214),
    surface = Color(0xFFFFFDF7),
    onSurface = Color(0xFF111214),
    surfaceVariant = Color(0xFFEBE6DB),
    onSurfaceVariant = Color(0xFF67635D),
    outline = Color(0xFF111214),
    error = Color(0xFFC83A31),
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD5),
    onErrorContainer = Color(0xFF410002)
)

@Composable
fun NeuroAssistantTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = NeuroPaperColors,
        typography = MaterialTheme.typography,
        content = content
    )
}
