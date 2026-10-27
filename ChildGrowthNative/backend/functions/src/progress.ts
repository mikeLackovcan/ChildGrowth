import { normalizeOutfits, validOutfit } from '../../../src/utils/fighterOutfits';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { authenticated, db, digest, requestKey, text } from './core';
import { validZone } from './pushPolicy';
import { calculateQuestReward, AVATAR_SKILL_CONFIGS, getAvatarSkillConfig } from '../../../src/utils/avatarSkills';
import { WORLD_THEMES, ThemeKey } from '../../../src/constants/theme';
import type { Task, WonPrize } from '../../../src/types/progress';
import { questOnDay, reviewedQuest } from '../../../src/utils/questDay';

const failure = (message: string): never => { throw new HttpsError('failed-precondition', message); };
function boundedText(value: unknown, max: number, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) return failure('INVALID_INPUT');
  return value.trim();
}
export function progressDay(time: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(time));
  const part = (name: string) => parts.find(item => item.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
const frequencies = ['daily', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'weekdays', 'weekends'];
function scheduled(task: Task, day: string) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (task.postponedUntil) return task.postponedUntil <= day;
  return task.isRolling || task.freq === 'daily' || task.freq === frequencies[weekday === 0 ? 7 : weekday] ||
    (task.freq === 'weekdays' && weekday > 0 && weekday < 6) || (task.freq === 'weekends' && (weekday === 0 || weekday === 6));
}
function validateTask(input: any, parent: boolean, linked: boolean, day: string): Task {
  const task: Task = { id: text(input?.id, 80), name: boundedText(input?.name, 500),
    diff: input?.diff, freq: input?.freq, mystery: input?.mystery === true,
    revision: 0, done: false, date: day, ownerRole: parent ? 'parent' : 'child' };
  if (!['easy', 'med', 'hard'].includes(task.diff) || !frequencies.includes(task.freq)) return failure('INVALID_TASK');
  if (input.shortName !== undefined) task.shortName = boundedText(input.shortName, 50, true);
  if (input.icon !== undefined) task.icon = boundedText(input.icon, 32, true);
  if (input.reminderMode !== undefined) {
    if (!['notification', 'alarm'].includes(input.reminderMode)) return failure('INVALID_REMINDER');
    task.reminderMode = input.reminderMode;
  }
  if (input.reminderTime !== undefined) {
    const reminder = boundedText(input.reminderTime, 5, true);
    if (reminder && !/^(0[7-9]|1[0-9]):[0-5][0-9]$/.test(reminder)) return failure('INVALID_REMINDER');
    task.reminderTime = reminder;
  }
  for (const key of ['isRolling', 'canPostpone', 'requiresApproval'] as const) if (input[key] !== undefined) task[key] = input[key] === true;
  if (!parent && linked) { task.diff = 'easy'; task.requiresApproval = true; }
  return task;
}
export interface ProgressContext { parent: boolean; linked: boolean; day: string; time: number; random: (limit: number) => number; operationId?: string; actorUid?: string }

