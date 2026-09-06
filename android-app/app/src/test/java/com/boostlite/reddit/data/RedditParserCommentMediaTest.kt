package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Test

class RedditParserCommentMediaTest {
    @Test
    fun comment_imgMarkdown_usesIReddit() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"p","name":"t3_p","title":"T","author":"a","subreddit":"pics",
                "permalink":"/r/pics/comments/p/x/","is_self":true,"selftext":"hi"
              }}]}},
              {"kind":"Listing","data":{"children":[{"kind":"t1","data":{
                "id":"c1","author":"b","body":"look ![img](abc123xyz)","created_utc":1,"score":2,
                "media_metadata":{"abc123xyz":{"e":"Image","m":"image/jpg",
                  "s":{"x":100,"y":80,"u":"https://preview.redd.it/abc123xyz.jpg?width=100"}}}
              }}]}}
            ]
        """.trimIndent()
        val c = RedditParser.parsePostWithComments(json).comments.single()
        assertEquals("look", c.body.trim())
        assertEquals(MediaType.IMAGE, c.media!!.type)
        assertEquals("https://i.redd.it/abc123xyz.jpg", c.media!!.previewUrl)
    }

    @Test
    fun comment_bareGifUrl_hidesLinkWhenMediaShown() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"p","name":"t3_p","title":"T","author":"a","subreddit":"pics",
                "permalink":"/r/pics/comments/p/x/"
              }}]}},
              {"kind":"Listing","data":{"children":[{"kind":"t1","data":{
                "id":"c1","author":"b","body":"https://i.redd.it/cpant4frhpnh1.gif","created_utc":1,"score":18
              }}]}}
            ]
        """.trimIndent()
        val c = RedditParser.parsePostWithComments(json).comments.single()
        assertEquals("", c.body)
        assertEquals(MediaType.GIF, c.media!!.type)
        assertEquals("https://i.redd.it/cpant4frhpnh1.gif", c.media!!.previewUrl)
    }

    @Test
    fun comment_giphyEmbed_playsMp4AndHidesToken() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"p","name":"t3_p","title":"T","author":"a","subreddit":"soccer",
                "permalink":"/r/soccer/comments/p/x/"
              }}]}},
              {"kind":"Listing","data":{"children":[{"kind":"t1","data":{
                "id":"c1","author":"b","body":"Bro is enjoying their defeat from bench\n\n![gif](giphy|eQgyOmHByz68LEEHvk)","created_utc":1,"score":19
              }}]}}
            ]
        """.trimIndent()
        val c = RedditParser.parsePostWithComments(json).comments.single()
        assertEquals("Bro is enjoying their defeat from bench", c.body.trim())
        assertEquals(true, c.media!!.isGif)
        assertEquals("https://i.giphy.com/eQgyOmHByz68LEEHvk.mp4", c.media!!.videoUrl)
    }

    @Test
    fun comment_giphyEmbed_downsizedStillResolves() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"p","name":"t3_p","title":"T","author":"a","subreddit":"soccer",
                "permalink":"/r/soccer/comments/p/x/"
              }}]}},
              {"kind":"Listing","data":{"children":[{"kind":"t1","data":{
                "id":"c1","author":"b","body":"![gif](giphy|YPsxi5NevgmzhqeUk7|downsized)","created_utc":1,"score":1
              }}]}}
            ]
        """.trimIndent()
        val c = RedditParser.parsePostWithComments(json).comments.single()
        assertEquals("", c.body)
        assertEquals("https://i.giphy.com/YPsxi5NevgmzhqeUk7.mp4", c.media!!.videoUrl)
    }

    @Test
    fun comment_captionPlusBareImage_keepsCaption() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"p","name":"t3_p","title":"T","author":"a","subreddit":"pics",
                "permalink":"/r/pics/comments/p/x/"
              }}]}},
              {"kind":"Listing","data":{"children":[{"kind":"t1","data":{
                "id":"c1","author":"b","body":"look https://i.redd.it/abc123xyz.jpg","created_utc":1,"score":2
              }}]}}
            ]
        """.trimIndent()
        val c = RedditParser.parsePostWithComments(json).comments.single()
        assertEquals("look", c.body)
        assertEquals(MediaType.IMAGE, c.media!!.type)
    }

    @Test
    fun textOnly_comment_hasNullMedia() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"p","name":"t3_p","title":"T","author":"a","subreddit":"pics",
                "permalink":"/r/pics/comments/p/x/"
              }}]}},
              {"kind":"Listing","data":{"children":[{"kind":"t1","data":{
                "id":"c1","author":"b","body":"plain","created_utc":1,"score":1
              }}]}}
            ]
        """.trimIndent()
        val c = RedditParser.parsePostWithComments(json).comments.single()
        assertEquals("plain", c.body)
        assertEquals(null, c.media)
    }
}
