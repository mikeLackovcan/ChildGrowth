package com.questblox.device

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.speech.RecognizerIntent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues

class QuestDeviceModule : Module() {
  private var speech: Promise? = null
  override fun definition() = ModuleDefinition {
    Name("QuestDevice")
    AsyncFunction("canAlarm") { QuestAlarms.allowed(requireNotNull(appContext.reactContext)) }
    AsyncFunction("alarmSettings") {
      val ctx = requireNotNull(appContext.reactContext)
      if (android.os.Build.VERSION.SDK_INT >= 31) ctx.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${ctx.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("syncAlarms") { json: String -> QuestAlarms.sync(requireNotNull(appContext.reactContext), json) }
    AsyncFunction("testAlarm") { json: String -> QuestAlarms.test(requireNotNull(appContext.reactContext), json) }
    AsyncFunction("speak") { language: String, prompt: String, promise: Promise ->
      if (speech != null) { promise.reject("BUSY", "Speech already open", null); return@AsyncFunction }
      val activity = appContext.currentActivity
      if (activity == null) { promise.reject("UNAVAILABLE", "No activity", null); return@AsyncFunction }
      speech = promise
      try {
        activity.startActivityForResult(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
          putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }, 49217)
      } catch (e: Exception) { speech = null; promise.reject("UNAVAILABLE", "Speech unavailable", e) }
    }.runOnQueue(Queues.MAIN)
    OnActivityResult { _, (requestCode, resultCode, data) ->
      if (requestCode == 49217) {
        speech?.resolve(if (resultCode == Activity.RESULT_OK) data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull() ?: "" else "")
        speech = null
      }
    }
    OnDestroy { speech?.resolve(""); speech = null }
  }
}
