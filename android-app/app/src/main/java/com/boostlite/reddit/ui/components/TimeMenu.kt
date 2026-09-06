package com.boostlite.reddit.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.boostlite.reddit.data.model.SearchTime

@Composable
fun TimeMenu(
    current: SearchTime,
    onSelect: (SearchTime) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        FilterChip(
            selected = true,
            onClick = { expanded = true },
            label = { Text(current.label) },
            trailingIcon = {
                Icon(Icons.Filled.ArrowDropDown, contentDescription = "Time range")
            },
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            SearchTime.entries.forEach { t ->
                DropdownMenuItem(
                    text = { Text(t.label) },
                    onClick = {
                        onSelect(t)
                        expanded = false
                    },
                )
            }
        }
    }
}