// Pure transition logic. Currency, reward receipts and ownership are derived
// here; client-supplied totals are never inputs to a progress operation.
export function progressTransition(profileInput: any, dataInput: any, action: string, payload: any, context: ProgressContext) {
  const profile = structuredClone(profileInput), data = structuredClone(dataInput);
  const { parent, linked, day, time } = context;
  data.tasks ||= []; data.prizes ||= []; data.won_prizes ||= []; data.unlocked_avatars ||= ['roblox_noob'];
  data.unlockedThemes ||= ['classic']; data.activeTheme ||= 'classic';
  profile.coins ??= 0; profile.xp ??= 0; profile.level ??= 1; profile.current_avatar ||= 'roblox_noob';
  if (data.lastActiveDate && data.lastActiveDate > day) return failure('DAY_MOVED_BACKWARDS');
  if (data.lastActiveDate !== day) {
    const hadProgress = data.tasks.some((task: Task) => task.done) || !!data.epicClaimedDate;
    const consecutive = data.lastActiveDate && Date.parse(`${day}T12:00:00Z`) - Date.parse(`${data.lastActiveDate}T12:00:00Z`) === 86400000;
    data.streak = consecutive && hadProgress ? (data.streak || 1) + 1 : data.isSick || getAvatarSkillConfig(profile.current_avatar).hasStreakShield ? data.streak || 1 : 1;
    data.tasks = data.tasks.map((task: Task) => questOnDay(task, day));
    data.lastActiveDate = day; data.epicClaimedDate = null; data.dailyMood = null; data.superchargedTaskId = null;
  }
  const tasks = data.tasks as Task[], prizes = data.won_prizes as WonPrize[];
  const active = () => tasks.filter(task => scheduled(task, day));
  const taskById = () => { const task = tasks.find(task => task.id === payload?.id); return task || failure('QUEST_NOT_FOUND'); };
  const checkRevision = (task: Task) => {
    if ((payload?.expectedRevision ?? 0) !== (task.revision ?? 0)) return failure('QUEST_CHANGED');
  };
  const prizeById = () => { const prize = prizes.find(prize => prize.id === payload?.id); return prize || failure('PRIZE_NOT_FOUND'); };
  const canEdit = (task: Task) => parent || task.ownerRole === 'child' || (!task.ownerRole && !linked);
  const award = (xp: number, coins: number) => {
    const total = Math.max(0, (profile.level - 1) * 100 + profile.xp + xp);
    profile.level = Math.floor(total / 100) + 1; profile.xp = total % 100;
    profile.coins = Math.max(0, profile.coins + coins);
  };
  const taskReward = (task: Task) => calculateQuestReward((task.diff === 'hard' ? 35 : task.diff === 'med' ? 20 : 10) + (task.mystery ? 10 : 0),
    task.diff, profile.current_avatar, task.mystery, active().filter(task => task.done).length, data.superchargedTaskId === task.id);
  let result: any = { ok: true };
  switch (action) {
    case 'recovery.quest': {
      if (!linked) return failure('FAMILY_REQUIRED');
      const original = payload?.original;
      const originalId = requestKey(original?.requestId);
      if (!['task.complete', 'task.submit'].includes(original?.action) || !/^\d{4}-\d{2}-\d{2}$/.test(original?.day || '') ||
          !Number.isFinite(Date.parse(`${original.day}T12:00:00Z`)) || new Date(`${original.day}T12:00:00Z`).toISOString().slice(0, 10) !== original.day || original.day >= day) return failure('INVALID_RECOVERY');
      const task = tasks.find(task => task.id === original?.payload?.id);
      if (!task) return failure('QUEST_NOT_FOUND');
      const sourceId = `offline:${context.actorUid}:${originalId}`, sourceKey = digest(sourceId);
      data.recoveryRequests ||= [];
      if ((data.recoveredSources || []).includes(sourceKey)) { result = { ok: true, alreadyRecovered: true }; break; }
      if (data.recoveryRequests.some((request: any) => request.sourceKey === sourceKey)) break;
      if (data.recoveryRequests.length >= 3 || (data.recoveredSources || []).length >= 100) return failure('RECOVERY_LIMIT');
      const reward = calculateQuestReward((task.diff === 'hard' ? 35 : task.diff === 'med' ? 20 : 10) + (task.mystery ? 10 : 0), task.diff, profile.current_avatar, task.mystery, 0, false);
      data.recoveryRequests.push({ id: context.operationId || digest(`${sourceId}:${time}`), sourceKey, sourceId, kind: 'quest', submittedAt: new Date(time).toISOString(),
        quest: { id: task.id, name: task.name, day: original.day, reward } });
      break;
    }
    case 'recovery.request': {
      if (!linked) return failure('FAMILY_REQUIRED');
      const sourceId = boundedText(payload?.sourceId, 160);
      const sourceKey = digest(sourceId);
      const completed = data.recoveredSources || [];
      if (completed.includes(sourceKey)) { result = { ok: true, alreadyRecovered: true }; break; }
      data.recoveryRequests ||= [];
      if (data.recoveryRequests.some((request: any) => request.sourceKey === sourceKey)) break;
      if (data.recoveryRequests.length >= 3 || completed.length >= 100) return failure('RECOVERY_LIMIT');
      const claim = payload?.claim;
      if (!claim || !Number.isInteger(claim.coins) || claim.coins < 0 || claim.coins > 100000 ||
          !Number.isInteger(claim.level) || claim.level < 1 || claim.level > 1000 ||
          !Number.isInteger(claim.xp) || claim.xp < 0 || claim.xp > 99 ||
          !Array.isArray(claim.tasks) || claim.tasks.length > 100 || !Array.isArray(claim.wonPrizes) || claim.wonPrizes.length > 100 ||
          !Array.isArray(claim.unlockedAvatars) || claim.unlockedAvatars.length > AVATAR_SKILL_CONFIGS.length) return failure('INVALID_RECOVERY');
      const fighters = [...new Set(claim.unlockedAvatars)] as string[];
      if (fighters.some(id => !AVATAR_SKILL_CONFIGS.some(fighter => fighter.id === id))) return failure('INVALID_RECOVERY');
      const recoveredTasks = claim.tasks.map((task: any) => ({ ...validateTask(task, true, true, day), requiresApproval: true }));
      const recoveredPrizes = claim.wonPrizes.map((prize: any, index: number) => ({ id: prize.id ? text(prize.id, 80) : `recovered-${sourceKey.slice(0, 16)}-${index}`,
        prize: boundedText(prize.prize, 200), date: Number.isFinite(Date.parse(prize.date)) ? new Date(prize.date).toISOString() : new Date(time).toISOString(), redeemed: prize.redeemed === true, status: 'approved' }));
      const dates: Record<string, string | null> = {};
      for (const field of ['lastSpinDate', 'dailyChestClaimedDate', 'epicClaimedDate']) {
        const value = claim[field];
        if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value || value > day)) return failure('INVALID_RECOVERY');
        dates[field] = value || null;
      }
      data.recoveryRequests.push({ id: context.operationId || digest(`${sourceId}:${time}`), sourceKey, sourceId, kind: 'snapshot', submittedAt: new Date(time).toISOString(), claim: {
        coins: claim.coins, level: claim.level, xp: claim.xp, unlockedAvatars: fighters, tasks: recoveredTasks, wonPrizes: recoveredPrizes, ...dates,
      } });
      break;
    }
    case 'recovery.review': {
      if (!parent || typeof payload?.approved !== 'boolean') return failure('PARENT_REQUIRED');
      const id = text(payload?.id, 80);
      const request = (data.recoveryRequests || []).find((item: any) => item.id === id);
      if (!request) break;
      if (payload.approved && request.kind === 'quest') {
        award(request.quest.reward.xpGain, request.quest.reward.coinGain);
        data.recoveredSources = [...(data.recoveredSources || []), request.sourceKey];
      } else if (payload.approved) {
        const claim = request.claim;
        profile.coins = Math.max(profile.coins, claim.coins);
        const currentXP = (profile.level - 1) * 100 + profile.xp;
        const recoveredXP = (claim.level - 1) * 100 + claim.xp;
        const totalXP = Math.max(currentXP, recoveredXP);
        profile.level = Math.floor(totalXP / 100) + 1; profile.xp = totalXP % 100;
        data.unlocked_avatars = [...new Set([...data.unlocked_avatars, ...claim.unlockedAvatars])];
        for (const recovered of claim.tasks) {
          if (!tasks.some(task => task.id === recovered.id || task.name === recovered.name)) {
            if (tasks.length >= 100) return failure('QUEST_LIMIT');
            tasks.push({ ...recovered, date: day, done: false, requiresApproval: true });
          }
        }
        for (const prize of claim.wonPrizes) if (!prizes.some(existing => existing.id === prize.id || (existing.prize === prize.prize && existing.date === prize.date))) prizes.push(prize);
        for (const field of ['lastSpinDate', 'dailyChestClaimedDate', 'epicClaimedDate']) if (claim[field] && (!data[field] || data[field] < claim[field])) data[field] = claim[field];
        data.recoveredSources = [...(data.recoveredSources || []), request.sourceKey];
      }
      data.recoveryRequests = data.recoveryRequests.filter((item: any) => item.id !== id);
      break;
    }
    case 'day.refresh': break;
    case 'task.create': {
      if (tasks.length >= 100) return failure('QUEST_LIMIT');
      const task = validateTask(payload, parent, linked, day);
      if (tasks.some(existing => existing.id === task.id)) return failure('QUEST_EXISTS');
      tasks.push(task); break;
    }
    case 'task.update': {
      const task = taskById(); if (!canEdit(task)) return failure('PARENT_REQUIRED');
      checkRevision(task);
      const changes = payload?.changes;
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return failure('INVALID_TASK');
      const fields = parent ? ['name', 'shortName', 'icon', 'reminderTime', 'reminderMode', 'diff', 'freq', 'mystery', 'isRolling', 'canPostpone', 'requiresApproval'] : ['name', 'shortName', 'icon', 'reminderTime', 'reminderMode'];
      if (Object.keys(changes).some(key => !fields.includes(key))) return failure('INVALID_TASK_EDIT');
      const checked = validateTask({ ...task, ...changes }, parent, linked, day);
      for (const key of Object.keys(changes)) (task as any)[key] = (checked as any)[key];
      // Unique tokens prevent a later offline edit from matching a different
      // device's revision after its prerequisite edit was rejected.
      const nextRevision = requestKey(payload.nextRevision || context.operationId || `revision-${time}-${randomInt(1000000000)}`);
      if (nextRevision === task.revision) return failure('INVALID_TASK_EDIT');
      task.revision = nextRevision;
      if (parent) task.ownerRole = 'parent';
      break;
    }
    case 'task.delete': {
      const task = taskById(); if (!canEdit(task)) return failure('PARENT_REQUIRED');
      if (task.pendingApproval) return failure('QUEST_REVIEW_REQUIRED');
      checkRevision(task);
      data.tasks = tasks.filter(item => item.id !== task.id); break;
    }
    case 'tasks.clear':
      if (!parent && linked) return failure('PARENT_REQUIRED');
      if (tasks.some(task => task.pendingApproval)) return failure('QUEST_REVIEW_REQUIRED');
      if (!Array.isArray(payload?.expectedTasks) || payload.expectedTasks.length !== tasks.length ||
        !tasks.every(task => payload.expectedTasks.some((expected: any) => expected.id === task.id && expected.revision === (task.revision ?? 0)))) return failure('QUEST_CHANGED');
      data.tasks = []; break;
    case 'task.start': {
      const task = taskById(); if (!task.done && !task.pendingApproval && !data.isSick) task.startedAt = new Date(time).toISOString(); break;
    }
    case 'task.help': { const task = taskById(); if (!task.done) task.helpRequested = true; break; }
    case 'task.helpResolved': { if (!parent) return failure('PARENT_REQUIRED'); taskById().helpRequested = false; break; }
    case 'task.postpone': {
      const task = taskById(); if (!parent && !task.canPostpone) return failure('POSTPONE_NOT_ALLOWED');
      const target = text(payload?.day, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(target) || !Number.isFinite(Date.parse(`${target}T12:00:00Z`)) || new Date(`${target}T12:00:00Z`).toISOString().slice(0, 10) !== target || target <= day || Date.parse(`${target}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`) > 30 * 86400000) return failure('INVALID_DAY');
      task.postponedUntil = target; task.originalDate ||= task.date; break;
    }
    case 'task.restore': { const task = taskById(); if (!parent && !task.canPostpone) return failure('POSTPONE_NOT_ALLOWED'); delete task.postponedUntil; break; }
    case 'task.complete': case 'task.submit': {
      const task = taskById();
      if (task.done || task.pendingApproval) break;
      checkRevision(task);
      if (data.isSick || !scheduled(task, day)) return failure('QUEST_NOT_READY');
      if (action === 'task.submit' || (task.requiresApproval && !parent)) {
        task.pendingApproval = true;
        task.pendingSubmissionId = payload?.submissionId ? requestKey(payload.submissionId) : context.operationId || `submission-${time}-${task.id}`;
        task.pendingReward = taskReward(task);
        delete task.lastReview;
        if (payload?.note) task.verificationNote = boundedText(payload.note, 500);
      } else {
        const reward = taskReward(task); task.done = true; task.awardedReward = reward; task.helpRequested = false;
        award(reward.xpGain, reward.coinGain); result = reward;
      }
      break;
    }
    case 'task.review': {
      if (!parent || typeof payload?.approved !== 'boolean') return failure('PARENT_REQUIRED');
      const task = taskById(); if (task.done || !task.pendingApproval) break;
      if (task.pendingSubmissionId && task.pendingSubmissionId !== payload.submissionId) return failure('REVIEW_CHANGED');
      const reward = task.pendingReward || taskReward(task);
      Object.assign(task, reviewedQuest(task, payload.approved, reward, day, time));
      if (payload.approved) { award(reward.xpGain, reward.coinGain); result = reward; }
      break;
    }
    case 'task.undo': {
      if (!parent) return failure('PARENT_REQUIRED'); const task = taskById();
      if (task.done) { if (task.awardedReward) award(-task.awardedReward.xpGain, -task.awardedReward.coinGain); task.done = false; delete task.awardedReward; }
      break;
    }
    case 'epic.configure': {
      if (!parent && linked) return failure('PARENT_REQUIRED');
      if (!Number.isInteger(payload?.xp) || payload.xp < 1 || payload.xp > 500) return failure('INVALID_REWARD');
      data.epicBossTask = boundedText(payload?.name, 500); data.epicBossXP = payload.xp; break;
    }
    case 'epic.claim': {
      if (data.epicClaimedDate === day) break;
      if (data.isSick || !active().every(task => task.done && !task.pendingApproval)) return failure('QUESTS_FIRST');
      const reward = calculateQuestReward(data.epicBossXP || 35, 'boss', profile.current_avatar, false, active().length);
      data.epicClaimedDate = day; award(reward.xpGain, reward.coinGain); result = reward; break;
    }
    case 'chest.claim': {
      if (data.dailyChestClaimedDate === day) break;
      const coins = 25 + Math.min(40, (data.streak || 1) * 5) + context.random(15), xp = 20 + Math.min(20, (data.streak || 1) * 2);
      data.dailyChestClaimedDate = day; award(xp, coins); result = { coins, xp }; break;
    }
    case 'prizes.configure': {
      if (!parent && linked) return failure('PARENT_REQUIRED');
      if (!Array.isArray(payload?.prizes) || payload.prizes.length > 40) return failure('INVALID_PRIZES');
      data.prizes = [...new Set(payload.prizes.map((prize: unknown) => boundedText(prize, 200)))]; break;
    }
    case 'prize.spin': {
      if (data.lastSpinDate === day) { result = prizes.find(prize => prize.id === `spin-${day}`) || null; break; }
      if (data.isSick || !data.prizes.length || data.epicClaimedDate !== day || !active().every(task => task.done && !task.pendingApproval)) return failure('QUESTS_FIRST');
      const prize: WonPrize = { id: `spin-${day}`, prize: data.prizes[context.random(data.prizes.length)], date: new Date(time).toISOString(), redeemed: false, pool: [...data.prizes] };
      data.lastSpinDate = day; prizes.unshift(prize); result = prize; break;
    }
    case 'prize.request': { const prize = prizeById(); if (!prize.redeemed && !prize.status) prize.status = 'requested'; break; }
    case 'prize.approve': { if (!parent) return failure('PARENT_REQUIRED'); const prize = prizeById(); if (prize.status === 'requested') prize.status = 'approved'; break; }
    case 'prize.redeem': {
      const prize = prizeById(); if (!parent && linked && prize.status !== 'approved') return failure('PARENT_REQUIRED');
      if (typeof payload?.redeemed !== 'boolean') return failure('INVALID_INPUT'); prize.redeemed = payload.redeemed; break;
    }
    case 'outfit.equip': {
      const fighter = payload?.fighter;
      if (!AVATAR_SKILL_CONFIGS.some(item => item.id === fighter) || !validOutfit(fighter, payload?.outfit)) return failure('INVALID_INPUT');
      if (fighter !== 'roblox_noob' && !data.unlocked_avatars.includes(fighter)) return failure('FIGHTER_NOT_OWNED');
      data.fighterOutfits = normalizeOutfits({ ...normalizeOutfits(data.fighterOutfits), [fighter]: payload.outfit });
      break;
    }
    case 'fighter.buy': {
      const fighter = AVATAR_SKILL_CONFIGS.find(fighter => fighter.id === payload?.id); if (!fighter) return failure('INVALID_FIGHTER');
      if (!data.unlocked_avatars.includes(fighter.id)) {
        if (profile.coins < fighter.price) return failure('NOT_ENOUGH_COINS');
        profile.coins -= fighter.price; data.unlocked_avatars.push(fighter.id);
      }
      profile.current_avatar = fighter.id; break;
    }
    case 'fighter.equip': {
      if (payload?.id !== 'roblox_noob' && !data.unlocked_avatars.includes(payload?.id)) return failure('FIGHTER_NOT_OWNED');
      if (!AVATAR_SKILL_CONFIGS.some(fighter => fighter.id === payload?.id)) return failure('INVALID_FIGHTER');
      profile.current_avatar = payload.id; break;
    }
    case 'theme.buy': case 'theme.equip': {
      if (!['classic', 'space', 'fantasy', 'cyberpunk'].includes(payload?.id)) return failure('INVALID_THEME');
      const theme = WORLD_THEMES[payload?.id as ThemeKey]; if (!theme) return failure('INVALID_THEME');
      if (!data.unlockedThemes.includes(theme.id)) {
        if (action !== 'theme.buy' || profile.coins < theme.price) return failure('NOT_ENOUGH_COINS');
        profile.coins -= theme.price; data.unlockedThemes.push(theme.id);
      }
      data.activeTheme = theme.id; break;
    }
    case 'rest.set': if (typeof payload?.enabled !== 'boolean') return failure('INVALID_INPUT'); data.isSick = payload.enabled; break;
    case 'mood.set': if (![null, 'wiped', 'thriving', 'too_easy'].includes(payload?.mood)) return failure('INVALID_INPUT'); data.dailyMood = payload.mood; break;
    case 'supercharge.set': {
      if (data.superchargedTaskId && data.superchargedTaskId !== payload?.id) return failure('SUPERCHARGE_USED');
      const task = taskById(); if (task.done) return failure('QUEST_NOT_READY'); data.superchargedTaskId = task.id; break;
    }
    default: return failure('UNKNOWN_PROGRESS_ACTION');
  }
  profile.updated_at = new Date(time).toISOString(); data.updated_at = profile.updated_at;
  // Strip optional undefined values before passing the result to Firestore.
  return JSON.parse(JSON.stringify({ profile, data, result }));
}

