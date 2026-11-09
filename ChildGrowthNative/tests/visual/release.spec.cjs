const { test, expect } = require('@playwright/test');
const languages = ['en', 'cs'];
const sizes = [{ width: 360, height: 740 }, { width: 412, height: 915 }, { width: 768, height: 1024 }];
const errors = [];
async function setup(page, language, size) {
  await page.setViewportSize(size);
  await page.addInitScript(lang => localStorage.setItem('user_language', lang), language);
  page.on('dialog', dialog => dialog.dismiss());
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('auth-role-child')).toBeVisible();
}
async function login(page, role) {
  await page.getByTestId(`auth-role-${role}`).click();
  await page.getByTestId('auth-input-email').fill(process.env[role === 'parent' ? 'QB_TEST_PARENT_EMAIL' : 'QB_TEST_CHILD_EMAIL']);
  await page.getByTestId('auth-input-password').fill(process.env.QB_TEST_PASSWORD);
  await page.getByTestId('auth-submit-btn').click();
  await expect(page.getByTestId('auth-submit-btn')).not.toBeVisible({ timeout: 40000 });
  await expect(page.getByRole('tab').first()).toBeVisible();
}
async function route(page, pathname) {
  await page.evaluate(path => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, pathname);
  await expect.poll(() => page.evaluate(() => location.pathname)).toBe(pathname);
  await page.locator('[role="button"]').first().waitFor({state:'visible'});
  await page.evaluate(()=>document.fonts.ready);
}
async function audit(page, name, testInfo) {
  await page.evaluate(()=>document.fonts.ready);
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('div,span,button,a')).filter(e => {
    const c=getComputedStyle(e), r=e.getBoundingClientRect();
    if(e.closest('[aria-hidden="true"]')||c.visibility!=='visible'||!r.width||!r.height||e.clientWidth===0) return false;
    if(['auto','scroll'].includes(c.overflowX)||c.textOverflow==='ellipsis'||e.querySelector('svg')) return false;
    if(!Array.from(e.childNodes).some(n=>n.nodeType===3&&n.textContent.trim())) return false;
    return e.scrollWidth>e.clientWidth+3;
  }).map(e=>({text:e.textContent.slice(0,100),width:e.clientWidth,content:e.scrollWidth})).slice(0,30));
  await testInfo.attach(`${name}-overflow`, { body:JSON.stringify(overflow,null,2), contentType:'application/json' });
  expect.soft(overflow, `${name}: overflowing text`).toEqual([]);
  // Capture a reproducible viewport; later runs compare against reviewed baselines.
  await expect.soft(page).toHaveScreenshot(`${name}.png`, { fullPage:false });
}
for(const language of languages) for(const size of sizes) {
  test(`authentication ${language} ${size.width}`, async({page},info)=>{
    await setup(page,language,size);await audit(page,'roles',info);
    for(const role of ['child','parent']) {
      await page.getByTestId(`auth-role-${role}`).click();await audit(page,`${role}-signin`,info);
      await page.getByTestId('auth-tab-register').click();await audit(page,`${role}-register`,info);
      await page.getByTestId('auth-input-nickname').scrollIntoViewIfNeeded();await audit(page,`${role}-register-fields`,info);
      await page.getByTestId('auth-change-role').click();
    }
  });
  for(const role of ['child','parent']) test(`${role} screens ${language} ${size.width}`,async({page},info)=>{
    test.skip(!process.env.QB_TEST_PASSWORD,'Requires explicitly disposable QA accounts');
    errors.length=0;await setup(page,language,size);await login(page,role);
    if(role==='parent') {
      for(const name of language==='cs'?['Přehled','Úkoly','Odměny','Rodina']:['Overview','Quests','Rewards','Family']) {
        await page.getByRole('tab',{name,exact:true}).click();await audit(page,`parent-${name}`,info);
        // Inspect the whole scrollable screen, not just the top viewport.
        await page.evaluate(()=>{for(const e of document.querySelectorAll('div'))if(getComputedStyle(e).overflowY==='auto'||getComputedStyle(e).overflowY==='scroll')e.scrollTop=e.scrollHeight;});
        await audit(page,`parent-${name}-bottom`,info);
      }
      await page.getByRole('tab',{name:language==='cs'?'Odměny':'Rewards',exact:true}).click();
      const reward=page.getByRole('textbox',{name:language==='cs'?'Odměna 1':'Reward 1',exact:true});
      await reward.fill('Ice');await reward.pressSequentially(' cream together', {delay:100});await expect(reward).toHaveValue('Ice cream together');
      // Draft only: do not save over the QA family's prize pool.
    } else {
      for(const path of ['/','/shop','/battle','/milestones','/reminders','/link-account','/sync-recovery']) {
        await route(page,path);await audit(page,path.replaceAll('/','')||'quests',info);
      }
    }
    await route(page,'/manage-tasks');await expect(page.getByTestId('quest-name-input')).toBeVisible();await audit(page,`${role}-add-quest`,info);
    await page.getByRole('radio',{name:language==='cs'?/Čtení/:/Reading/}).click();
    await page.getByRole('radio',{name:language==='cs'?'Zítra':'Tomorrow',exact:true}).click();
    await audit(page,`${role}-tomorrow`,info);
    await page.getByRole('button',{name:language==='cs'?/Vybrat den/:/Pick a day/}).click();await page.getByRole('radio').last().scrollIntoViewIfNeeded();await audit(page,`${role}-calendar`,info);
    await page.getByRole('radio',{name:language==='cs'?/Opakovat/:/Repeat/}).click();await page.getByRole('radio',{name:language==='cs'?'Vybrat dny':'Choose days',exact:true}).click();await page.getByRole('checkbox').last().scrollIntoViewIfNeeded();await audit(page,`${role}-repeat`,info);
    expect(errors).toEqual([]);
  });
}

for (const language of ['es', 'de']) test(`translated authentication ${language}`, async ({page}, info) => {
  await setup(page, language, sizes[0]);
  for (const role of ['child', 'parent']) {
    await page.getByTestId(`auth-role-${role}`).click();
    await audit(page, `${role}-signin-${language}`, info);
    await page.getByTestId('auth-tab-register').click();
    await audit(page, `${role}-register-${language}`, info);
    await page.getByTestId('auth-change-role').click();
  }
});
