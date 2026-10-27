# Questblox Android alarms and voice entry

This release adds a local Android Expo module. It requires a new Play build; it cannot be delivered to version 9 by OTA alone.

## Features

- Microphone beside the new quest name opens Android speech recognition in the selected app language. Recognition fills an editable name; it never creates the quest automatically. Cancellation preserves the draft. Questblox does not store audio; the device's speech provider handles recognition and may use its online service.
- Each quest offers Notification or Alarm beside its time when adding or editing. The choice syncs between family devices. Alarm mode requires Android's Alarms & reminders access and notification permission. Tap Save after granting access.
- Alarms use Android AlarmManager and a foreground audio service. Notification actions stop ringing or snooze five minutes. Ringing stops automatically after two minutes. Alarm volume and device Do Not Disturb settings still apply.
- Same-time quests share one alarm. Completing, deleting, postponing or pausing a task, changing accounts, or disabling reminders reconciles the device schedule. Future schedules survive device restart. The app refreshes seven days of alarms whenever opened, matching the existing reminder horizon.
- Revoked exact-alarm permission falls back to regular reminders when the app next reconciles. Android force-stop prevents delivery until the app is reopened.
- English, Czech, Spanish and German strings ship together.

## Required physical-device checks

These cannot be verified in a web preview:

1. Install the new Play test build; open Add Quest and tap the microphone. Test success, cancellation, missing speech provider, all four languages, and review/edit before saving.
2. Select Alarm on a quest, then open reminder settings on the child’s phone. Deny permission, grant it, return, and Save. Use Test alarm. Lock the phone: verify ringing, Stop and Snooze.
3. Schedule a task, close the app and verify arrival at the selected time. Reboot before another scheduled alarm and verify delivery.
4. Complete/delete/postpone a scheduled task, enable rest mode, then sign out: verify no obsolete alarms ring. Verify a snoozed alarm is cancelled after task completion.
5. Revoke alarm permission, reopen, and verify the visible fallback warning and ordinary reminders. Test alarm volume and DND.
6. Verify the Android status bar does not overlap the task editor; inspect large system text.

Local automated checks cover reminder planning and JS/native handoff, not actual device audio or Android permission behavior.

The quest cards no longer show Help. Edit and Delete use small muted icons beside the task rather than a separate action row.
