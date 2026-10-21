// Uses a separate browser context and synthetic local guest data; never touches user accounts.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const output = process.env.QUEST_UX_SCREENSHOTS || '/tmp/quest-champ-ux-check';
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.QUEST_BROWSER_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    if (localStorage.getItem('quest-ux-fixture')) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const makeTask = (id, name, icon, extra = {}) => ({ id, name, icon, freq: 'daily', diff: 'med', mystery: false, done: false, date, ...extra });
    localStorage.setItem('quest-hero-dab6b:active_user_tag', 'ux-demo');
    localStorage.setItem('quest-hero-dab6b:mockState_ux-demo', JSON.stringify({
      userEmail: 'ux-demo@guest.local', userId: 'guest-local', nickname: 'ux-demo', fullName: 'Maya', role: 'child',
      coins: 100, totalEarned: 100, dailyEarnings: { date, coins: 0 }, xp: 0, level: 1, lastActiveDate: date,
      tasks: [makeTask('brush', 'Brush teeth', '🪥', { focusDurationMinutes: 2 }), makeTask('toys', 'Tidy toys', '🧸'),
        makeTask('read', 'Read a book', '📖', { reminderEnabled: true, reminderTime: '23:59', focusDurationMinutes: 10 })],
      unlockedAvatars: ['default'], currentAvatar: 'default', activeBackground: 'clean', unlockedBackgrounds: ['clean'],
      activeTheme: 'classic', unlockedThemes: ['classic'], children: [], linkedParents: [], wonPrizes: [],
    }));
    localStorage.setItem('quest-ux-fixture', 'yes');
  });
  try {
    await page.goto('http://127.0.0.1:18183/');
    await page.getByText('Maya’s day', { exact: true }).waitFor();
    await page.waitForTimeout(400); await page.screenshot({ animations: "disabled", path: path.join(output, 'phone-home.png') });
    await page.getByRole('button', { name: 'Open Tidy toys', exact: true }).click();
    await page.getByText('Ready when you are.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Quest name', { exact: true }).count(), 0, 'Row tap must not open edit');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Complete Tidy toys', exact: true }).click();
    await page.getByText('Tidy toys ✓  +33 coins', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Complete Tidy toys', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Options for Tidy toys', exact: true }).click();
    await page.getByRole('button', { name: 'Delete quest', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Open Tidy toys', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Add a quest', exact: true }).click();
    await page.getByRole('button', { name: 'Create my own quest', exact: true }).waitFor();
    await page.waitForTimeout(400); await page.screenshot({ animations: "disabled", path: path.join(output, 'phone-templates.png') });
    await page.getByRole('button', { name: 'Homework', exact: true }).click();
    await page.getByLabel('Quest name', { exact: true }).fill('My homework');
    await page.waitForTimeout(400); await page.screenshot({ animations: "disabled", path: path.join(output, 'phone-quest-form.png') });
    await page.getByRole('button', { name: 'Add quest', exact: true }).click();
    await page.getByRole('button', { name: 'Start My homework', exact: true }).click();
    await page.getByText('FOCUS TIME', { exact: true }).waitFor();
    await page.waitForTimeout(400); await page.screenshot({ animations: "disabled", path: path.join(output, 'phone-focus.png') });
    await page.getByText('Keep timer running', { exact: true }).click();
    await page.getByText('Resume', { exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Prizes', exact: true }).click();
    await page.getByRole('button', { name: 'Choose a goal', exact: true }).click();
    await page.getByLabel('Reward goal name', { exact: true }).fill('Movie night together');
    await page.getByLabel('Reward goal coin target', { exact: true }).fill('300');
    await page.getByRole('button', { name: 'Save goal', exact: true }).click();
    await page.getByText('0 / 300 coins earned', { exact: true }).waitFor();
    await page.waitForTimeout(400); await page.screenshot({ animations: "disabled", path: path.join(output, 'phone-rewards.png') });
    await page.getByRole('tab', { name: 'Shop', exact: true }).click();
    await page.getByRole('button', { name: 'Ember, 100 coins', exact: true }).waitFor();
    await page.waitForTimeout(400); await page.screenshot({ animations: "disabled", path: path.join(output, 'phone-shop.png') });
    await page.setViewportSize({ width: 800, height: 1280 });
    await page.waitForTimeout(400); await page.screenshot({ animations: "disabled", path: path.join(output, 'tablet-shop.png') });
    await page.getByRole('tab', { name: 'Quests', exact: true }).click();
    await page.waitForTimeout(400); await page.screenshot({ animations: "disabled", path: path.join(output, 'tablet-home.png') });
    assert.deepEqual(errors, [], 'No unhandled browser errors');
    console.log(`PASS: home, detail vs edit, completion undo, deletion undo, creation, timer resume, goal creation, mobile/tablet layout. Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
