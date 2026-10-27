import React, { useEffect, useState } from 'react';
import { View, Text, Share } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Button, ui, palette } from '../components/questblox/UI';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { readProgressIssues, archiveProgressIssue, retryProgressIssue, ProgressIssue } from '../lib/progressQueue';
import { readLegacyBackups, preserveLegacySave, LegacyProgressBackup } from '../lib/progressRecovery';
import { readCloudState, hasSavedCloudEdits } from '../lib/cloudState';
import { confirmAction } from '../lib/dialogs';
import { recoveryClaimFromSave } from '../types/recovery';
import { localDay } from '../utils/questDay';

function reasonKey(reason: string) {
  if (reason === 'QUEST_CHANGED') return 'quest_changed';
  if (reason === 'QUEST_REVIEW_REQUIRED') return 'quest_review_before_delete';
  if (reason === 'PROGRESS_DAY_CHANGED') return 'recovery_reason_day';
  if (['PARENT_REQUIRED', 'FAMILY_REQUIRED'].includes(reason)) return 'recovery_reason_family';
  if (['QUEST_NOT_FOUND', 'PRIZE_NOT_FOUND'].includes(reason)) return 'recovery_reason_missing';
  if (reason === 'NOT_ENOUGH_COINS') return 'recovery_reason_coins';
  if (reason === 'REVIEW_CHANGED') return 'recovery_reason_review';
  return 'recovery_reason_changed';
}
function actionKey(action: string) {
  if (action.startsWith('task.') || action === 'tasks.clear') return 'recovery_quest';
  if (action.startsWith('fighter.')) return 'recovery_fighter';
  if (action.startsWith('theme.')) return 'recovery_theme';
  return 'recovery_reward';
}
export default function SyncRecoveryScreen() {
  const { t, i18n } = useTranslation();
  const uid = useAppStore(state => state.userId);
  const role = useAppStore(state => state.role);
  const linkedParents = useAppStore(state => state.linkedParents);
  const children = useAppStore(state => state.children);
  const [issues, setIssues] = useState<ProgressIssue[]>([]);
  const [backups, setBackups] = useState<LegacyProgressBackup[]>([]);
  const [familyBackups, setFamilyBackups] = useState<Record<string, any>[]>([]);
  const [legacy, setLegacy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const stillHere = (id: string) => auth.currentUser?.uid === id && useAppStore.getState().userId === id;
  const refresh = async () => {
    if (!uid || !stillHere(uid)) return;
    const [items, saved, hasLegacy, cloud] = await Promise.all([readProgressIssues(uid), readLegacyBackups(uid), hasSavedCloudEdits(uid),
      readCloudState('user_data', uid).catch(() => null)]);
    if (!stillHere(uid)) return;
    setIssues(items); setBackups(saved); setLegacy(hasLegacy);
    setLoadedUid(uid);
    if (cloud) setFamilyBackups(Array.isArray(cloud.data()?.legacy_family_children) ? cloud.data()!.legacy_family_children : []);
    else setMessage('recovery_failed');
    useAppStore.setState({ syncIssueCount: items.filter(issue => !issue.archivedAt).length });
  };
  useEffect(() => {
    setLoadedUid(null); setIssues([]); setBackups([]); setFamilyBackups([]); setLegacy(false); setMessage('');
    void refresh().catch(() => { if (uid && stillHere(uid)) { setLoadedUid(uid); setMessage('recovery_failed'); } });
  }, [uid]);
  const run = async (work: () => Promise<void>) => {
    if (busy || !uid || !stillHere(uid)) return;
    setBusy(true); setMessage('');
    try { await work(); await refresh(); }
    catch { if (stillHere(uid)) setMessage('recovery_failed'); }
    finally { setBusy(false); }
  };
  const resumeCloud = () => confirmAction(t('recovery_cloud_confirm'), () => { void run(async () => {
    if (!uid) return;
    // Verify a real cloud save exists before releasing the legacy block.
    const [profile, data] = await Promise.all([readCloudState('profiles', uid), readCloudState('user_data', uid)]);
    if (!profile.exists() || !data.exists() || !stillHere(uid)) throw Error('CLOUD_SAVE_UNAVAILABLE');
    await preserveLegacySave(uid, useAppStore.getState());
    if (!stillHere(uid)) return;
    await useAppStore.getState().retryFamilySync();
    if (stillHere(uid)) setMessage(useAppStore.getState().syncError ? 'recovery_failed' : 'recovery_cloud_ready');
  }); });
  if (!uid || uid === 'guest-local') return <Redirect href="/login" />;
  if (loadedUid !== uid) return <Screen><Text style={ui.text}>{t('settings_wait')}</Text></Screen>;
  return <Screen>
    <Button secondary label={`← ${t('online_back')}`} onPress={() => router.back()} />
    <Text style={ui.title}>{t('recovery_title')}</Text>
    <Text style={ui.meta}>{t('recovery_intro')}</Text>
    {!!message && <Text accessibilityLiveRegion="polite" style={ui.text}>{t(message)}</Text>}
    {message === 'recovery_failed' && <Button secondary disabled={busy} label={t('sync_retry')} onPress={() => { void run(async () => {}); }} />}
    {legacy && <View style={{ gap: 12 }}>
      <Text style={ui.heading}>🗂️ {t('recovery_legacy')}</Text>
      <Text style={ui.text}>{t('recovery_legacy_explain')}</Text>
      <Button disabled={busy} label={t('recovery_use_cloud')} onPress={resumeCloud} />
    </View>}
    {issues.filter(issue => showArchived || !issue.archivedAt).map(issue => {
      const operation = issue.operation;
      const belongsTo = useAppStore.getState().children.find(child => child.id === operation.targetUid);
      const task = (belongsTo?.tasks || useAppStore.getState().tasks).find(task => task.id === operation.payload.id);
      const canRetry = operation.day === localDay() && !['REVIEW_CHANGED', 'QUEST_CHANGED'].includes(issue.reason);
      return <View key={operation.requestId} style={{ gap: 10, borderBottomWidth: 1, borderColor: palette.line, paddingBottom: 18 }}>
        <Text style={ui.heading}>{operation.action.startsWith('task.') ? task?.icon || '⭐' : '🎁'} {t(actionKey(operation.action))}</Text>
        {!!task && <Text style={ui.text}>{task.shortName || t(task.name, task.name)}</Text>}
        {!!belongsTo && <Text style={ui.meta}>{belongsTo.name || belongsTo.nickname}</Text>}
        <Text style={ui.meta}>{new Date(issue.recordedAt).toLocaleString(i18n.language)}</Text>
        <Text style={ui.text}>{t(reasonKey(issue.reason))}</Text>
        {operation.action === 'task.update' && typeof (operation.payload.changes as any)?.name === 'string' && <View style={{ gap: 4 }}>
          <Text style={ui.meta}>{t('recovery_saved_draft')}</Text>
          <Text selectable style={ui.text}>{(operation.payload.changes as any).name}</Text>
        </View>}
        {issue.reason === 'PROGRESS_DAY_CHANGED' && ['task.complete', 'task.submit'].includes(operation.action) && <Button disabled={busy} label={t('recovery_request_parent')} onPress={() => { void run(async () => {
          const sent = await useAppStore.getState().requestQuestRecovery(operation);
          if (sent) await archiveProgressIssue(uid, operation.requestId);
          if (stillHere(uid)) setMessage(sent ? 'recovery_requested' : 'recovery_failed');
        }); }} />}
        {canRetry && <Button secondary disabled={busy} label={t('sync_retry')} onPress={() => { void run(async () => {
          await retryProgressIssue(uid, operation.requestId);
          if (stillHere(uid)) await useAppStore.getState().retryFamilySync();
        }); }} />}
        {!issue.archivedAt && <Button secondary disabled={busy} label={t('recovery_keep_backup')} onPress={() => { void run(() => archiveProgressIssue(uid, operation.requestId)); }} />}
        {issue.archivedAt && <Text style={ui.meta}>✓ {t('recovery_archived')}</Text>}
      </View>;
    })}
    {!legacy && !issues.some(issue => !issue.archivedAt) && <Text style={ui.heading}>✓ {t('recovery_clear')}</Text>}
    {role === 'parent' && familyBackups.map((saved, index) => {
      const child = children.find(child => child.isApproved && (child.id === saved.id || child.nickname === saved.nickname));
      return <View key={index} style={{ gap: 10, borderBottomWidth: 1, borderColor: palette.line, paddingVertical: 14 }}>
        <Text style={ui.heading}>🗂️ {saved.name || saved.nickname || t('recovery_legacy')}</Text>
        <Text style={ui.meta}>{t('recovery_family_backup')}</Text>
        <Text style={ui.text}>{t('recovery_summary', { coins: saved.coins || 0, level: saved.level || 1, count: saved.tasks?.length || 0 })}</Text>
        {(Array.isArray(saved.tasks) ? saved.tasks : []).map((task: any, taskIndex: number) => <Text key={taskIndex} style={ui.text}>{task.icon || '⭐'} {t(task.name, task.name)}</Text>)}
        {child ? <Button disabled={busy} label={t('recovery_request_child', { name: child.name || child.nickname })} onPress={() => { void run(async () => {
          const sent = await useAppStore.getState().requestProgressRecovery(`family-legacy:${uid}:${child.id}`, recoveryClaimFromSave(saved), child.id);
          if (stillHere(uid)) setMessage(sent ? 'recovery_requested' : 'recovery_failed');
        }); }} /> : <Text style={ui.meta}>{t('recovery_family_connect')}</Text>}
        <Button secondary label={t('settings_family')} onPress={() => router.push('/parent-dashboard')} />
      </View>;
    })}
    <Button secondary label={t(showArchived ? 'recovery_hide_backups' : 'recovery_show_backups')} onPress={() => setShowArchived(!showArchived)} />
    {showArchived && backups.map((backup, index) => <View key={`${backup.savedAt}-${index}`} style={{ gap: 8 }}>
      <Text style={ui.heading}>🗂️ {t('recovery_legacy')}</Text>
      <Text style={ui.meta}>{new Date(backup.savedAt).toLocaleString(i18n.language)}</Text>
      <Text style={ui.text}>{t('recovery_summary', { coins: backup.local.coins || 0, level: backup.local.level || 1, count: backup.local.tasks?.length || 0 })}</Text>
      {role === 'child' && linkedParents.length > 0 && <Button disabled={busy} label={t('recovery_request_parent')} onPress={() => { void run(async () => {
        const sent = await useAppStore.getState().requestProgressRecovery(`legacy:${backup.savedAt}`, recoveryClaimFromSave(backup.local), uid);
        if (stillHere(uid)) setMessage(sent ? 'recovery_requested' : 'recovery_failed');
      }); }} />}
      {role === 'child' && linkedParents.length === 0 && <Button secondary label={t('online_link')} onPress={() => router.push('/link-account')} />}
      {role === 'parent' && (backup.local.children || []).map((savedChild: any, childIndex: number) => {
        const child = children.find(child => child.isApproved && (child.id === savedChild.id || child.nickname === savedChild.nickname));
        return child ? <Button key={childIndex} disabled={busy} label={t('recovery_request_child', { name: child.name || child.nickname })} onPress={() => { void run(async () => {
          const sent = await useAppStore.getState().requestProgressRecovery(`legacy:${backup.savedAt}:${child.id}`, recoveryClaimFromSave(savedChild), child.id);
          if (stillHere(uid)) setMessage(sent ? 'recovery_requested' : 'recovery_failed');
        }); }} /> : null;
      })}
      {(backup.local.tasks || []).map((task: any, taskIndex: number) => <Text key={taskIndex} style={ui.text}>{task.icon || '⭐'} {task.name}</Text>)}
    </View>)}
    {(issues.length > 0 || backups.length > 0 || familyBackups.length > 0) && <Button secondary disabled={busy} label={t('recovery_share')} onPress={() => { void run(async () => {
      const [savedIssues, savedBackups] = await Promise.all([readProgressIssues(uid), readLegacyBackups(uid)]);
      if (!stillHere(uid)) return;
      await Share.share({ title: 'Questblox', message: JSON.stringify({ version: 1, issues: savedIssues, backups: savedBackups, familyBackups }, null, 2) });
    }); }} />}
  </Screen>;
}
