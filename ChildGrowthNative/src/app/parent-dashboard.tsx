import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Coins,
  Gift,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { questName } from '../lib/questTemplates';
import { confirmAction } from '../lib/confirmAction';
import { parentActionScopeMatches } from '../lib/parentActionScope';
import { useAppStore } from '../store/useAppStore';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ParentPairingSetup from '../components/ParentPairingSetup';
import ParentPrizeEditor from '../components/ParentPrizeEditor';
import ReadableTextInput from '../components/ReadableTextInput';
import RewardGoalCard from '../components/RewardGoalCard';
import WeeklyProgress from '../components/WeeklyProgress';
import QuestHero from '../components/QuestHero';
import { AVAILABLE_AVATARS } from './(tabs)/shop';

function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeading}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
    {action && onAction ? <Pressable accessibilityRole="button" style={styles.headingAction} onPress={onAction}>
      <Text style={styles.headingActionText}>{action}</Text><ChevronRight size={18} color={Colors.primary} />
    </Pressable> : null}
  </View>;
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <View style={styles.metric}>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>;
}

export default function ParentDashboardScreen() {
  const { t } = useTranslation();
  const [notice, setNotice] = useState('');
  const logout = useAppStore(state => state.logout);
  const userEmail = useAppStore(state => state.userEmail);
  const fullName = useAppStore(state => state.fullName);
  const prizes = useAppStore(state => state.prizes);
  const userId = useAppStore(state => state.userId);
  const tasks = useAppStore(state => state.tasks);
  const toggleTaskDone = useAppStore(state => state.toggleTaskDone);
  const resetTasksForNewDay = useAppStore(state => state.resetTasksForNewDay);
  const deleteAllTasks = useAppStore(state => state.deleteAllTasks);
  const wonPrizes = useAppStore(state => state.wonPrizes);
  const togglePrizeRedeemed = useAppStore(state => state.togglePrizeRedeemed);
  const unlockedAvatars = useAppStore(state => state.unlockedAvatars);
  const coins = useAppStore(state => state.coins);
  const children = useAppStore(state => state.children);
  const selectedChildId = useAppStore(state => state.selectedChildId);
  const removeChild = useAppStore(state => state.removeChild);
  const approveChildByParent = useAppStore(state => state.approveChildByParent);
  const verifyChildTask = useAppStore(state => state.verifyChildTask);
  const selectChild = useAppStore(state => state.selectChild);
  const epicBossTask = useAppStore(state => state.epicBossTask);
  const epicBossXP = useAppStore(state => state.epicBossXP);
  const setEpicBossTask = useAppStore(state => state.setEpicBossTask);

  const connectedChildren = useMemo(
    () => children.filter(child => child.managed || child.isApproved === true),
    [children],
  );
  const pendingChildren = useMemo(
    () => children.filter(child => !child.managed && child.isApproved !== true),
    [children],
  );
  const pendingTaskReviews = useMemo(
    () => children.flatMap(child => (child.tasks || [])
      .filter(task => task.pendingApproval === true)
      .map(task => ({ task, child }))),
    [children],
  );
  const activeChild = connectedChildren.find(child => child.id === selectedChildId) || connectedChildren[0];
  const [epicBossTitleInput, setEpicBossTitleInput] = useState(activeChild?.epicBossTask || epicBossTask || '');
  const [epicBossXPInput, setEpicBossXPInput] = useState(String(activeChild?.epicBossXP || epicBossXP || 35));
  const completedCount = tasks.filter(task => task.done).length;

  useEffect(() => {
    if (!userEmail) router.replace('/');
  }, [userEmail]);

  // Refresh once when entering. Repeated polling could restore stale account state during sign-out.
  useEffect(() => { void useAppStore.getState().loadMockState(); }, []);

  useEffect(() => {
    if (!activeChild) return;
    if (selectedChildId !== activeChild.id) selectChild(activeChild.id);
    setEpicBossTitleInput(activeChild.epicBossTask || epicBossTask || '');
    setEpicBossXPInput(String(activeChild.epicBossXP || epicBossXP || 35));
  }, [activeChild?.id, selectedChildId, selectChild, epicBossTask, epicBossXP]);

  if (!userEmail) return null;

  const handleLogout = async () => {
    setNotice('');
    try {
      await logout();
      router.replace('/');
    } catch {
      setNotice(t('device_disconnect_failed'));
    }
  };

  const saveChallenge = () => {
    const xp = Number.parseInt(epicBossXPInput, 10);
    setEpicBossTask(epicBossTitleInput, Number.isFinite(xp) ? xp : 35);
    setNotice(t('epic_quest_saved_alert'));
  };

  return <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
  <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.pageTitle}>{t('parent_dashboard_title')}</Text>
          <Text style={styles.parentName}>{fullName || userEmail.split('@')[0]}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('logout')} onPress={() => void handleLogout()} style={styles.iconButton}>
          <LogOut size={22} color={Colors.text} />
        </Pressable>
      </View>
      <View style={styles.languageRow}><LanguageSwitcher /></View>
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}

      <View style={styles.sectionFirst}>
        <SectionHeading title={t('parent_children_title', { count: connectedChildren.length })} />
        {connectedChildren.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childSwitcher}>
          {connectedChildren.map(child => {
            const selected = child.id === activeChild?.id;
            return <Pressable
              key={child.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => selectChild(child.id)}
              style={[styles.childChoice, selected && styles.childChoiceSelected]}
            >
              <QuestHero id={child.currentAvatar || 'quest_champ'} style={styles.childAvatar} />
              <Text numberOfLines={1} style={[styles.childChoiceName, selected && styles.childChoiceNameSelected]}>{child.name}</Text>
              {selected ? <Check size={17} color={Colors.primary} /> : null}
            </Pressable>;
          })}
        </ScrollView> : <Text style={styles.emptyText}>{t('parent_no_children')}</Text>}

        {activeChild ? <View style={styles.overview}>
          <View style={styles.selectedNameRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={styles.selectedName}>{activeChild.name}</Text>
              <Text style={styles.selectedStatus}>{activeChild.managed ? t('parent_child_managed') : t('parent_child_connected')}</Text>
            </View>
            {!activeChild.managed ? <Pressable accessibilityRole="button" accessibilityLabel={t('remove_child_btn')} style={styles.smallIconButton} onPress={async () => {
              const childId = activeChild.id;
              const accepted = await confirmAction(t('parent_remove_confirm', { name: activeChild.name }), t('remove_child_btn'), t('gate_cancel'));
              if (accepted && parentActionScopeMatches(userId, childId)) removeChild(childId);
            }}><Trash2 size={19} color="#AF332A" /></Pressable> : null}
          </View>
          <View style={styles.metrics}>
            <Metric value={activeChild.level} label={t('parent_stat_level')} />
            <Metric value={`${completedCount}/${tasks.length}`} label={t('parent_stat_quests')} />
            <Metric value={coins} label={t('parent_stat_coins')} />
          </View>
        </View> : null}
      </View>

      <ParentPairingSetup />

      {(pendingChildren.length > 0 || pendingTaskReviews.length > 0) ? <View style={styles.section}>
        <SectionHeading title={t('parent_needs_you')} />
        {pendingChildren.map(child => <View key={child.id} style={styles.attentionRow}>
          <View style={styles.attentionIcon}><UserPlus size={22} color={Colors.amber} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{child.name}</Text>
            <Text style={styles.rowMeta}>{t('kid_requested_link_notice', { name: child.name, nickname: child.nickname })}</Text>
          </View>
          {child.initiatedBy !== 'parent' ? <View style={styles.reviewActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('family_invite_accept')} style={styles.approveCircle} onPress={() => {
              approveChildByParent(child.id);
              setNotice(t('parent_link_reviewed', { name: child.name }));
            }}><Check size={20} color="#FFFFFF" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('family_invite_decline')} style={styles.returnCircle} onPress={() => {
              removeChild(child.id);
              setNotice(t('parent_link_declined', { name: child.name }));
            }}><X size={19} color={Colors.textSecondary} /></Pressable>
          </View> : null}
        </View>)}
        {pendingTaskReviews.map(({ task, child }) => <View key={`${child.id}_${task.id}`} style={styles.reviewRow}>
          <Text style={styles.rowEmoji}>{task.icon || '⭐'}</Text>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{questName(task)}</Text>
            <Text style={styles.rowMeta}>{child.name}{task.verificationNote ? ` · ${task.verificationNote}` : ''}</Text>
          </View>
          <View style={styles.reviewActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('parent_approve_quest')} style={styles.approveCircle} onPress={() => {
              verifyChildTask(child.id, task.id, true);
              setNotice(t('parent_quest_reviewed', { name: child.name }));
            }}><Check size={20} color="#FFFFFF" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('parent_return_quest')} style={styles.returnCircle} onPress={() => {
              verifyChildTask(child.id, task.id, false);
              setNotice(t('parent_quest_returned', { name: child.name }));
            }}><RotateCcw size={19} color={Colors.textSecondary} /></Pressable>
          </View>
        </View>)}
      </View> : null}

      {activeChild ? <>
        <View style={styles.section}>
          <SectionHeading title={t('quest_verification_title')} action={t('manage_quests_btn')} onAction={() => router.push('/manage-tasks')} />
          {tasks.length ? <View>
            {tasks.map(task => <Pressable key={task.id} style={styles.listRow} onPress={() => toggleTaskDone(task.id)}>
              <Text style={styles.rowEmoji}>{task.icon || '⭐'}</Text>
              <Text style={[styles.rowTitle, styles.questName, task.done && styles.doneName]}>{questName(task)}</Text>
              <View style={[styles.status, task.done && styles.statusDone]}>
                {task.done ? <CheckCircle2 size={18} color="#568A12" /> : <Circle size={18} color={Colors.textMuted} />}
                <Text style={[styles.statusText, task.done && styles.statusTextDone]}>{t(task.done ? 'done_status' : 'pending_status')}</Text>
              </View>
            </Pressable>)}
          </View> : <Text style={styles.emptyText}>{t('parent_no_quests')}</Text>}
          <View style={styles.utilityActions}>
            <Pressable style={styles.utilityButton} onPress={() => { resetTasksForNewDay(); setNotice(t('parent_refreshed')); }}>
              <RotateCcw size={19} color={Colors.primary} /><Text style={styles.utilityText}>{t('parent_refresh')}</Text>
            </Pressable>
            <Pressable style={styles.utilityButton} onPress={async () => {
              if (!selectedChildId) return;
              const childId = selectedChildId;
              const accepted = await confirmAction(t('delete_all_tasks_confirm'), t('delete_all_tasks_btn'), t('gate_cancel'));
              if (accepted && parentActionScopeMatches(userId, childId)) deleteAllTasks();
            }}><Trash2 size={19} color="#AF332A" /><Text style={styles.dangerText}>{t('delete_all_tasks_btn')}</Text></Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading title={t('edit_epic_boss_title')} />
          <Text style={styles.fieldLabel}>{t('epic_quest_title_label')}</Text>
          <ReadableTextInput
            style={styles.input}
            accessibilityLabel={t('epic_quest_title_label')}
            placeholder={t('parent_challenge_example')}
            placeholderTextColor={Colors.textMuted}
            value={epicBossTitleInput}
            onChangeText={setEpicBossTitleInput}
          />
          <Text style={styles.fieldLabel}>{t('epic_quest_xp_label')}</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel={t('epic_quest_xp_label')}
            keyboardType="number-pad"
            value={epicBossXPInput}
            onChangeText={setEpicBossXPInput}
          />
          <Pressable style={styles.primaryButton} onPress={saveChallenge}><Text style={styles.primaryButtonText}>{t('btn_save_epic_quest')}</Text></Pressable>
        </View>

        <RewardGoalCard key={activeChild.id} ownerName={activeChild.name} />

        <View style={styles.section}>
          <SectionHeading title={t('parent_rewards_title')} />
          {wonPrizes.length ? wonPrizes.map((item, index) => <Pressable
            key={item.id || `parent_won_${index}`}
            style={styles.listRow}
            onPress={() => togglePrizeRedeemed(item.id || index)}
          >
            <Text style={styles.rowEmoji}>🎁</Text>
            <Text style={[styles.rowTitle, styles.questName, item.redeemed && styles.doneName]}>{item.prize}</Text>
            <View style={[styles.status, item.redeemed && styles.statusDone]}>
              {item.redeemed ? <CheckCircle2 size={18} color="#568A12" /> : <Gift size={18} color={Colors.amber} />}
              <Text style={[styles.statusText, item.redeemed && styles.statusTextDone]}>{t(item.redeemed ? 'redeemed' : 'ready_to_redeem')}</Text>
            </View>
          </Pressable>) : <Text style={styles.emptyText}>{t('no_prizes_won_yet')}</Text>}
        </View>

        <ParentPrizeEditor key={`${userId}:${activeChild.id}`} parentId={userId} childId={activeChild.id} initialPrizes={prizes} />
        <WeeklyProgress child={activeChild} />

        <View style={styles.section}>
          <SectionHeading title={t('parent_heroes_title')} />
          <View style={styles.balanceRow}><Coins size={21} color={Colors.amber} /><Text style={styles.balanceLabel}>{t('coins_balance')}</Text><Text style={styles.balanceValue}>{coins}</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroList}>
            {AVAILABLE_AVATARS.filter(hero => unlockedAvatars.includes(hero.id)).map(hero => <View key={hero.id} style={styles.heroItem}>
              <QuestHero id={hero.id} style={styles.heroImage} />
              <Text numberOfLines={2} style={styles.heroName}>{hero.name}</Text>
              <Text style={styles.heroPrice}>{hero.price === 0 ? t('parent_free') : `${hero.price} 🪙`}</Text>
            </View>)}
          </ScrollView>
        </View>
      </> : null}

      <View style={styles.securityNote}>
        <ShieldCheck size={21} color={Colors.textSecondary} />
        <Text style={styles.securityText}>{t('parent_privacy_note')}</Text>
      </View>
    </ScrollView>
  </SafeAreaView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 64 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerCopy: { flex: 1, minWidth: 0 },
  pageTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, lineHeight: 36, color: Colors.text },
  parentName: { fontFamily: 'Nunito_600SemiBold', fontSize: 16, lineHeight: 23, color: Colors.textSecondary, marginTop: 2 },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface2 },
  smallIconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  languageRow: { alignItems: 'flex-start', paddingVertical: 8, marginBottom: 8 },
  notice: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 22, color: Colors.primary, paddingVertical: 10 },
  sectionFirst: { paddingTop: 16, paddingBottom: 26 },
  section: { paddingVertical: 26, borderTopWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionTitle: { flex: 1, minWidth: 0, fontFamily: 'Nunito_800ExtraBold', fontSize: 22, lineHeight: 28, color: Colors.text },
  headingAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingLeft: 12 },
  headingActionText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.primary },
  childSwitcher: { gap: 10, paddingVertical: 2, paddingRight: 10 },
  childChoice: { minWidth: 132, maxWidth: 210, height: 62, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, borderRadius: 18, backgroundColor: '#F4F7FB', borderWidth: 2, borderColor: 'transparent' },
  childChoiceSelected: { backgroundColor: Colors.blueDim, borderColor: Colors.primary },
  childAvatar: { width: 42, height: 48 },
  childChoiceName: { flex: 1, minWidth: 0, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.text },
  childChoiceNameSelected: { color: Colors.primary },
  overview: { marginTop: 18 },
  selectedNameRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  selectedName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, lineHeight: 30, color: Colors.text },
  selectedStatus: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 22, color: Colors.textSecondary, marginTop: 2 },
  metrics: { flexDirection: 'row', marginTop: 16, backgroundColor: '#F4F7FB', borderRadius: 18, paddingVertical: 14 },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 8, borderRightWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  metricValue: { fontFamily: 'Nunito_800ExtraBold', fontSize: 21, lineHeight: 27, color: Colors.text },
  metricLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, lineHeight: 20, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  attentionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.amberDim },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  reviewActions: { flexDirection: 'row', gap: 8 },
  approveCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#76AD20' },
  returnCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7' },
  compactAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
  compactActionText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.primary },
  listRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  rowEmoji: { width: 32, fontSize: 24, textAlign: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, lineHeight: 23, color: Colors.text },
  rowMeta: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, color: Colors.textSecondary, marginTop: 2 },
  questName: { flex: 1, minWidth: 0 },
  doneName: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  status: { maxWidth: '40%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F4F8' },
  statusDone: { backgroundColor: Colors.greenDim },
  statusText: { flexShrink: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.textSecondary },
  statusTextDone: { color: '#568A12' },
  emptyText: { fontFamily: 'Nunito_600SemiBold', fontSize: 16, lineHeight: 24, color: Colors.textSecondary, paddingVertical: 12 },
  utilityActions: { marginTop: 12 },
  utilityButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  utilityText: { flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.primary },
  dangerText: { flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#AF332A' },
  fieldLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, lineHeight: 22, color: Colors.text, marginTop: 10, marginBottom: 6 },
  input: { width: '100%', minHeight: 58, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontFamily: 'Nunito_700Bold', fontSize: 17, lineHeight: 24, color: Colors.text, backgroundColor: '#FFFFFF', textAlign: 'left', textAlignVertical: 'top' },
  primaryButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: Colors.primary, marginTop: 16, paddingHorizontal: 18 },
  primaryButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#FFFFFF', textAlign: 'center' },
  balanceRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceLabel: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.textSecondary },
  balanceValue: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: Colors.text },
  heroList: { gap: 12, paddingVertical: 8, paddingRight: 10 },
  heroItem: { width: 126, alignItems: 'center', paddingVertical: 10 },
  heroImage: { width: 84, height: 94 },
  heroName: { minHeight: 42, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, lineHeight: 20, color: Colors.text, textAlign: 'center', marginTop: 6 },
  heroPrice: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: Colors.textSecondary },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  securityText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
});
