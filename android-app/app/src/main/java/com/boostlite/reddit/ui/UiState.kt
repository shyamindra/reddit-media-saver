package com.boostlite.reddit.ui

/** Minimal async state holder used by all screens. */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String, val needsCookies: Boolean = false) : UiState<Nothing>
}
