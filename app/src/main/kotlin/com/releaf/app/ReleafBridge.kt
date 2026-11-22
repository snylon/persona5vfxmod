package com.releaf.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * JavaScript bridge exposed to the web app as `window.ReleafBridge`.
 *
 * The web page calls:
 *   ReleafBridge.setRole("patient" | "caretaker")
 *   ReleafBridge.showNotification("Title", "Body text")
 */
class ReleafBridge(private val context: Context) {

    companion object {
        const val CHANNEL_ID = "releaf_notifications"
        const val CHANNEL_NAME = "Releaf Notifications"
        private var notifId = 1000

        fun createChannel(context: Context) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reminders and alerts from Releaf"
                enableVibration(true)
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    /** Called once when the user's role is known. Stored so the polling service knows which queue to poll. */
    @JavascriptInterface
    fun setRole(role: String) {
        context.getSharedPreferences("releaf_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("role", role)
            .apply()
    }

    /** Shows an Android system notification immediately. */
    @JavascriptInterface
    fun showNotification(title: String, body: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notifId++, notification)
        } catch (_: SecurityException) {
            // Permission not granted yet — silently skip
        }
    }
}
