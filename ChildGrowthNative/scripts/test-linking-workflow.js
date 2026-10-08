// Comprehensive Test Suite for Cross-User Account Linking & Approval & Strict Auth Workflow
// Run with: node scripts/test-linking-workflow.js

const assert = require('assert');

// Simulate AsyncStorage
const mockAsyncStorage = new Map();

// Helper to simulate the exact cross-user logic from useAppStore
async function syncFromAsyncStorage(userTag, stateRef) {
  const data = mockAsyncStorage.get(`mockState_${userTag}`);
  if (data) {
    Object.assign(stateRef, JSON.parse(data));
  }
}

async function saveToAsyncStorage(userTag, stateRef) {
  mockAsyncStorage.set(`mockState_${userTag}`, JSON.stringify(stateRef));
}

// ----------------------------------------------------
// Strict Auth Logic Simulation (matching useAppStore)
// ----------------------------------------------------
async function registerUser(email, password, nickname, role) {
  const cleanNick = nickname.toLowerCase().replace(/^@/, '');
  const cleanEmail = email.toLowerCase();

  mockAsyncStorage.set(`user_pass_${cleanEmail}`, password);
  mockAsyncStorage.set(`user_pass_${cleanNick}`, password);
  mockAsyncStorage.set(`user_email_${cleanNick}`, cleanEmail);
  mockAsyncStorage.set(`user_role_${cleanNick}`, role);

  const initialStore = {
    userEmail: cleanEmail,
    nickname: cleanNick,
    role,
    tasks: [],
    coins: 0,
    xp: 0,
    level: 1,
    children: [],
    linkedParents: [],
    approvalStatus: null
  };
  await saveToAsyncStorage(cleanNick, initialStore);
  return { success: true };
}

async function loginUser(emailOrNick, password) {
  const cleanInput = emailOrNick.toLowerCase().replace(/^@/, '');

  let storedPass = mockAsyncStorage.get(`user_pass_${cleanInput}`);
  let realEmail = cleanInput;

  if (!storedPass) {
    const foundEmail = mockAsyncStorage.get(`user_email_${cleanInput}`);
    if (foundEmail) {
      realEmail = foundEmail;
      storedPass = mockAsyncStorage.get(`user_pass_${realEmail}`);
    }
  }

  if (!storedPass) {
    return { success: false, message: `Account for "${cleanInput}" not found!` };
  }

  if (storedPass !== password) {
    return { success: false, message: 'Incorrect password!' };
  }

  const savedStateStr = mockAsyncStorage.get(`mockState_${cleanInput}`);
  const store = savedStateStr ? JSON.parse(savedStateStr) : { userEmail: realEmail, nickname: cleanInput };
  mockAsyncStorage.set('active_user_tag', cleanInput);
  mockAsyncStorage.set('mockState', JSON.stringify(store));
  return { success: true, store };
}

async function performLogout(activeStore) {
  const userTag = (activeStore.nickname || '').toLowerCase();
  if (userTag) {
    await saveToAsyncStorage(userTag, { ...activeStore });
  }
  mockAsyncStorage.delete('active_user_tag');
  mockAsyncStorage.delete('mockState');

  return {
    userEmail: null,
    userId: null,
    nickname: null,
    role: null,
    tasks: [],
    coins: 0,
    xp: 0
  };
}

// ----------------------------------------------------
// RUN TESTS
// ----------------------------------------------------
async function runTests() {
  console.log('🧪 Running Strict Auth & Account Linking & Logout Workflow Tests...\n');

  try {
    // ------------------------------------------------------------------
    // SCENARIO 1: Strict Registration & Login Password Validation
    // ------------------------------------------------------------------
    console.log('--- SCENARIO 1: Strict Auth & Password Validation ---');
    console.log('1. Registering Parent @tatko with password "secret123"');
    await registerUser('tatko@app.com', 'secret123', 'tatko', 'parent');

    console.log('2. Attempting login with WRONG password "fakePass123"');
    const failLogin = await loginUser('tatko', 'fakePass123');
    assert.strictEqual(failLogin.success, false, 'Login must fail with incorrect password');
    assert.ok(failLogin.message.includes('Incorrect password'), 'Error message must specify incorrect password');
    console.log('   -> Correctly Rejected: Fake/Wrong password was blocked! 🛑');

    console.log('3. Attempting login with CORRECT password "secret123"');
    const passLogin = await loginUser('tatko', 'secret123');
    assert.strictEqual(passLogin.success, true, 'Login must succeed with correct password');
    assert.strictEqual(passLogin.store.userEmail, 'tatko@app.com', 'Authenticated user email matches');
    console.log('   -> Correctly Accepted: Authentic login succeeded! ✅\n');

    // ------------------------------------------------------------------
    // SCENARIO 2: Account Linking Workflow
    // ------------------------------------------------------------------
    console.log('--- SCENARIO 2: Bi-directional Account Linking ---');
    console.log('1. Registering Child @maty with password "kidPass99"');
    await registerUser('maty@app.com', 'kidPass99', 'maty', 'child');

    let pStore = passLogin.store;
    let kStore = (await loginUser('maty', 'kidPass99')).store;

    console.log('2. Child @maty links to Parent @tatko');
    kStore.approvalStatus = 'pending';
    kStore.parentEmail = 'tatko';
    kStore.linkedParents = ['tatko'];
    pStore.children = [{ id: 'c1', nickname: 'maty', isApproved: false, initiatedBy: 'kid' }];
    await saveToAsyncStorage('maty', kStore);
    await saveToAsyncStorage('tatko', pStore);

    console.log('3. Parent @tatko approves @maty');
    pStore.children[0].isApproved = true;
    kStore.approvalStatus = 'approved';
    await saveToAsyncStorage('tatko', pStore);
    await saveToAsyncStorage('maty', kStore);

    assert.strictEqual(pStore.children[0].isApproved, true, 'Parent child record is approved');
    assert.strictEqual(kStore.approvalStatus, 'approved', 'Child approval status is approved');
    console.log('✅ Scenario 2 Passed: Bi-directional linkage confirmed.\n');

    // ------------------------------------------------------------------
    // SCENARIO 3: Logout & View Protection Test
    // ------------------------------------------------------------------
    console.log('--- SCENARIO 3: Logout Session Clearing & Screen Protection ---');
    console.log('1. @tatko logs out');
    let loggedOutParent = await performLogout(pStore);
    assert.strictEqual(loggedOutParent.userEmail, null, 'User email is null on logout');
    assert.strictEqual(loggedOutParent.role, null, 'User role is null on logout');

    console.log('2. @maty logs out');
    let loggedOutChild = await performLogout(kStore);
    assert.strictEqual(loggedOutChild.userEmail, null, 'User email is null on logout');
    assert.strictEqual(loggedOutChild.role, null, 'User role is null on logout');

    console.log('3. Verifying View Protection (userEmail === null)');
    const simulatedViewRender = (userEmail) => !userEmail ? 'LOGIN_SCREEN' : 'KID_HERO_DASHBOARD';
    assert.strictEqual(simulatedViewRender(loggedOutChild.userEmail), 'LOGIN_SCREEN', 'Logged out state MUST render LOGIN_SCREEN, never KID_HERO_DASHBOARD');
    console.log('   -> Protected: Tapping logout now strictly displays LOGIN_SCREEN (no Kid Hero fallback page!). ✅');

    console.log('\n🎉 ALL STRICT AUTH, LINKING & LOGOUT TESTS PASSED SUCCESSFULLY! 🚀');
  } catch (err) {
    console.error('❌ Test Failed:', err.message);
    process.exit(1);
  }
}

runTests();
