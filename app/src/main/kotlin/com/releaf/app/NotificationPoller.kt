package com.releaf.app

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Polls /api/notifications?role=<role> every 15 seconds and fires a local
 * Android notification for each pending item returned by the server.
 *
 * Start it once from MainActivity; it runs for the lifetime of the process.
 */
class NotificationPoller(
    private val context: Context,
    private val prefs: SharedPreferences,
) {
    private var job: Job? = null
    private val bridge = ReleafBridge(context)

    fun start() {
        job?.cancel()
        job = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                poll()
                delay(15_000L)
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
    }

    private fun poll() {
        val serverUrl = prefs.getString("server_url", "http://localhost:3000") ?: return
        val role = prefs.getString("role", null) ?: return // not set yet — skip

        try {
            val url = URL("$serverUrl/api/notifications?role=$role")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 5_000
            conn.readTimeout = 5_000
            conn.requestMethod = "GET"

            if (conn.responseCode != 200) return

            val body = conn.inputStream.bufferedReader().readText()
            conn.disconnect()

            val json = JSONObject(body)
            val notifications = json.optJSONArray("notifications") ?: return

            for (i in 0 until notifications.length()) {
                val n = notifications.getJSONObject(i)
                val title = n.optString("title", "Releaf")
                val text = n.optString("body", "")
                bridge.showNotification(title, text)
            }
        } catch (_: Exception) {
            // Network unavailable or server not running — silently ignore
        }
    }
}
