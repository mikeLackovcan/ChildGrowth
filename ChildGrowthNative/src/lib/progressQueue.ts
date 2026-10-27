import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';
import { localDay } from '../utils/questDay';

export interface ProgressOperation {
  requestId: string; targetUid: string; action: string; payload: Record<string, unknown>; timeZone: string; day: string;
}
export interface ProgressSnapshot { profile: Record<string, any>; data: Record<string, any>; result: any }
export interface ProgressIssue { operation: ProgressOperation; reason: string; recordedAt: string; archivedAt?: string }
export interface ProgressFlush { snapshots: Record<string, ProgressSnapshot>; results: Record<string, any>; generation: number; needsRefresh: boolean }
const key = (uid: string) => `questblox-progress-outbox:${uid}`;
const issueKey = (uid: string) => `questblox-progress-review:${uid}`;
const refreshNeeded = new Set<string>();
const generations = new Map<string, number>();
const completedResults = new Map<string, any>();
const pendingSnapshots = new Map<string, ProgressFlush['snapshots']>();
const failedWrites = new Map<string, ProgressOperation[]>();
let storageQueue: Promise<unknown> = Promise.resolve(), networkQueue: Promise<unknown> = Promise.resolve();
let writing = 0, sending = 0;
export const progressGeneration = (uid: string) => generations.get(uid) || 0;
export const progressBusy = () => writing > 0 || sending > 0;
const reviewableReasons = ['QUEST_CHANGED', 'QUEST_REVIEW_REQUIRED', 'PROGRESS_DAY_CHANGED', 'REVIEW_CHANGED', 'QUEST_NOT_FOUND', 'PRIZE_NOT_FOUND', 'PARENT_REQUIRED', 'FAMILY_REQUIRED', 'NOT_ENOUGH_COINS', 'FIGHTER_NOT_OWNED', 'QUEST_NOT_READY', 'QUESTS_FIRST', 'POSTPONE_NOT_ALLOWED', 'INVALID_TASK_EDIT', 'QUEST_EXISTS', 'QUEST_LIMIT', 'SUPERCHARGE_USED', 'INVALID_INPUT', 'INVALID_TASK', 'INVALID_REMINDER', 'INVALID_DAY', 'INVALID_REWARD', 'INVALID_PRIZES', 'INVALID_FIGHTER', 'INVALID_THEME', 'INVALID_RECOVERY', 'RECOVERY_LIMIT'];
function rejectionReason(error: any): string | undefined {
  const code = String(error?.code || '').replace(/^functions\//, '');
  if (!['failed-precondition', 'permission-denied', 'invalid-argument', 'not-found'].includes(code)) return;
  return reviewableReasons.find(reason => String(error?.message || '').includes(reason));
}
function checkOwner(uid: string) { if (auth.currentUser?.uid !== uid) throw Error('ACCOUNT_CHANGED'); }
async function readIssues(uid: string): Promise<ProgressIssue[]> {
  const raw = await AsyncStorage.getItem(issueKey(uid));
  const issues = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(issues)) throw Error('INVALID_PROGRESS_REVIEW');
  return issues;
}
export async function readProgressIssues(uid: string) {
  checkOwner(uid);
  const issues = await withStorage(() => readIssues(uid));
  checkOwner(uid); return issues;
}
export async function archiveProgressIssue(uid: string, requestId: string) {
  return withStorage(async () => {
    checkOwner(uid);
    const issues = await readIssues(uid);
    checkOwner(uid);
    await AsyncStorage.setItem(issueKey(uid), JSON.stringify(issues.map(issue => issue.operation.requestId === requestId ? { ...issue, archivedAt: new Date().toISOString() } : issue)));
  });
}
export async function retryProgressIssue(uid: string, requestId: string) {
  checkOwner(uid);
  generations.set(uid, progressGeneration(uid) + 1);
  return withStorage(async () => {
    const issue = (await readIssues(uid)).find(item => item.operation.requestId === requestId);
    if (!issue) throw Error('ISSUE_NOT_FOUND');
    const operations = await read(uid);
    checkOwner(uid);
    if (!operations.some(operation => operation.requestId === requestId)) {
      // Keep the original ID and date. If an earlier response was lost, the
      // server receipt still prevents a second payment after access is restored.
      await AsyncStorage.setItem(key(uid), JSON.stringify([...operations, issue.operation]));
    }
  });
}
export function takeProgressResult(uid: string, requestId: string) {
  const id = `${uid}:${requestId}`, result = completedResults.get(id);
  completedResults.delete(id);
  return result;
}
async function read(uid: string): Promise<ProgressOperation[]> {
  const raw = await AsyncStorage.getItem(key(uid));
  const saved = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(saved)) throw Error('INVALID_PROGRESS_QUEUE');
  return saved;
}
function withStorage<T>(work: () => Promise<T>): Promise<T> {
  writing++;
  const operation = storageQueue.catch(() => {}).then(work).finally(() => { writing--; });
  storageQueue = operation;
  return operation;
}
export async function hasQueuedProgress(uid: string) {
  await storageQueue.catch(() => {});
  return (failedWrites.get(uid)?.length || 0) > 0 || (await read(uid)).length > 0;
}
export function enqueueProgress(uid: string, targetUid: string, action: string, payload: Record<string, unknown> = {}): Promise<ProgressOperation> {
  const operation: ProgressOperation = { targetUid, action, payload: JSON.parse(JSON.stringify(payload)),
    requestId: `progress-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', day: localDay() };
  generations.set(uid, progressGeneration(uid) + 1);
  return withStorage(async () => {
    try {
      const operations = await read(uid);
      const failed = failedWrites.get(uid) || [];
      if (operations.length + failed.length >= 1000) throw Error('PROGRESS_QUEUE_FULL');
      await AsyncStorage.setItem(key(uid), JSON.stringify([...operations, ...failed, operation]));
      failedWrites.delete(uid);
    } catch (error) {
      failedWrites.set(uid, [...(failedWrites.get(uid) || []), operation]);
      throw error;
    }
    return operation;
  });
}
export function flushProgress(uid: string): Promise<ProgressFlush> {
  sending++;
  const operation = networkQueue.catch(() => {}).then(async () => {
    const snapshots = pendingSnapshots.get(uid) || {}, results: ProgressFlush['results'] = {};
    pendingSnapshots.set(uid, snapshots);
    while (true) {
      if (auth.currentUser?.uid !== uid) throw Error('ACCOUNT_CHANGED');
      const generation = progressGeneration(uid);
      const next = await withStorage(async () => {
        const saved = await read(uid), failed = failedWrites.get(uid) || [];
        if (failed.length) {
          await AsyncStorage.setItem(key(uid), JSON.stringify([...saved, ...failed]));
          failedWrites.delete(uid);
          return [...saved, ...failed][0];
        }
        return saved[0];
      });
      if (!next) {
        // An enqueue may have arrived while storage was being read. Drain it
        // before telling the store it can replace optimistic local state.
        if (progressGeneration(uid) !== generation) continue;
        pendingSnapshots.delete(uid);
        const needsRefresh = refreshNeeded.delete(uid);
        return { snapshots, results, generation, needsRefresh };
      }
      let response;
      try {
        response = await httpsCallable<ProgressOperation, ProgressSnapshot>(getFunctions(app, 'europe-west1'), 'applyProgress', { timeout: 15000 })(next);
      } catch (error) {
        checkOwner(uid);
        const reason = rejectionReason(error);
        if (!reason) throw error; // Unknown/network failures remain queued.
        await withStorage(async () => {
          const issues = await readIssues(uid);
          const existing = issues.find(issue => issue.operation.requestId === next.requestId);
          const issue = { operation: next, reason, recordedAt: existing?.recordedAt || new Date().toISOString() };
          // Persist the review copy FIRST. A crash can duplicate a rejected
          // attempt, but cannot lose the original operation.
          await AsyncStorage.setItem(issueKey(uid), JSON.stringify([...issues.filter(item => item.operation.requestId !== next.requestId), issue]));
          await AsyncStorage.setItem(key(uid), JSON.stringify((await read(uid)).filter(item => item.requestId !== next.requestId)));
        });
        refreshNeeded.add(uid);
        continue;
      }
      if (auth.currentUser?.uid !== uid) throw Error('ACCOUNT_CHANGED');
      if (!response.data?.profile || !response.data?.data) throw Error('INVALID_PROGRESS_RESPONSE');
      // Persist the acknowledgement after the server transaction. A crash or
      // lost response leaves the same request ID queued for a safe retry.
      await withStorage(async () => {
        const remaining = (await read(uid)).filter(item => item.requestId !== next.requestId);
        const issues = await readIssues(uid);
        if (issues.some(issue => issue.operation.requestId === next.requestId)) {
          await AsyncStorage.setItem(issueKey(uid), JSON.stringify(issues.map(issue => issue.operation.requestId === next.requestId ? { ...issue, archivedAt: new Date().toISOString() } : issue)));
        }
        // Remove the command last. If archiving fails, its receipt ID stays
        // queued so a retry can recover both the result and cloud snapshot.
        await AsyncStorage.setItem(key(uid), JSON.stringify(remaining));
      });
      snapshots[next.targetUid] = response.data;
      results[next.requestId] = response.data.result;
      completedResults.set(`${uid}:${next.requestId}`, response.data.result);
      // Only interactive reward callers consume results; bound the rest.
      if (completedResults.size > 1000) completedResults.delete(completedResults.keys().next().value!);
    }
  }).finally(() => { sending--; });
  networkQueue = operation;
  return operation;
}
