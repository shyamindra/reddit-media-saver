package com.boostlite.reddit.ui.screens.settings

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.boostlite.reddit.BoostLiteApp
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val app = BoostLiteApp.instance
    val cookieStore = app.cookieStore

    val cookieHeader by cookieStore.cookieHeader.collectAsStateWithLifecycle()
    val lastImported by cookieStore.lastImportedAt.collectAsStateWithLifecycle()

    var pasteText by remember { mutableStateOf("") }

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri != null) {
            val content = runCatching {
                context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
            }.getOrNull()
            if (content.isNullOrBlank()) {
                Toast.makeText(context, "Could not read file", Toast.LENGTH_SHORT).show()
            } else {
                val count = cookieStore.importRaw(content)
                Toast.makeText(context, "Imported $count cookies", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
                title = { Text("Session & cookies") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            StatusCard(
                hasSession = cookieStore.hasSession,
                cookieCount = if (cookieHeader.isBlank()) 0 else cookieHeader.split(';').size,
                lastImported = lastImported,
            )

            Spacer(Modifier.size(20.dp))

            Text(
                text = "Paste cookies",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Paste your reddit.com cookie string (name=value; name2=value2) " +
                    "or the contents of a Netscape cookies.txt export.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 8.dp),
            )
            OutlinedTextField(
                value = pasteText,
                onValueChange = { pasteText = it },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 8,
                label = { Text("cookie string or cookies.txt") },
            )
            Spacer(Modifier.size(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        val count = cookieStore.importRaw(pasteText)
                        if (count > 0) {
                            pasteText = ""
                            Toast.makeText(context, "Imported $count cookies", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(context, "No reddit.com cookies found", Toast.LENGTH_SHORT).show()
                        }
                    },
                ) { Text("Import pasted") }

                OutlinedButton(onClick = { filePicker.launch(arrayOf("text/*", "*/*")) }) {
                    Text("Import file")
                }
            }

            Spacer(Modifier.size(24.dp))

            HowToCard()

            Spacer(Modifier.size(24.dp))

            if (cookieHeader.isNotBlank()) {
                OutlinedButton(
                    onClick = {
                        cookieStore.clear()
                        Toast.makeText(context, "Cookies cleared", Toast.LENGTH_SHORT).show()
                    },
                ) { Text("Clear session") }
            }
        }
    }
}

@Composable
private fun StatusCard(hasSession: Boolean, cookieCount: Int, lastImported: Long) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = if (hasSession) "Session active" else "No session",
                style = MaterialTheme.typography.titleMedium,
                color = if (hasSession) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "$cookieCount cookies stored",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (lastImported > 0) {
                val fmt = SimpleDateFormat("d MMM yyyy, HH:mm", Locale.getDefault())
                Text(
                    text = "Imported ${fmt.format(Date(lastImported))}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun HowToCard() {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = "How to get your cookies",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.size(8.dp))
            listOf(
                "1. On your Mac (Firefox closed): make android-cookie",
                "   → ~/Downloads/boostlite-reddit-cookies.txt",
                "2. Or with USB: make android-cookie-push (adb → phone Downloads).",
                "3. Here: Import file → boostlite-reddit-cookies.txt",
                "4. Or paste a cookie string / any Netscape export above.",
                "5. When you see \"session expired\", re-run make and import again.",
            ).forEach { line ->
                Text(
                    text = line,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 3.dp),
                )
            }
        }
    }
}
