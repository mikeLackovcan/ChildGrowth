// Browser-only UI regression with synthetic local data. Never signs in or writes to Firebase.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const baseUrl = process.env.QUEST_APP_URL || 'http://127.0.0.1:18195';
const output = process.env.QUEST_FAMILY_SCREENSHOTS || '/tmp/quest-champ-family-flow';
const prefix = 'quest-hero-dab6b:';
const routeUrl = route => `${baseUrl}${route}${process.env.QUEST_STATIC_HTML ? '.html' : ''}`;
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

function task(id, name, icon, done = false) {
  return { id, name, icon, freq: 'daily', diff: 'med', mystery: false, done, date: today };
}

function child(id, name, avatar, coins, tasks) {
  return {
    id, managed: true, name, nickname: id, level: 4, xp: 120, coins, tasks,
    currentAvatar: avatar, unlockedAvatars: ['quest_champ', avatar],
    prizes: ['Movie night', 'Choose dinner'], wonPrizes: [], linkedParents: ['parent-ui'],
    activeTheme: 'classic', unlockedThemes: ['classic'], activeBackground: 'clean',
    unlockedBackgrounds: ['clean'], isApproved: true,
  };
}

function parentState() {
  const alexTasks = [task('brush', 'Brush teeth', '🪥', true), task('read', 'Read a book', '📖')];
  const samTasks = [task('homework', 'Homework', '📚'), task('toys', 'Tidy toys', '🧸')];
  const children = [
    child('alex', 'Alexandra', 'quest_champ', 70, alexTasks),
    child('sam', 'Sam', 'nova', 25, samTasks),
  ];
  return {
    userEmail: 'parent-ui@test.local', userId: 'parent-ui', nickname: 'parent-ui',
    fullName: 'Michaela Parent', role: 'parent', language: 'en', children,
    selectedChildId: 'alex', tasks: alexTasks, coins: 70, xp: 120, level: 4,
    prizes: ['Movie night', 'Choose dinner'], wonPrizes: [], unlockedAvatars: ['quest_champ'],
    currentAvatar: 'quest_champ', activeTheme: 'classic', unlockedThemes: ['classic'],
    activeBackground: 'clean', unlockedBackgrounds: ['clean'], linkedParents: [],
    lastActiveDate: today, dailyEarnings: { date: today, coins: 70 },
  };
}

function childState() {
  return {
    userEmail: 'kid-flow@guest.local', userId: 'guest-local', nickname: 'kid-flow',
    fullName: 'Mia', role: 'child', language: 'en', deviceConnection: 'local',
    children: [], selectedChildId: null, tasks: [task('brush', 'Brush teeth', '🪥')],
    coins: 0, xp: 0, level: 1, prizes: [], wonPrizes: [], linkedParents: [],
    unlockedAvatars: ['quest_champ'], currentAvatar: 'quest_champ',
    activeTheme: 'classic', unlockedThemes: ['classic'], activeBackground: 'clean',
    unlockedBackgrounds: ['clean'], lastActiveDate: today,
  };
}

function registeredChildState() {
  return {
    ...childState(),
    userEmail: 'mia@test.local', userId: 'kid-account', nickname: 'mia-champ', fullName: 'Mia',
    deviceConnection: null,
  };
}

