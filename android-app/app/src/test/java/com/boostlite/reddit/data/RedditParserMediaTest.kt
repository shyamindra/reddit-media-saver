package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RedditParserMediaTest {

    private fun listing(postJson: String): String =
        """{"kind":"Listing","data":{"after":null,"children":[{"kind":"t3","data":$postJson}]}}"""

    private fun post(json: String) = RedditParser.parseListing(listing(json)).items.single()

    @Test
    fun gallery_usesOriginalIRedditUrlNotPreviewWidth() {
        val media = post(
            """
            {
              "id":"g1","name":"t3_g1","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/g1/x/","is_gallery":true,
              "gallery_data":{"items":[{"media_id":"abc123xyz"}]},
              "media_metadata":{
                "abc123xyz":{
                  "e":"Image","m":"image/jpg",
                  "p":[{"x":108,"y":72,"u":"https://preview.redd.it/abc123xyz.jpg?width=108&amp;format=pjpg"}],
                  "s":{"x":4096,"y":2730,"u":"https://preview.redd.it/abc123xyz.jpg?width=4096&amp;format=pjpg&amp;auto=webp&amp;s=deadbeef"}
                }
              }
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.GALLERY, media.type)
        assertEquals("https://i.redd.it/abc123xyz.jpg", media.galleryUrls.single())
        assertEquals("https://i.redd.it/abc123xyz.jpg", media.previewUrl)
    }

    @Test
    fun gallery_prefersMp4OverGif() {
        val media = post(
            """
            {
              "id":"g2","name":"t3_g2","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/g2/x/","is_gallery":true,
              "gallery_data":{"items":[{"media_id":"anim1"}]},
              "media_metadata":{
                "anim1":{
                  "e":"AnimatedImage","m":"image/gif",
                  "s":{
                    "x":600,"y":400,
                    "gif":"https://preview.redd.it/anim1.gif?s=1",
                    "mp4":"https://preview.redd.it/anim1.mp4?s=1",
                    "u":"https://preview.redd.it/anim1.gif?width=600"
                  }
                }
              }
            }
            """.trimIndent(),
        ).media
        assertTrue(media.galleryUrls.single().contains(".mp4"))
        assertTrue(!media.galleryUrls.single().contains("width="))
    }

    @Test
    fun image_upgradesPreviewReddItToOriginal() {
        val media = post(
            """
            {
              "id":"im","name":"t3_im","title":"I","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/im/x/","post_hint":"image",
              "url":"https://preview.redd.it/photo1.jpg?width=320&amp;format=pjpg&amp;auto=webp&amp;s=abc",
              "url_overridden_by_dest":"https://preview.redd.it/photo1.jpg?width=320&amp;format=pjpg&amp;auto=webp&amp;s=abc"
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.IMAGE, media.type)
        assertEquals("https://i.redd.it/photo1.jpg", media.previewUrl)
        assertEquals("https://i.redd.it/photo1.jpg", media.downloadUrl)
    }

    @Test
    fun image_keepsDirectIRedditUrl() {
        val media = post(
            """
            {
              "id":"im2","name":"t3_im2","title":"I","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/im2/x/","post_hint":"image",
              "url":"https://i.redd.it/orig.png"
            }
            """.trimIndent(),
        ).media
        assertEquals("https://i.redd.it/orig.png", media.previewUrl)
    }

    @Test
    fun image_withQueryStringStillDetectedAsImage() {
        val media = post(
            """
            {
              "id":"im3","name":"t3_im3","title":"I","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/im3/x/",
              "url":"https://i.redd.it/plain.jpg?foo=1"
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.IMAGE, media.type)
        assertEquals("https://i.redd.it/plain.jpg", media.previewUrl)
    }

    @Test
    fun video_prefersDashOverLowFallback() {
        val media = post(
            """
            {
              "id":"v1","name":"t3_v1","title":"V","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/v1/x/",
              "preview":{"images":[{"source":{"url":"https://preview.redd.it/poster.jpg?width=108","width":108,"height":60}}]},
              "media":{"reddit_video":{
                "height":1080,
                "fallback_url":"https://v.redd.it/vid/DASH_240.mp4?source=fallback",
                "dash_url":"https://v.redd.it/vid/DASHPlaylist.mpd?a=1",
                "hls_url":"https://v.redd.it/vid/HLSPlaylist.m3u8?a=1"
              }}
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertEquals("https://v.redd.it/vid/DASHPlaylist.mpd?a=1", media.videoUrl)
        assertEquals("https://i.redd.it/poster.jpg", media.previewUrl)
        assertEquals("https://v.redd.it/vid/DASH_1080.mp4?source=fallback", media.downloadUrl)
    }

    @Test
    fun video_snapsOversizeHeightTo1080() {
        val media = post(
            """
            {
              "id":"v3","name":"t3_v3","title":"V","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/v3/x/",
              "media":{"reddit_video":{
                "height":1920,
                "fallback_url":"https://v.redd.it/vid/DASH_240.mp4?source=fallback"
              }}
            }
            """.trimIndent(),
        ).media
        assertEquals("https://v.redd.it/vid/DASH_240.mp4?source=fallback", media.videoUrl)
        assertEquals("https://v.redd.it/vid/DASH_1080.mp4?source=fallback", media.downloadUrl)
    }

    @Test
    fun video_fallbackUsesDeclaredHeightWhenNoDash() {
        val media = post(
            """
            {
              "id":"v2","name":"t3_v2","title":"V","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/v2/x/",
              "media":{"reddit_video":{
                "height":720,
                "fallback_url":"https://v.redd.it/vid/DASH_360.mp4?source=fallback"
              }}
            }
            """.trimIndent(),
        ).media
        assertEquals("https://v.redd.it/vid/DASH_360.mp4?source=fallback", media.videoUrl)
        assertEquals("https://v.redd.it/vid/DASH_720.mp4?source=fallback", media.downloadUrl)
    }

    @Test
    fun video_snapsOddHeightDownToKnownDashRung() {
        val media = post(
            """
            {
              "id":"v4","name":"t3_v4","title":"V","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/v4/x/",
              "media":{"reddit_video":{
                "height":854,
                "fallback_url":"https://v.redd.it/vid/DASH_360.mp4?source=fallback"
              }}
            }
            """.trimIndent(),
        ).media
        assertEquals("https://v.redd.it/vid/DASH_360.mp4?source=fallback", media.videoUrl)
        assertEquals("https://v.redd.it/vid/DASH_720.mp4?source=fallback", media.downloadUrl)
    }

    @Test
    fun preview_picksSourceOverTinyResolutions() {
        val media = post(
            """
            {
              "id":"t1","name":"t3_t1","title":"T","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/t1/x/","is_self":true,"selftext":"hi",
              "preview":{"images":[{
                "source":{"url":"https://preview.redd.it/big.jpg?auto=webp&amp;s=1","width":2048,"height":1536},
                "resolutions":[
                  {"url":"https://preview.redd.it/big.jpg?width=108&amp;s=1","width":108,"height":81},
                  {"url":"https://preview.redd.it/big.jpg?width=960&amp;s=1","width":960,"height":720}
                ]
              }]}
            }
            """.trimIndent(),
        ).media
        assertEquals("https://i.redd.it/big.jpg", media.previewUrl)
    }

    @Test
    fun title_decodesHtmlEntities() {
        val post = post(
            """
            {
              "id":"ht","name":"t3_ht","title":"It&amp;#39;s a &quot;test&quot; &amp; more",
              "author":"a","subreddit":"pics","permalink":"/r/pics/comments/ht/x/"
            }
            """.trimIndent(),
        )
        assertEquals("It's a \"test\" & more", post.title)
    }

    @Test
    fun externalPreview_isNotRewrittenToIReddit() {
        val media = post(
            """
            {
              "id":"l1","name":"t3_l1","title":"L","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/l1/x/","post_hint":"link",
              "url":"https://example.com/article",
              "preview":{"images":[{"source":{
                "url":"https://external-preview.redd.it/xyz.jpg?auto=webp&amp;s=1","width":1200,"height":800
              }}]}
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.LINK, media.type)
        assertTrue(media.previewUrl!!.startsWith("https://external-preview.redd.it/"))
    }

    @Test
    fun redgifs_usesRedditVideoPreviewNotLink() {
        val media = post(
            """
            {
              "id":"rg","name":"t3_rg","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/rg/x/","post_hint":"rich:video","domain":"redgifs.com",
              "url":"https://www.redgifs.com/watch/exampleclip",
              "preview":{
                "images":[{"source":{"url":"https://preview.redd.it/poster.jpg?auto=webp","width":640,"height":360}}],
                "reddit_video_preview":{
                  "is_gif":true,"height":720,
                  "fallback_url":"https://v.redd.it/gifvid/DASH_480.mp4?source=fallback",
                  "dash_url":"https://v.redd.it/gifvid/DASHPlaylist.mpd?a=1"
                }
              }
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://v.redd.it/gifvid/DASHPlaylist.mpd?a=1", media.videoUrl)
        assertEquals("https://v.redd.it/gifvid/DASH_720.mp4?source=fallback", media.downloadUrl)
    }

    @Test
    fun hostedGif_prefersRedditVideoPreviewOverGifBytes() {
        val media = post(
            """
            {
              "id":"hg","name":"t3_hg","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/hg/x/","post_hint":"image","domain":"i.redd.it",
              "url":"https://i.redd.it/anim.gif",
              "preview":{
                "images":[{"source":{"url":"https://preview.redd.it/anim.jpg?width=108","width":108,"height":60}}],
                "reddit_video_preview":{
                  "is_gif":true,"height":720,
                  "fallback_url":"https://v.redd.it/anim/DASH_240.mp4?source=fallback",
                  "dash_url":"https://v.redd.it/anim/DASHPlaylist.mpd?a=1"
                }
              }
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://v.redd.it/anim/DASHPlaylist.mpd?a=1", media.videoUrl)
    }

    @Test
    fun imgurGif_usesSiblingMp4() {
        val media = post(
            """
            {
              "id":"ig","name":"t3_ig","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/ig/x/","post_hint":"image","domain":"i.imgur.com",
              "url":"https://i.imgur.com/abc.gif"
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://i.imgur.com/abc.mp4", media.videoUrl)
    }

    @Test
    fun gifv_isPlayableVideo() {
        val media = post(
            """
            {
              "id":"gv","name":"t3_gv","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/gv/x/","post_hint":"rich:video","domain":"i.imgur.com",
              "url":"https://i.imgur.com/abc.gifv"
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://i.imgur.com/abc.mp4", media.videoUrl)
    }

    @Test
    fun crosspost_usesParentRedditVideoPreview() {
        val media = post(
            """
            {
              "id":"xp","name":"t3_xp","title":"X","author":"a","subreddit":"topsub",
              "permalink":"/r/topsub/comments/xp/x/","post_hint":"link","domain":"redgifs.com",
              "url":"https://www.redgifs.com/watch/exampleclip",
              "crosspost_parent_list":[{
                "id":"orig","name":"t3_orig","title":"O","author":"b","subreddit":"origsub",
                "permalink":"/r/origsub/comments/orig/x/","post_hint":"rich:video","domain":"redgifs.com",
                "url":"https://www.redgifs.com/watch/exampleclip",
                "preview":{
                  "images":[{"source":{"url":"https://preview.redd.it/poster.jpg","width":640,"height":360}}],
                  "reddit_video_preview":{
                    "is_gif":true,"height":720,
                    "fallback_url":"https://v.redd.it/gifvid/DASH_240.mp4?source=fallback"
                  }
                }
              }]
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://v.redd.it/gifvid/DASH_240.mp4?source=fallback", media.videoUrl)
        assertEquals("https://v.redd.it/gifvid/DASH_720.mp4?source=fallback", media.downloadUrl)
    }

    @Test
    fun redgifs_imageHintWithoutPreview_isNotTypedAsImage() {
        val media = post(
            """
            {
              "id":"ih","name":"t3_ih","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/ih/x/","post_hint":"image","domain":"redgifs.com",
              "url":"https://www.redgifs.com/watch/exampleclip"
            }
            """.trimIndent(),
        ).media
        assertTrue(media.type != MediaType.IMAGE)
        assertTrue(media.isGif || media.type == MediaType.LINK)
    }

    @Test
    fun redgifs_withoutRedditPreview_usesOembedPosterMp4() {
        val media = post(
            """
            {
              "id":"rg2","name":"t3_rg2","title":"G","author":"a","subreddit":"watchitforthekahaani",
              "permalink":"/r/watchitforthekahaani/comments/rg2/x/",
              "post_hint":"rich:video","domain":"redgifs.com",
              "url":"https://www.redgifs.com/watch/fuchsiacelebratedassassinbug",
              "preview":{"images":[{"source":{
                "url":"https://external-preview.redd.it/xyz.jpg?auto=webp","width":640,"height":360
              }}]},
              "media":{"type":"redgifs.com","oembed":{
                "provider_name":"RedGIFs",
                "thumbnail_url":"https://media.redgifs.com/FuchsiaCelebratedAssassinbug-poster.jpg"
              }},
              "secure_media":{"type":"redgifs.com","oembed":{
                "provider_name":"RedGIFs",
                "thumbnail_url":"https://media.redgifs.com/FuchsiaCelebratedAssassinbug-poster.jpg"
              }}
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://media.redgifs.com/FuchsiaCelebratedAssassinbug.mp4", media.videoUrl)
        assertEquals("https://media.redgifs.com/FuchsiaCelebratedAssassinbug.mp4", media.downloadUrl)
        assertEquals("https://media.redgifs.com/FuchsiaCelebratedAssassinbug-poster.jpg", media.previewUrl)
    }

    @Test
    fun redgifs_thumbsPoster_rewritesToMediaMp4() {
        val media = post(
            """
            {
              "id":"rg3","name":"t3_rg3","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/rg3/x/","post_hint":"rich:video","domain":"redgifs.com",
              "url":"https://www.redgifs.com/watch/crowdedmoraljenny",
              "media":{"oembed":{
                "thumbnail_url":"https://thumbs4.redgifs.com/CrowdedMoralJenny-poster.jpg"
              }}
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://media.redgifs.com/CrowdedMoralJenny.mp4", media.videoUrl)
    }

    @Test
    fun redditVideoPreview_cmafFallback_isPreferredOverDashPlaylist() {
        val media = post(
            """
            {
              "id":"cm","name":"t3_cm","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/cm/x/","post_hint":"rich:video","domain":"redgifs.com",
              "url":"https://www.redgifs.com/watch/exampleclip",
              "preview":{
                "images":[{"source":{"url":"https://preview.redd.it/poster.jpg","width":640,"height":360}}],
                "reddit_video_preview":{
                  "is_gif":true,"height":1080,
                  "fallback_url":"https://v.redd.it/abc123/CMAF_1080.mp4?source=fallback",
                  "dash_url":"https://v.redd.it/abc123/DASHPlaylist.mpd?a=1"
                }
              }
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://v.redd.it/abc123/CMAF_1080.mp4?source=fallback", media.videoUrl)
        assertEquals("https://v.redd.it/abc123/CMAF_1080.mp4?source=fallback", media.downloadUrl)
    }

    @Test
    fun hostedGif_variantMp4_keepsFormatQuery() {
        val media = post(
            """
            {
              "id":"hg2","name":"t3_hg2","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/hg2/x/","post_hint":"image","domain":"i.redd.it",
              "url":"https://i.redd.it/fubfbnyl5tmc1.gif",
              "preview":{"images":[{
                "source":{"url":"https://preview.redd.it/fubfbnyl5tmc1.jpg?width=108","width":108,"height":60},
                "variants":{"mp4":{"source":{
                  "url":"https://preview.redd.it/fubfbnyl5tmc1.gif?format=mp4&amp;s=abc",
                  "width":480,"height":270
                }}}
              }]}
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertTrue(media.isGif)
        assertEquals("https://preview.redd.it/fubfbnyl5tmc1.gif?format=mp4&s=abc", media.videoUrl)
    }

    @Test
    fun postWithComments_usesSameMaxDashAsFeed() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"v1","name":"t3_v1","title":"V","author":"a","subreddit":"pics",
                "permalink":"/r/pics/comments/v1/x/",
                "media":{"reddit_video":{
                  "height":1080,
                  "fallback_url":"https://v.redd.it/vid/DASH_240.mp4?source=fallback",
                  "dash_url":"https://v.redd.it/vid/DASHPlaylist.mpd?a=1"
                }}
              }}]}},
              {"kind":"Listing","data":{"children":[]}}
            ]
        """.trimIndent()
        val media = RedditParser.parsePostWithComments(json).post.media
        assertEquals(MediaType.VIDEO, media.type)
        assertEquals("https://v.redd.it/vid/DASHPlaylist.mpd?a=1", media.videoUrl)
        assertEquals("https://v.redd.it/vid/DASH_1080.mp4?source=fallback", media.downloadUrl)
    }

    @Test
    fun cmaf_keepsDeclaredHeightEvenWhenPostIsTaller() {
        val media = post(
            """
            {
              "id":"c2","name":"t3_c2","title":"V","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/c2/x/",
              "media":{"reddit_video":{
                "is_gif":false,"has_audio":true,"height":1280,
                "fallback_url":"https://v.redd.it/abc/CMAF_720.mp4?source=fallback",
                "dash_url":"https://v.redd.it/abc/DASHPlaylist.mpd?a=1"
              }}
            }
            """.trimIndent(),
        ).media
        assertEquals("https://v.redd.it/abc/CMAF_720.mp4?source=fallback", media.videoUrl)
        assertEquals("https://v.redd.it/abc/CMAF_720.mp4?source=fallback", media.downloadUrl)
        assertTrue(media.hasAudio)
        assertTrue(!media.isGif)
    }

    @Test
    fun redgifs_prefersOembedMp4OverRedditVideoPreview() {
        val media = post(
            """
            {
              "id":"rg4","name":"t3_rg4","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/rg4/x/","post_hint":"rich:video","domain":"redgifs.com",
              "url":"https://www.redgifs.com/watch/mildlopsidedkoalabear",
              "preview":{"reddit_video_preview":{
                "is_gif":true,"has_audio":false,"height":480,
                "fallback_url":"https://v.redd.it/x/CMAF_480.mp4"
              }},
              "media":{"oembed":{"thumbnail_url":"https://media.redgifs.com/MildLopsidedKoalabear-poster.jpg"}}
            }
            """.trimIndent(),
        ).media
        assertEquals("https://media.redgifs.com/MildLopsidedKoalabear.mp4", media.videoUrl)
        assertTrue(media.isGif)
        assertTrue(media.hasAudio)
    }

    @Test
    fun bareVreddit_withoutRedditVideo_usesDashPlaylist() {
        val media = post(
            """
            {
              "id":"bv","name":"t3_bv","title":"V","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/bv/x/","post_hint":"link","domain":"v.redd.it",
              "url":"https://v.redd.it/29oabq5r9cch1",
              "preview":{"images":[{"source":{"url":"https://external-preview.redd.it/x.jpg","width":640,"height":360}}]}
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertEquals("https://v.redd.it/29oabq5r9cch1/DASHPlaylist.mpd", media.videoUrl)
        assertTrue(media.hasAudio)
    }
}
