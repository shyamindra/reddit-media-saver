package com.boostlite.reddit.ui.media

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FeedMediaTest {

    @Test
    fun prefersCappedProgressiveMp4OverDashPlaylist() {
        assertEquals(
            "https://v.redd.it/vid/DASH_720.mp4?source=fallback",
            feedStreamUrl(
                videoUrl = "https://v.redd.it/vid/DASHPlaylist.mpd?a=1",
                downloadUrl = "https://v.redd.it/vid/DASH_1080.mp4?source=fallback",
            ),
        )
    }

    @Test
    fun leavesProgressiveMp4AtOrBelow720() {
        assertEquals(
            "https://v.redd.it/vid/DASH_480.mp4?source=fallback",
            feedStreamUrl(
                videoUrl = "https://v.redd.it/vid/DASHPlaylist.mpd",
                downloadUrl = "https://v.redd.it/vid/DASH_480.mp4?source=fallback",
            ),
        )
    }

    @Test
    fun capsCmafFallbackAt720() {
        assertEquals(
            "https://v.redd.it/vid/CMAF_720.mp4?source=fallback",
            feedStreamUrl(
                videoUrl = "https://v.redd.it/vid/DASHPlaylist.mpd",
                downloadUrl = "https://v.redd.it/vid/CMAF_1080.mp4?source=fallback",
            ),
        )
    }

    @Test
    fun fallsBackToDashWhenThereIsNoMp4() {
        assertEquals(
            "https://v.redd.it/vid/DASHPlaylist.mpd",
            feedStreamUrl(
                videoUrl = "https://v.redd.it/vid/DASHPlaylist.mpd",
                downloadUrl = "https://v.redd.it/vid/DASHPlaylist.mpd",
            ),
        )
    }

    @Test
    fun returnsNullWhenThereIsNoStream() {
        assertNull(feedStreamUrl(videoUrl = null, downloadUrl = null))
    }

    @Test
    fun feedStillDecodeSizeCapsAt1080() {
        assertEquals(1080, feedStillDecodeSize(1440))
        assertEquals(720, feedStillDecodeSize(720))
        assertEquals(1, feedStillDecodeSize(0))
    }

    @Test
    fun fullscreenImagePrefersOriginalDownload() {
        assertEquals(
            "https://i.redd.it/photo1.jpg",
            fullscreenImageUrl(
                previewUrl = "https://preview.redd.it/photo1.jpg?width=1080&s=1",
                downloadUrl = "https://i.redd.it/photo1.jpg",
            ),
        )
        assertEquals(
            "https://preview.redd.it/poster.jpg?width=960&s=1",
            fullscreenImageUrl(
                previewUrl = "https://preview.redd.it/poster.jpg?width=960&s=1",
                downloadUrl = "https://v.redd.it/vid/DASH_1080.mp4",
            ),
        )
    }
}
