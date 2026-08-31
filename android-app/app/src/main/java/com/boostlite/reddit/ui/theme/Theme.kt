package com.boostlite.reddit.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BoostDarkColors = darkColorScheme(
    primary = BoostOrange,
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = BoostOrangeDark,
    background = Background,
    onBackground = OnBackground,
    surface = Surface,
    onSurface = OnBackground,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = OnSurfaceMuted,
    outline = Divider,
)

@Composable
fun BoostLiteTheme(
    content: @Composable () -> Unit,
) {
    // Prototype is dark-only to match Boost's default night feel.
    MaterialTheme(
        colorScheme = BoostDarkColors,
        typography = BoostTypography,
        content = content,
    )
}
