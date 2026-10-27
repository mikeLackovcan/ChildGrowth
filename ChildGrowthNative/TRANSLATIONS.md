# Questblox translation requirements

Applies to every future Questblox change, including fixes and prototypes used in the app.

Translations are a standing user requirement: include them automatically in every
implementation step, without waiting for another request. A feature is not ready
until its user-facing text works in every supported language. When touching an
existing screen, fix untranslated interface text in the affected flow as well.

- Ship all supported languages together: English (`en`), Czech (`cs`), Spanish (`es`) and German (`de`).
- Use i18next keys for screen text, buttons, empty states, validation, errors, dialogs, notifications, tutorial text and accessibility labels/hints. Never rely on an English fallback as a completed translation.
- Keep visible child-facing text short and natural. Prefer familiar words and clear pictures; icon-only controls still need translated accessibility labels.
- Keep keys stable. Add each new key to all four languages in the same change, including plural forms and interpolation variables.
- Never concatenate translated sentence fragments. Use complete phrases with named placeholders, such as `{{count}}` and `{{name}}`.
- Localize dates, times and numbers. Preserve the selected language across restart, sign-in and account switching.
- Preserve parent/child authored quest names, reward names and nicknames exactly. Translate surrounding interface text, not their content. Brand and original fighter names may remain proper names.
- Translate notifications at scheduling time and reschedule owned reminders after a language change.
- Use the selected language for spoken instructions and voice guidance as well as visible text. Avoid text embedded in pictures unless localized versions are provided.
- When adding another supported language, include it in every catalog and in the same delivery checks before exposing it in the language selector.
- Map technical errors to friendly translated messages; do not show raw backend error strings to children.
- Check all four languages for missing keys, placeholders, clipping, long labels and large font sizes. Review Czech diacritics and natural German/Spanish phrasing.
- Run the translation check and TypeScript check before delivery. Report any existing untranslated screens honestly; do not claim full coverage from key parity alone.

The main catalog is `src/i18n/index.ts`. Feature catalogs may live alongside it and must be registered for all four languages.

## Required delivery check

For every user-facing change:

1. Check new and changed text in child and parent screens, authentication, quests, rewards, battles, reminders and notifications. Include loading, offline, permission and error states.
2. Add or update all four translations together. Server-generated notifications and default system content also need localization; user-authored content stays unchanged.
3. Run `npm run test:i18n` and `node node_modules/typescript/bin/tsc --noEmit` from `ChildGrowthNative`.
4. Review the affected screens in each language. Check longer labels, small screens and larger text settings. Keep recognizable icons prominent without removing accessible names.
5. State any remaining translation gaps in the handoff. Passing the catalog check verifies keys and placeholders, not complete screen coverage or translation quality.

Apply this checklist to each implementation step and release, rather than postponing translations until the end.
