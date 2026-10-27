package com.questblox.device

import android.app.*
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.*
import org.json.JSONObject

class QuestAlarmService : Service() {
  private var player: MediaPlayer? = null
  private var alarm: JSONObject? = null
  private val handler = Handler(Looper.getMainLooper())
  override fun onBind(intent: Intent?) = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "STOP" || intent?.action == "SNOOZE") {
      if (intent.action == "SNOOZE") alarm?.let { QuestAlarms.snooze(this, it) }
      stopSelf(); return START_NOT_STICKY
    }
    val raw = intent?.getStringExtra("alarm") ?: run { stopSelf(); return START_NOT_STICKY }
    val item = JSONObject(raw)
    alarm = item
    QuestAlarms.prefs(this).edit().putString("active", raw).commit()
    val notifications = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    val channelId = "quest-alarm-v1"
    if (Build.VERSION.SDK_INT >= 26) notifications.createNotificationChannel(NotificationChannel(channelId, item.getString("channel"), NotificationManager.IMPORTANCE_HIGH).apply {
      setSound(null, null); lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    })
    fun action(name: String) = PendingIntent.getService(this, if (name == "STOP") 1 else 2,
      Intent(this, QuestAlarmService::class.java).setAction(name), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val launch = packageManager.getLaunchIntentForPackage(packageName)!!
    val open = PendingIntent.getActivity(this, 3, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, channelId) else Notification.Builder(this)
    val icon = resources.getIdentifier("notification_icon", "drawable", packageName).takeIf { it != 0 } ?: android.R.drawable.ic_lock_idle_alarm
    startForeground(49218, builder.setSmallIcon(icon).setContentTitle(item.getString("title"))
      .setContentText(item.getString("body")).setStyle(Notification.BigTextStyle().bigText(item.getString("body")))
      .setCategory(Notification.CATEGORY_ALARM).setVisibility(Notification.VISIBILITY_PRIVATE)
      .setPriority(Notification.PRIORITY_HIGH).setOngoing(true).setContentIntent(open)
      .addAction(Notification.Action.Builder(null, item.getString("stop"), action("STOP")).build())
      .addAction(Notification.Action.Builder(null, item.getString("snooze"), action("SNOOZE")).build()).build())
    player?.release()
    val p = MediaPlayer()
    player = p
    run {
      try {
        p.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
        p.setDataSource(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
        p.isLooping = true
        p.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK)
        p.prepare(); p.start()
      } catch (_: Exception) { p.release(); player = null }
    }
    handler.removeCallbacksAndMessages(null)
    handler.postDelayed({ stopSelf() }, 120000) // A missed alarm must not ring indefinitely.
    return START_NOT_STICKY
  }
  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    player?.release(); player = null
    QuestAlarms.prefs(this).edit().remove("active").commit()
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
}
