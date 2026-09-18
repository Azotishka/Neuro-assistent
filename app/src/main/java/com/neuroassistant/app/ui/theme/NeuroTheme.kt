package com.neuroassistant.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val NeuroDarkColors = darkColorScheme(
    primary = Color(0xFF7BE7FF),
    onPrimary = Color(0xFF002A33),
    secondary = Color(0xFFB9C7FF),
    tertiary = Color(0xFFB5F4D6),
    background = Color(0xFF090B10),
    onBackground = Color(0xFFF2F5FA),
    surface = Color(0xFF11151D),
    onSurface = Color(0xFFF2F5FA),
    surfaceVariant = Color(0xFF1A202B),
    onSurfaceVariant = Color(0xFFC6CEDA),
    outline = Color(0xFF3A4351)
)

@Composable
fun NeuroAssistantTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = NeuroDarkColors,
        typography = MaterialTheme.typography,
        content = content
    )
}
