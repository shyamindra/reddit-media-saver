package com.boostlite.reddit.ui.list

import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.remember
import kotlin.math.abs

data class VisibleItemBounds(
    val key: Any,
    val offset: Int,
    val size: Int,
)

fun centeredItemKey(
    viewportStartOffset: Int,
    viewportEndOffset: Int,
    items: List<VisibleItemBounds>,
): Any? {
    if (items.isEmpty()) return null
    val center = (viewportStartOffset + viewportEndOffset) / 2
    items.firstOrNull { item ->
        val end = item.offset + item.size
        center >= item.offset && center < end
    }?.key?.let { return it }
    return items.minByOrNull { item ->
        abs(item.offset + item.size / 2 - center)
    }?.key
}

@Composable
fun LazyListState.centeredKey(): Any? {
    return remember(this) {
        derivedStateOf {
            val info = layoutInfo
            centeredItemKey(
                info.viewportStartOffset,
                info.viewportEndOffset,
                info.visibleItemsInfo.map { VisibleItemBounds(it.key, it.offset, it.size) },
            )
        }
    }.value
}
