# Questblox: remaining acceptance checks

The implementation and automated tests do not establish that these journeys work on the children's physical phones. Record device model, Android version and result when testing.

## First installation and account access

- Update from the existing Play internal-testing installation; retain the child's existing quests, coins, fighters and family connection.
- Confirm the new face icon and microphone inside the task-name field are visible.
- Sign in with Google using a tester account. The earlier “project is not valid” failure must not recur.
- Link one parent and two child accounts on separate devices. Confirm each child sees only their own progress and authorized family actions.

## Create and complete one quest

- Parent creates a quest for one child; verify the other child is unaffected.
- Choose the picture, name and rolling time. Choose Notification for one quest and Alarm for another, including two quests at the same time.
- On the child's phone, enable reminders and allow notifications. For alarms, allow Android's Alarms & reminders access, return and save.
- Verify Notification gives a normal alert and Alarm rings with Stop and Snooze actions. No quest should receive both types.
- Complete a quest and approve it as the parent if required. Verify the child receives its reward exactly once, even after reopening the app.
- Edit the quest alert type and time; confirm the child receives the saved changes after syncing.

## Voice and alarms

- Speak a task name, correct it, then add it. Cancelling speech must preserve the previous draft.
- Try the selected language and a phone with no usable speech provider; typing must remain available.
- Test an alarm with the app closed and phone locked, then Stop and Snooze for five minutes.
- Test reboot, rest day, task deletion, completion and logout. Obsolete alarms must not ring after the device has reconciled those changes.
- Verify actual alarm volume and Do Not Disturb behavior. A web preview cannot validate these.

## Rewards and fighting

- Complete the daily quest path and Epic quest; verify the configured reward spin becomes available once.
- Earn and spend coins on a fighter; reopen the app and check ownership and balance.
- Invite the sibling to a battle, accept on the other phone, use skills, finish, and verify both devices agree on the outcome.
- Repeat a completed action after reconnecting; rewards and purchases must not duplicate.

## Child usability

- Ask each child to add a quest and finish one without guidance. Record where they hesitate.
- Check task pictures, Edit/Delete icons, name entry and time wheels on the smallest phone and with larger system text.
- Check Czech, English, Spanish and German where relevant; catalog parity alone is insufficient.

Do not mark these checks passed until someone has observed the results. Resolve failures before expanding the feature scope.
