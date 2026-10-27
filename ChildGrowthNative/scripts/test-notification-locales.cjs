const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const i18next = require('i18next');

async function fixture(language, platform = 'android', permission = 'granted') {
  const dictionary = require(`../src/i18n/ui.${language}.json`);
  const i18n = i18next.createInstance();
  await i18n.init({ lng: language, resources: { [language]: { translation: dictionary } } });
  const scheduled = [], categories = new Map(), channels = new Map();
  const native = {
    AndroidImportance: { DEFAULT: 3, MAX: 5 }, AndroidNotificationVisibility: { PUBLIC: 1 }, AndroidAudioUsage: { ALARM: 4 },
    SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval', DAILY: 'daily' },
    setNotificationHandler() {},
    setNotificationChannelAsync: async (id, value) => channels.set(id, value),
    setNotificationCategoryAsync: async (id, value) => categories.set(id, value),
    getPermissionsAsync: async () => ({ status: permission }),
    requestPermissionsAsync: async () => ({ status: permission }),
    getAllScheduledNotificationsAsync: async () => [],
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: async value => { scheduled.push(value); return 'scheduled-id'; },
  };
  const mocks = {
    '../i18n': { default: i18n },
    './questTemplates': { questName: task => task.name },
    'react-native': { Platform: { OS: platform } },
    'expo-notifications': native,
    './heroCatalog': { heroFor: () => ({ name: 'Quest Champ' }) },
    './reminderPlan': { reminderPlan: tasks => tasks.map(task => ({ task, date: new Date(2030, 0, 1, 10) })) },
    './questSchedule': { localDateKey: () => '2030-01-01' },
  };
  const filename = path.resolve(__dirname, '../src/lib/notifications.ts');
  const mod = new Module(filename, module);
  mod.require = name => { assert.ok(mocks[name], name); return { __esModule: true, ...mocks[name] }; };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return { ...mod.exports, dictionary, scheduled, categories, channels };
}

for (const language of ['en', 'cs', 'es', 'de']) {
  test(`${language}: notification content, channel names and actions use the selected locale`, async () => {
    const f = await fixture(language);
    const task = { id: 'custom', name: 'Family-written quest', icon: '⭐', date: '2030-01-01' };
    await f.scheduleTaskReminders([task]);
    assert.equal(f.scheduled[0].content.body, f.dictionary.notification_ready);
    assert.equal(f.scheduled[0].content.title, '⭐ Family-written quest');
    assert.equal(f.channels.get('quest-notifications').name, f.dictionary.notification_channel);
    assert.deepEqual(f.categories.get('quest-reminder-actions').map(item => item.buttonTitle),
      ['action_start', 'action_done', 'action_later'].map(key => f.dictionary[key]));
    await f.scheduleFocusEndNotification(task, 120);
    assert.equal(f.scheduled[1].content.body, f.dictionary.notification_focus_done);
    assert.equal(f.scheduled[1].content.title,
      f.dictionary.notification_focus_title.replace('{{name}}', task.name));
    assert.deepEqual(f.categories.get('focus-finished-actions').map(item => item.buttonTitle),
      ['action_finish', 'action_later'].map(key => f.dictionary[key]));
    assert.equal(await f.snoozeQuestReminder(task), true);
    assert.equal(f.scheduled[2].content.body, f.dictionary.notification_snooze);
    assert.equal(await f.testQuestReminder(), 'scheduled');
    assert.equal(f.scheduled[3].content.body, f.dictionary.notification_test_body);
    assert.equal(f.scheduled[3].trigger.seconds, 5);
  });
}
test('web and denied permission never report a test notification as scheduled', async () => {
  for (const [platform, permission, expected] of [['web', 'granted', 'unavailable'], ['android', 'denied', 'denied']]) {
    const f = await fixture('en', platform, permission);
    assert.equal(await f.testQuestReminder(), expected);
    assert.deepEqual(f.scheduled, []);
  }
});

test('alarm scheduling falls back to a normal notification when Android rejects the alarm request', async () => {
  const f = await fixture('en');
  const requests = [];
  const result = await f.scheduleAlarmWithNotificationFallback(async request => {
    requests.push(request);
    if (requests.length === 1) throw new Error('exact alarm unavailable');
    return 'fallback-id';
  }, { channel: 'alarm' }, { channel: 'notification' });
  assert.equal(result, 'fallback-id');
  assert.deepEqual(requests, [{ channel: 'alarm' }, { channel: 'notification' }]);
});