async function seed(page, tag, state) {
  await page.addInitScript(({ prefix, tag, state }) => {
    localStorage.setItem(`${prefix}active_user_tag`, tag);
    localStorage.setItem(`${prefix}user_role_${tag}`, state.role);
    localStorage.setItem(`${prefix}user_language`, state.language);
    localStorage.setItem(`${prefix}mockState_${tag}`, JSON.stringify(state));
  }, { prefix, tag, state });
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.QUEST_BROWSER_CHANNEL || 'chrome' });
  const errors = [];
  try {
    const parentContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const parentPage = await parentContext.newPage();
    parentPage.on('pageerror', error => errors.push(`parent: ${error.message}`));
    await seed(parentPage, 'parent-ui', parentState());
    await parentPage.goto(routeUrl('/parent-dashboard'));
    await parentPage.getByText('Your family', { exact: true }).waitFor();
    await parentPage.getByRole('button', { name: /Alexandra/ }).waitFor();
    await parentPage.getByRole('button', { name: /Sam/ }).click();
    await parentPage.getByText('Show QR code', { exact: true }).waitFor();
    await parentPage.getByText('Lost or new phone', { exact: true }).waitFor();
    await parentPage.getByRole('button', { name: /Show my parent QR/ }).waitFor();
    await parentPage.getByLabel('Parent QR code for a child to connect', { exact: true }).waitFor();
    await parentPage.getByText('@parent-ui', { exact: true }).waitFor();
    await parentPage.getByText('Scan child QR', { exact: true }).click();
    await parentPage.getByRole('heading', { name: 'Scan child QR', exact: true }).waitFor();
    await parentPage.getByLabel('Child code or @nickname', { exact: true }).fill('mia-champ');
    assert.equal(await parentPage.getByRole('button', { name: 'Send connection request', exact: true }).isEnabled(), true, 'A valid child nickname enables parent connection');
    await parentPage.screenshot({ animations: 'disabled', fullPage: true, path: path.join(output, 'parent-connect-child-phone.png') });
    await parentPage.goto(routeUrl('/parent-dashboard'));
    await parentPage.getByText('Your family', { exact: true }).waitFor();
    assert.equal(await parentPage.getByLabel('Email address').count(), 0, 'Family pairing must not ask for a child email');
    await parentPage.screenshot({ animations: 'disabled', fullPage: true, path: path.join(output, 'parent-phone.png') });

    await parentPage.setViewportSize({ width: 800, height: 1280 });
    await parentPage.screenshot({ animations: 'disabled', fullPage: true, path: path.join(output, 'parent-tablet.png') });
    await parentPage.getByRole('button', { name: 'Sign out', exact: true }).click();
    await parentPage.getByRole('button', { name: /Kid mode/ }).waitFor();
    assert.equal(new URL(parentPage.url()).pathname, '/', 'Sign out must replace the route with the initial screen');
    await parentContext.close();

    const childContext = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 });
    const childPage = await childContext.newPage();
    childPage.on('pageerror', error => errors.push(`child: ${error.message}`));
    await seed(childPage, 'kid-flow', childState());
    await childPage.goto(routeUrl('/link-account'));
    await childPage.getByText('Connect with parent', { exact: true }).waitFor();
    await childPage.getByLabel('Pairing code', { exact: true }).fill('ABCD-EFGH-2345');
    await childPage.getByRole('button', { name: 'Connect', exact: true }).waitFor();
    assert.equal(await childPage.getByRole('button', { name: 'Connect', exact: true }).isEnabled(), true, 'A valid code enables Connect');
    assert.equal(await childPage.getByLabel('Email address').count(), 0, 'Kid recovery must use a family code, not email');
    await childPage.screenshot({ animations: 'disabled', fullPage: true, path: path.join(output, 'child-code-phone.png') });
    await childContext.close();

    const accountContext = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 });
    const accountPage = await accountContext.newPage();
    accountPage.on('pageerror', error => errors.push(`child-account: ${error.message}`));
    await seed(accountPage, 'mia-champ', registeredChildState());
    await accountPage.goto(routeUrl('/link-account'));
    await accountPage.getByRole('heading', { name: 'Connect your family', exact: true }).waitFor();
    await accountPage.getByLabel('QR code for a parent to connect this child account', { exact: true }).waitFor();
    await accountPage.getByText('@mia-champ', { exact: true }).waitFor();
    await accountPage.getByLabel('Parent code or @nickname', { exact: true }).fill('parent-ui');
    assert.equal(await accountPage.getByRole('button', { name: 'Send request', exact: true }).isEnabled(), true, 'A signed-in child can initiate account linking');
    await accountPage.screenshot({ animations: 'disabled', fullPage: true, path: path.join(output, 'child-account-qr-phone.png') });
    await accountPage.goto(routeUrl('/'));
    await accountPage.getByText('Connect my family', { exact: true }).waitFor();
    await accountContext.close();

    for (const [language, title] of Object.entries({
      en: 'Connect your family', cs: 'Propojit rodinu', es: 'Conecta a tu familia', de: 'Familie verbinden',
    })) {
      const localeContext = await browser.newContext({ viewport: { width: 320, height: 700 }, deviceScaleFactor: 1 });
      const localePage = await localeContext.newPage();
      localePage.on('pageerror', error => errors.push(`${language}-child-account: ${error.message}`));
      await seed(localePage, `mia-${language}`, { ...registeredChildState(), nickname: `mia-${language}`, language });
      await localePage.goto(routeUrl('/link-account'));
      await localePage.getByRole('heading', { name: title, exact: true }).waitFor();
      const overflow = await localePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false, `${language} child QR must not overflow at 320px`);
      await localeContext.close();
    }

    const germanContext = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 });
    const germanPage = await germanContext.newPage();
    germanPage.on('pageerror', error => errors.push(`de: ${error.message}`));
    const german = { ...parentState(), language: 'de' };
    await seed(germanPage, 'parent-ui', german);
    await germanPage.goto(routeUrl('/parent-dashboard'));
    await germanPage.getByText('Deine Familie', { exact: true }).waitFor();
    const overflow = await germanPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert.equal(overflow, false, 'German parent dashboard must not overflow horizontally at 360px');
    await germanPage.screenshot({ animations: 'disabled', fullPage: true, path: path.join(output, 'parent-german-360.png') });
    await germanContext.close();

    assert.deepEqual(errors, [], 'No unhandled browser errors');
    console.log(`PASS: parent switching, bidirectional account QR linking, recovery controls, parent claim screen, first-parent linking, logout routing, phone/tablet and German narrow layout. Screenshots: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
