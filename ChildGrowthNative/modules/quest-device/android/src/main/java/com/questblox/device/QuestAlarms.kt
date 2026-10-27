package com.questblox.device

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

object QuestAlarms {
  fun prefs(c: Context) = c.getSharedPreferences("quest-alarms", Context.MODE_PRIVATE)
  fun manager(c: Context) = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  fun allowed(c: Context) = Build.VERSION.SDK_INT < 31 || manager(c).canScheduleExactAlarms()
  fun pending(c: Context, id: String): PendingIntent = PendingIntent.getBroadcast(c, 0,
    Intent(c, QuestAlarmReceiver::class.java).setData(Uri.parse("questblox-alarm:${Uri.encode(id)}")).putExtra("id", id),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  fun items(c: Context): List<JSONObject> {
    val array = JSONArray(prefs(c).getString("items", "[]"))
    return (0 until array.length()).map { array.getJSONObject(it) }
  }
  fun save(c: Context, items: List<JSONObject>) { prefs(c).edit().putString("items", JSONArray(items).toString()).commit() }
  fun schedule(c: Context, item: JSONObject) {
    if (allowed(c) && item.getLong("at") > System.currentTimeMillis()) {
      manager(c).setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.getLong("at"), pending(c, item.getString("id")))
    }
  }
  @Synchronized fun sync(c: Context, json: String) {
    val input = JSONObject(json)
    val account = input.getString("account")
    val ids = input.getJSONArray("liveIds").let { a -> (0 until a.length()).map { a.getString(it) }.toSet() }
    fun valid(item: JSONObject): Boolean = input.getBoolean("enabled") && item.optString("account") == account &&
      item.optJSONArray("taskIds")?.let { a -> (0 until a.length()).any { ids.contains(a.getString(it)) } } == true
    val old = items(c)
    val slots = input.getJSONArray("slots")
    val desired = (0 until slots.length()).map { slots.getJSONObject(it) }.toMutableList()
    // Preserve a snooze across foreground refreshes, but never across account changes or task completion.
    old.filter { it.optBoolean("snoozed") && valid(it) && it.getLong("at") > System.currentTimeMillis() }.forEach { desired.add(it) }
    val active = prefs(c).getString("active", null)?.let { JSONObject(it) }
    if (active != null && !valid(active)) c.stopService(Intent(c, QuestAlarmService::class.java))
    old.forEach { manager(c).cancel(pending(c, it.getString("id"))) }
    save(c, desired)
    prefs(c).edit().putString("account", account).commit()
    desired.forEach { schedule(c, it) }
  }
  @Synchronized fun test(c: Context, json: String) {
    check(allowed(c))
    val item = JSONObject(json).put("id", "test").put("at", System.currentTimeMillis() + 5000)
    save(c, items(c).filter { it.getString("id") != "test" } + item)
    schedule(c, item)
  }
  @Synchronized fun take(c: Context, id: String): JSONObject? {
    val all = items(c)
    val item = all.find { it.getString("id") == id } ?: return null
    save(c, all.filter { it.getString("id") != id })
    // Do not ring missed alarms after a long device shutdown or delayed broadcast.
    return item.takeIf { System.currentTimeMillis() - it.getLong("at") in 0..120000 }
  }
  @Synchronized fun snooze(c: Context, item: JSONObject) {
    val at = System.currentTimeMillis() + 5 * 60000
    val hour = java.util.Calendar.getInstance().apply { timeInMillis = at }.get(java.util.Calendar.HOUR_OF_DAY)
    if (hour !in 7..19 || !allowed(c)) return
    item.put("at", at).put("snoozed", true)
    save(c, items(c).filter { it.getString("id") != item.getString("id") } + item)
    schedule(c, item)
  }
}

class QuestAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val item = QuestAlarms.take(context, intent.getStringExtra("id") ?: return) ?: return
    val service = Intent(context, QuestAlarmService::class.java).putExtra("alarm", item.toString())
    if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service) else context.startService(service)
  }
}

class QuestAlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action !in listOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED, AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED)) return
    val future = QuestAlarms.items(context).filter { it.getLong("at") > System.currentTimeMillis() }
    QuestAlarms.save(context, future)
    future.forEach { QuestAlarms.schedule(context, it) }
  }
}