export const applyProgress = onCall(async request => {
  const uid = authenticated(request), targetUid = text(request.data?.targetUid), action = text(request.data?.action, 40);
  const key = requestKey(request.data?.requestId), timeZone = request.data?.timeZone;
  const operationDay = text(request.data?.day, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(operationDay)) throw new HttpsError('invalid-argument', 'INVALID_DAY');
  if (!validZone(timeZone)) throw new HttpsError('invalid-argument', 'INVALID_TIMEZONE');
  const payload = request.data?.payload || {};
  if (JSON.stringify(payload).length > 30000) throw new HttpsError('invalid-argument', 'PAYLOAD_TOO_LARGE');
  const fingerprint = digest(JSON.stringify([targetUid, action, payload, timeZone, operationDay]));
  const ref = db.doc(`progressReceipts/${digest(`${uid}:${key}`)}`);
  return db.runTransaction(async transaction => {
    const [receipt, profileSnap, dataSnap, actorSnap, links, originalReceipt] = await Promise.all([
      transaction.get(ref), transaction.get(db.doc(`profiles/${targetUid}`)), transaction.get(db.doc(`user_data/${targetUid}`)),
      transaction.get(db.doc(`profiles/${uid}`)), transaction.get(db.collection('familyLinks').where('childUid', '==', targetUid).where('status', '==', 'accepted')),
      action === 'recovery.quest' ? transaction.get(db.doc(`progressReceipts/${digest(`${uid}:${requestKey(payload?.original?.requestId)}`)}`)) : Promise.resolve(null),
    ]);
    const profile = profileSnap.data(), actor = actorSnap.data();
    if (!profile || !actor) throw new HttpsError('not-found', 'ACCOUNT_NOT_FOUND');
    const parent = actor.role === 'parent' && (uid === targetUid || links.docs.some(link => link.data().parentUid === uid));
    if (uid !== targetUid && !parent) throw new HttpsError('permission-denied', 'FAMILY_REQUIRED');
    if (receipt.exists) {
      if (receipt.data()!.fingerprint !== fingerprint) throw new HttpsError('invalid-argument', 'REQUEST_ID_REUSED');
      return { profile, data: dataSnap.data() || {}, result: receipt.data()!.result };
    }
    if (originalReceipt?.exists) {
      if (originalReceipt.data()!.targetUid !== targetUid) throw new HttpsError('permission-denied', 'FAMILY_REQUIRED');
      return { profile, data: dataSnap.data() || {}, result: { ok: true, alreadyRecovered: true } };
    }
    const time = Date.now(), day = progressDay(time, timeZone);
    if (['task.start', 'task.complete', 'task.submit', 'task.undo', 'task.help', 'task.postpone', 'task.restore', 'epic.claim', 'prize.spin', 'chest.claim', 'mood.set', 'supercharge.set'].includes(action) && operationDay !== day) {
      throw new HttpsError('failed-precondition', 'PROGRESS_DAY_CHANGED');
    }
    const next = progressTransition(profile, dataSnap.data() || {}, action, payload, { parent, linked: !links.empty, day, time, random: randomInt, operationId: key, actorUid: uid });
    transaction.set(db.doc(`profiles/${targetUid}`), next.profile);
    transaction.set(db.doc(`user_data/${targetUid}`), next.data);
    transaction.create(ref, { actorUid: uid, targetUid, fingerprint, result: next.result ?? null, createdAt: Timestamp.fromMillis(time) });
    return next;
  });
});
