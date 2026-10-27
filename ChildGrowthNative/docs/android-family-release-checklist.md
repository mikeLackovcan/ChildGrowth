# Quest Champ Android family release checklist

Use the Play Internal Testing build on two physical Android devices. Run each case once online, then repeat the marked offline cases. Record the device model, Android version, build number, date, and result.

## Accounts and family linking

- [ ] First launch clearly offers **Kid** and **Parent** before any registration fields.
- [ ] Kid opens local play without email, Google, or a child cloud account.
- [ ] Parent signs in with Google and can choose a Google account.
- [ ] After logout, the app returns to the Kid/Parent entry screen.
- [ ] The next Google sign-in shows the account chooser again.
- [ ] Parent creates two children with short readable, distinct nicknames.
- [ ] Each child can reconnect on a replacement device using a fresh family code.
- [ ] Child scans the parent's QR code and links successfully.
- [ ] Manual code entry still works when camera permission is denied.
- [ ] An expired, reused, or non-Quest-Champ QR is rejected without losing local progress.
- [ ] A pending legacy invitation identifies its sender and supports Accept and Decline.

## Parent and sibling isolation

- [ ] Selecting child A changes every parent action and summary to child A.
- [ ] Selecting child B changes the same controls to child B.
- [ ] A task, reward, wheel prize, or settings change for child A never appears for child B.
- [ ] A child-created family quest stays pending until the parent approves it.
- [ ] Parent can approve, decline, edit, and delete the selected child's quest.
- [ ] Repeating an approval or tapping twice does not grant coins twice.
- [ ] Parent deletion requires confirmation and does not delete a sibling.

## Two-device synchronization

- [ ] Parent creates a quest; linked child sees it without relinking.
- [ ] Child completes a quest; parent sees the pending/completed state.
- [ ] Parent approves it; the child receives the expected reward exactly once.
- [ ] Put the child device offline, complete a quest, reopen the app, and confirm local progress remains.
- [ ] Restore the network, foreground the app, and confirm the latest snapshot reaches the parent.
- [ ] Force-close and reopen both apps; state remains consistent.

## Reminders and alarms

- [ ] A new child quest proposes an 18:00 reminder by default.
- [ ] Notification permission is requested only when the user saves a quest with reminders enabled.
- [ ] Denying permission leaves the quest usable and explains that the reminder was not enabled.
- [ ] Notification mode displays the mascot image, short text, and relevant action buttons.
- [ ] Alarm mode uses the alarm sound when Android permits it and falls back to a normal notification otherwise.
- [ ] Done, Not done, Start, and Finish actions update the correct quest only once.
- [ ] A focus session ends at the chosen duration and notifies while the app is closed.
- [ ] A scheduled reminder still fires after restarting the phone.
- [ ] Repeat notification tests with Android Battery Saver enabled; note any manufacturer delay.

## Layout and accessibility

- [ ] No content overlaps the Android status bar, gesture bar, or three-button navigation.
- [ ] Parent forms scroll above the keyboard and the focused field stays visible.
- [ ] English, Czech, Spanish, and German show complete labels without horizontal overflow.
- [ ] Buttons remain at least 48 dp high, readable, and operable with large system font size.
- [ ] TalkBack announces the role choices, QR scanner controls, child selector, and destructive actions clearly.

## Release decision

Do not promote beyond Internal Testing until all account, family isolation, duplicate-reward, Google sign-in, and closed-app notification cases pass on the Play-signed build.
