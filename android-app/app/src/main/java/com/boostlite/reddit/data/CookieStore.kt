package com.boostlite.reddit.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Persists the reddit.com `Cookie:` header locally and exposes it as observable
 * state so the UI can react to import / expiry.
 *
 * Prototype note: stored in plain SharedPreferences. For a hardened build, swap
 * to EncryptedSharedPreferences (androidx.security:security-crypto).
 */
class CookieStore(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private val _cookieHeader = MutableStateFlow(prefs.getString(KEY_COOKIE, "").orEmpty())
    val cookieHeader: StateFlow<String> = _cookieHeader.asStateFlow()

    private val _lastImportedAt = MutableStateFlow(prefs.getLong(KEY_IMPORTED_AT, 0L))
    val lastImportedAt: StateFlow<Long> = _lastImportedAt.asStateFlow()

    val hasSession: Boolean
        get() = CookieParser.hasSession(_cookieHeader.value)

    /** Parse raw input and persist. Returns the number of cookies stored. */
    fun importRaw(raw: String): Int {
        val header = CookieParser.parse(raw)
        val count = if (header.isEmpty()) 0 else header.split(';').size
        prefs.edit()
            .putString(KEY_COOKIE, header)
            .putLong(KEY_IMPORTED_AT, System.currentTimeMillis())
            .apply()
        _cookieHeader.value = header
        _lastImportedAt.value = System.currentTimeMillis()
        return count
    }

    fun clear() {
        prefs.edit().remove(KEY_COOKIE).remove(KEY_IMPORTED_AT).apply()
        _cookieHeader.value = ""
        _lastImportedAt.value = 0L
    }

    fun currentHeader(): String = _cookieHeader.value

    companion object {
        private const val PREFS = "boostlite_session"
        private const val KEY_COOKIE = "cookie_header"
        private const val KEY_IMPORTED_AT = "imported_at"
    }
}
