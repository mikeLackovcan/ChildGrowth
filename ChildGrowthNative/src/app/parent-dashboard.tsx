import { SafeAreaView } from 'react-native-safe-area-context';
import { localDay } from '../utils/questDay';
import FamilyReconnect from '../components/FamilyReconnect';
import { showMessage, confirmAction } from '../lib/dialogs';
import React, { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RecoveryReview } from '../components/questblox/RecoveryReview';
import { QuestReview } from '../components/questblox/QuestReview';
import { Colors } from '../constants/theme';
import { DEFAULT_PRIZES, useAppStore } from '../store/useAppStore';
import { Bell, LogOut, UserPlus, User, Gift, CheckCircle2, Circle, CheckSquare, RotateCcw, ShoppingBag, Coins, Shield, Tag, Trash2, Plus } from 'lucide-react-native';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { AVAILABLE_AVATARS } from './(tabs)/shop';
import { personName, visibleNickname } from '../utils/displayName';
import { PRIZE_ICONS, prizeEmoji, prizeLabel } from '../constants/prizes';

export default function ParentDashboardScreen() {
  const uid = useAppStore(state => state.userId);
  const role = useAppStore(state => state.role);
  if (!uid) return <Redirect href="/login" />;
  if (role !== 'parent' || uid === 'guest-local') return <Redirect href="/(tabs)" />;
  return <ParentDashboard key={uid} />;
}
function ParentDashboard() {
  const { t, i18n } = useTranslation();
  const logout = useAppStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
  };
  const userEmail = useAppStore((state) => state.userEmail);
  const fullName = useAppStore((state) => state.fullName);
  const nickname = useAppStore((state) => state.nickname);
  const syncError = useAppStore(s => s.syncError);
  const syncIssueCount = useAppStore(s => s.syncIssueCount);
  const prizes = useAppStore((state) => state.prizes);
  const setPrizes = useAppStore((state) => state.setPrizes);
  const tasks = useAppStore((state) => state.tasks);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const resetTasksForNewDay = useAppStore((state) => state.resetTasksForNewDay);
  const deleteAllTasks = useAppStore((state) => state.deleteAllTasks);
  const wonPrizes = useAppStore((state) => state.wonPrizes);
  const togglePrizeRedeemed = useAppStore((state) => state.togglePrizeRedeemed);
  const unlockedAvatars = useAppStore((state) => state.unlockedAvatars);
  const coins = useAppStore((state) => state.coins);
  
  const children = useAppStore((state) => state.children);
  const selectedChildId = useAppStore((state) => state.selectedChildId);
  const removeChild = useAppStore((state) => state.removeChild);
  const approveChildByParent = useAppStore((state) => state.approveChildByParent);
  const verifyChildTask = useAppStore((state) => state.verifyChildTask);
  const selectChild = useAppStore((state) => state.selectChild);

  const epicBossTask = useAppStore((state) => state.epicBossTask);
  const epicBossXP = useAppStore((state) => state.epicBossXP);
  const setEpicBossTask = useAppStore((state) => state.setEpicBossTask);

  const [editingPrizes, setEditingPrizes] = useState(() => Array.from({ length: DEFAULT_PRIZES.length }, (_, i) => prizes[i] || ''));
  const [choosingPrizeIcon, setChoosingPrizeIcon] = useState<number | null>(null);
  const page = useRef<ScrollView>(null);
  const sectionPositions = useRef({ rewards: 0 });
  const jumpTo = (section: 'rewards') => page.current?.scrollTo({ y: sectionPositions.current[section], animated: true });

  // A reward draft belongs to one child; never carry it into a sibling's form.
  React.useEffect(() => {
    const currentPrizes = useAppStore.getState().prizes;
    setEditingPrizes(Array.from({ length: DEFAULT_PRIZES.length }, (_, i) => currentPrizes[i] || ''));
  }, [selectedChildId]);
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  const approvedChildren = children.filter(c => c.isApproved === true);
  const pendingChildren = children.filter(c => c.isApproved !== true);
  const pendingTaskReviews = children.flatMap(child => (child.tasks || []).filter(t => t.pendingApproval === true).map(t => ({ task: t, child })));
  const activeChild = approvedChildren.find(c => c.id === selectedChildId) || approvedChildren[0];
  const childName = (child: { name?: string; nickname?: string } | undefined) => child ? personName(child.name, child.nickname, t('settings_child')) : t('settings_child');

  const [epicBossTitleInput, setEpicBossTitleInput] = useState(activeChild?.epicBossTask || epicBossTask || t('quest_focus_full'));
  const [epicBossXPInput, setEpicBossXPInput] = useState(String(activeChild?.epicBossXP || epicBossXP || 35));

  React.useEffect(() => {
    if (!userEmail) {
      router.replace('/login');
    }
  }, [userEmail]);

  React.useEffect(() => {
    let refreshing = false;
    const interval = setInterval(async () => {
      if (refreshing) return;
      refreshing = true;
      try { await useAppStore.getState().loadMockState(); } finally { refreshing = false; }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (activeChild) {
      setEpicBossTitleInput(activeChild.epicBossTask || epicBossTask || t('quest_focus_full'));
      setEpicBossXPInput(String(activeChild.epicBossXP || epicBossXP || 35));
    }
  }, [activeChild?.id, epicBossTask, epicBossXP]);

  if (!userEmail) {
    return null;
  }

  const handleSaveEpicBoss = () => {
    const cleanTitle = epicBossTitleInput.trim() || t('quest_focus_full');
    const xpVal = Math.max(10, Math.min(100, parseInt(epicBossXPInput, 10) || 35));
    setEpicBossTitleInput(cleanTitle); setEpicBossXPInput(String(xpVal));
    setEpicBossTask(cleanTitle, xpVal);
    showMessage(t('epic_quest_saved_alert', 'Epic Daily Boss Quest updated! ⚔️'));
  };



  const handleSavePrizes = () => {
    setPrizes(editingPrizes);
    showMessage(t('save_prizes'));
  };

  const updatePrize = (index: number, text: string) => {
    const newPrizes = [...editingPrizes];
    newPrizes[index] = text.trim() ? `${text} ${prizeEmoji(newPrizes[index])}` : prizeEmoji(newPrizes[index]);
    setEditingPrizes(newPrizes);
  };
  const updatePrizeIcon = (index: number, icon: string) => {
    const next = [...editingPrizes];
    next[index] = `${prizeLabel(next[index])} ${icon}`.trim();
    setEditingPrizes(next); setChoosingPrizeIcon(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardLayer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={page} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <FamilyReconnect />
        {syncError && <Text style={{ color: Colors.amber }}>{t(syncError)}</Text>}
        {/* Header with Parent Name, Nickname and Administration Badge */}
        <View style={{ backgroundColor: '#131726', borderWidth: 1, borderColor: 'rgba(255, 184, 0, 0.25)', borderRadius: 20, padding: 18, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Shield size={18} color={Colors.amber} />
              <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 13, letterSpacing: 0.5 }}>
                {t('parent_control_center', 'PARENTS CONTROL CENTER 👨‍👩‍👧')}
              </Text>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 20 }}>{personName(fullName, nickname, t('settings_parent'))}</Text>
            {!!visibleNickname(nickname) && <Text numberOfLines={1} style={styles.userTag}>@{visibleNickname(nickname)}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('notifications_title')} onPress={() => router.push('/reminders')} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={24} color={Colors.amber} />
            </TouchableOpacity>
            <TouchableOpacity testID="parent-logout-btn" onPress={handleLogout} style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: 10, borderRadius: 12 }}>
              <LogOut size={18} color={Colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingVertical: 16, gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 24 }}>{t('family_start_title')}</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 16, lineHeight: 23 }}>{t(activeChild ? 'family_start_child' : 'family_start_connect', { name: activeChild ? childName(activeChild) : '' })}</Text>
          {[
            { icon: '👨‍👩‍👧', label: 'family_start_link', action: () => router.push('/link-account'), disabled: false },
            { icon: '⭐', label: 'family_start_quests', action: () => { if (activeChild) selectChild(activeChild.id); router.push('/manage-tasks'); }, disabled: !activeChild },
            { icon: '🎁', label: 'family_start_rewards', action: () => { if (activeChild) selectChild(activeChild.id); jumpTo('rewards'); }, disabled: !activeChild },
          ].map(item => <TouchableOpacity key={item.label} accessibilityRole="button" accessibilityLabel={t(item.label)} accessibilityState={{ disabled: item.disabled }} disabled={item.disabled} onPress={item.action} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64, opacity: item.disabled ? 0.45 : 1 }}>
            <Text accessible={false} style={{ fontSize: 32 }}>{item.icon}</Text>
            <Text style={{ flex: 1, color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 18 }}>{t(item.label)}</Text>
            <Text accessible={false} style={{ color: Colors.amber, fontSize: 24 }}>›</Text>
          </TouchableOpacity>)}
        </View>

        {/* Pending Approvals Section (Parent Approves Child Link Requests) */}
        {pendingChildren.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.secTitle}>{t('pending_approvals')}</Text>
            <View style={{ gap: 10 }}>
              {pendingChildren.map((child) => (
                <View key={child.id} style={[styles.card, { backgroundColor: Colors.cardYellow, borderColor: Colors.amber }]}>
                  <View style={{ gap: 10 }}>
                    <View style={styles.childInfo}>
                      <View style={[styles.avatar, { backgroundColor: Colors.surface }]}>
                        <UserPlus size={22} color={Colors.amber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={2} style={styles.childName}>{childName(child)}</Text>
                        {!!visibleNickname(child.nickname) && <Text numberOfLines={1} style={styles.childSub}>@{visibleNickname(child.nickname)}</Text>}
                        <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.amber, fontSize: 12, marginTop: 2 }}>
                          {child.initiatedBy === 'parent' 
                            ? t('parent_sent_invite_notice', 'Invitation sent to @{{nickname}}! Waiting for kid approval on their app ⏳', { nickname: child.nickname || 'guest' })
                            : t('kid_requested_link_notice', 'Kid @{{nickname}} ({{name}}) requested to link with you! Tap Approve to accept ⏳', { nickname: child.nickname || 'guest', name: child.name || child.nickname || 'Kid' })}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {child.initiatedBy !== 'parent' && (
                        <TouchableOpacity 
                          accessibilityRole="button" accessibilityLabel={t('review_approve')}
                        style={{ flexGrow: 1, flexBasis: 140, minHeight: 48, backgroundColor: Colors.green, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                          onPress={async () => {
                            const accepted = await approveChildByParent(child.id);
                            showMessage(t(accepted ? 'family_linked' : 'family_link_error'));
                          }}
                        >
                          <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 13 }}>
                            {t('btn_approve_link', 'APPROVE LINK ✅')}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity 
                        style={{ flexGrow: 1, flexBasis: 140, minHeight: 48, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => removeChild(child.id)}
                      >
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.red, fontSize: 13 }}>
                          {child.initiatedBy === 'parent' ? t('btn_cancel_invitation', 'CANCEL INVITATION ❌') : t('btn_deny_link', 'DENY / REJECT ❌')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {(syncIssueCount > 0 || syncError === 'progress_legacy_pending') && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('recovery_title')} onPress={() => router.push('/sync-recovery')} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: Colors.amber }}>🗂️ {t('recovery_title')}</Text></TouchableOpacity>}
        {children.flatMap(child => (child.recoveryRequests || []).map(request => <RecoveryReview key={`${child.id}-${request.id}`} request={request} childName={child.name || child.nickname} currentCoins={child.coins} t={t} language={i18n.language} busy={recoveryBusy}
          onReview={approved => confirmAction(t(approved ? request.kind === 'quest' ? 'recovery_quest_confirm' : 'recovery_restore_confirm' : 'recovery_decline_confirm'), () => {
            setRecoveryBusy(true);
            void useAppStore.getState().reviewProgressRecovery(child.id, request.id, approved).then(saved => {
              showMessage(t(saved ? 'recovery_review_saved' : 'recovery_failed'));
            }).finally(() => setRecoveryBusy(false));
          })} />))}
        {children.filter(child => child.isApproved && child.dailyMood && child.lastActiveDate === localDay()).map(child => <View key={`mood-${child.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <Text style={{ fontSize: 34 }}>{child.dailyMood === 'wiped' ? '😴' : child.dailyMood === 'thriving' ? '🙂' : '⚡'}</Text>
          <Text style={{ color: Colors.text, flex: 1 }}>{child.name || child.nickname} · {t(`day_${child.dailyMood}`)}</Text>
        </View>)}
        {children.flatMap(child => child.tasks.filter(task => task.helpRequested && !task.done).map(task =>
          <View key={`${child.id}-${task.id}`} style={{ paddingVertical: 12 }}>
            <Text style={{ color: Colors.amber }}>🙋 {child.name || child.nickname} · {t('quest_help')}</Text>
            <Text style={{ color: Colors.text }}>{task.shortName || t(task.name, task.name)}</Text>
          </View>
        ))}
        {children.flatMap(child => child.wonPrizes.filter(prize => prize.status === 'requested' && !prize.redeemed).map(prize =>
          <View key={`${child.id}-${prize.id}`} style={{ paddingVertical: 12, gap: 8 }}>
            <Text style={{ color: Colors.text }}>🎁 {child.name || child.nickname} · {prize.prize}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('prize_approve')} style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => useAppStore.getState().approvePrize(child.id, prize.id)}><Text style={{ color: Colors.amber }}>✓ {t('prize_approve')}</Text></TouchableOpacity>
          </View>
        ))}
        {/* Pending Quest Reviews Section */}
        {pendingTaskReviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.secTitle}>{t('review_quests')}</Text>
            <View style={{ gap: 10 }}>
              {pendingTaskReviews.map(({ task, child }) => (
                <QuestReview key={`${child.id}_${task.id}`} task={task} child={child} t={t} language={i18n.language}
                  onReview={async approved => {
                    const saved = await verifyChildTask(child.id, task.id, approved);
                    if (!saved) { showMessage(t('family_sync_retry')); return; }
                    showMessage(t(approved ? 'review_approved' : 'review_returned', { name: child.name }));
                  }} />
              ))}
            </View>
          </View>
        )}

        {/* Approved Child Selector Switcher Bar (Only approved kids appear here) */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{t('select_child_title')}</Text>
          {approvedChildren.length === 0 ? (
            <View style={styles.card}>
              <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, textAlign: 'center', marginVertical: 8 }}>
                {t('family_start_connect')}
              </Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                {approvedChildren.map((child) => {
                  const isSelected = child.id === activeChild?.id;
                  return (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.childPill,
                        isSelected && styles.childPillActive
                      ]}
                      onPress={() => selectChild(child.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 18 }}>🎮</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[styles.childPillName, isSelected && styles.childPillNameActive]}>{childName(child)}</Text>
                        {!!visibleNickname(child.nickname) && <Text style={[styles.childPillTag, isSelected && { color: Colors.amber }]}>@{visibleNickname(child.nickname)}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Active Selected Child Overview Card */}
              {activeChild && (
                <View style={[styles.card, { marginTop: 12, backgroundColor: Colors.surface2 }]}>
                  <View style={styles.childRow}>
                    <View style={styles.childInfo}>
                      <View style={[styles.avatar, { backgroundColor: Colors.surface }]}>
                        <User size={22} color={Colors.green} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={2} style={styles.childName}>{childName(activeChild)}</Text>
                        {!!visibleNickname(activeChild.nickname) && <Text numberOfLines={1} style={styles.childSub}>@{visibleNickname(activeChild.nickname)}</Text>}
                        <Text style={styles.childSub}>{t('family_child_stats', { level: activeChild.level, xp: activeChild.xp, coins: activeChild.coins })}</Text>
                        {activeChild.linkedParents && activeChild.linkedParents.length > 0 && (
                          <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.blue, fontSize: 11, marginTop: 2 }}>
                            {t('instructed_by', 'Instructed by Parents: ')}{activeChild.linkedParents.map(p => `@${p}`).join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('remove_child_btn')}
                      style={{ width: 44, height: 44, flexShrink: 0, backgroundColor: 'rgba(232,0,27,0.12)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => {
                        confirmAction(t('family_remove_confirm', { name: activeChild.name || activeChild.nickname || t('settings_child') }), () => removeChild(activeChild.id));
                      }}
                    >
                      <Trash2 size={20} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/link-account')} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
            <View style={[styles.avatar, { backgroundColor: Colors.amberDim }]}><UserPlus size={23} color={Colors.amber} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.childName, { fontSize: 17 }]}>{t('family_connect_child')}</Text>
              <Text style={[styles.settingsSub, { marginBottom: 0 }]}>{t('family_connect_methods')}</Text>
            </View>
            <Text accessible={false} style={{ color: Colors.amber, fontSize: 28 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Epic Daily Boss Quest */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.sectionEmoji}>⚔️</Text><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.sectionTitle}>{t('edit_epic_boss_title')}</Text><Text style={styles.sectionHint}>{t('edit_epic_boss_sub')}</Text></View></View>
          <View style={styles.featurePanel}>
            <View style={{ gap: 18 }}>
              <View>
                <Text style={styles.fieldLabel}>{t('epic_quest_title_label')}</Text>
                <TextInput
                  style={[styles.input, styles.epicTitleInput]}
                  placeholder={t('quest_focus_full')} accessibilityLabel={t('epic_quest_title_label')}
                  placeholderTextColor={Colors.textMuted}
                  value={epicBossTitleInput}
                  onChangeText={setEpicBossTitleInput}
                  maxLength={80}
                  multiline
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>{t('epic_quest_xp_label')}</Text>
                <View accessibilityRole="radiogroup" style={styles.xpChoices}>{[20, 35, 50, 75].map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: epicBossXPInput === String(value) }} style={[styles.xpChoice, epicBossXPInput === String(value) && styles.xpChoiceActive]} onPress={() => setEpicBossXPInput(String(value))}><Text style={[styles.xpChoiceText, epicBossXPInput === String(value) && styles.xpChoiceTextActive]}>✨ {value}</Text></TouchableOpacity>)}</View>
              </View>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveEpicBoss}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>{t('btn_save_epic_quest')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Parent Check/Uncheck Quest Verification Card */}
        <View style={styles.section}>
          <View style={{ marginBottom: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CheckSquare size={18} color={Colors.green} />
              <Text style={[styles.sectionTitle, { flex: 1 }]}>{t('quest_verification_title')}</Text>
            </View>
            <TouchableOpacity testID="manage-quests-btn" onPress={() => router.push('/manage-tasks')} style={styles.viewButton}>
              <Plus size={18} color={Colors.amber} /><Text style={styles.viewButtonText}>{t('manage_quests_btn')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.settingsSub}>{t('quest_verification_sub', 'Tap any quest to instantly check or uncheck it for your child:')}</Text>
            <View style={styles.questCheckList}>
              {tasks.map((task) => (
                <TouchableOpacity 
                  key={task.id} 
                  style={[styles.questCheckRow, task.done && styles.questCheckRowDone]}
                  onPress={() => toggleTaskDone(task.id)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={{ fontSize: 20 }}>{task.icon || '⭐'}</Text>
                    <Text style={[styles.questCheckName, task.done && styles.questCheckNameDone]}>
                      {t(task.name, task.name)}
                    </Text>
                  </View>
                  <View accessible accessibilityLabel={t(task.done ? 'done_status' : 'pending_status')} style={styles.checkStatusPill}>
                    {task.done ? (
                      <CheckCircle2 size={26} color={Colors.green} />
                    ) : (
                      <Circle size={26} color={Colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Parent Task Control Buttons: Reset Daily / Delete All Tasks */}
            <View style={{ gap: 10, marginTop: 14 }}>
              <TouchableOpacity 
                style={[styles.resetDayButton, { marginTop: 0 }]}
                onPress={() => {
                  resetTasksForNewDay();
                  showMessage(t('new_day_alert', '🔄 New Day Started! All daily quests reset to 0/N completed.'));
                }}
              >
                <RotateCcw size={16} color={Colors.blue} />
                <Text style={styles.resetDayButtonText}>{t('start_fresh_new_day', 'Reset Daily Quests (0/N)')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.resetDayButton, { marginTop: 0, backgroundColor: 'rgba(232,0,27,0.12)', borderColor: Colors.red }]}
                onPress={() => {
                  if (tasks.some(task => task.pendingApproval)) { showMessage(t('quest_review_before_delete')); return; }
                  confirmAction(t('delete_all_tasks_confirm', 'Are you sure you want to delete all tasks for this child?'), deleteAllTasks);
                }}
              >
                <Trash2 size={16} color={Colors.red} />
                <Text style={[styles.resetDayButtonText, { color: Colors.red }]}>{t('delete_all_tasks_btn', 'Delete All Tasks 🗑️')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Parent Check/Uncheck Awarded Winnings Card */}
        <View onLayout={event => { sectionPositions.current.rewards = event.nativeEvent.layout.y; }} style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Gift size={18} color={Colors.amber} />
            <Text style={[styles.secTitle, { marginBottom: 0 }]}>{t('awarded_winnings_title', 'AWARDED WINNINGS & REDEMPTIONS')}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.settingsSub}>{t('awarded_winnings_sub', 'Tap any prize to check or uncheck if your child has redeemed it in real life:')}</Text>
            {wonPrizes.length === 0 ? (
              <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, textAlign: 'center', marginVertical: 10 }}>
                {t('no_prizes_won_yet', 'No prizes won on the wheel yet!')}
              </Text>
            ) : (
              <View style={styles.questCheckList}>
                {wonPrizes.map((item, index) => {
                  const itemKey = item.id || `parent_won_${index}`;
                  return (
                    <TouchableOpacity 
                      key={itemKey} 
                      style={[styles.questCheckRow, item.redeemed && styles.questCheckRowDone]}
                      onPress={() => togglePrizeRedeemed(item.id || index)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Text style={{ fontSize: 22 }}>
                          {item.prize.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)?.[0] || '🎁'}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.questCheckName, item.redeemed && styles.questCheckNameDone]}>
                            {item.prize.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/, '').trim()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.checkStatusPill}>
                        {item.redeemed ? (
                          <View style={styles.doneTag}>
                            <CheckCircle2 size={16} color={Colors.green} />
                            <Text style={styles.doneTagText}>{t('redeemed', 'REDEEMED ✅')}</Text>
                          </View>
                        ) : (
                          <View style={styles.pendingTag}>
                            <Gift size={16} color={Colors.amber} />
                            <Text style={[styles.pendingTagText, { color: Colors.amber }]}>{t('ready_to_redeem', 'UNCLAIMED 🎁')}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Unlocked Figures & Prices Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ShoppingBag size={18} color={Colors.blue} />
            <Text style={[styles.secTitle, { marginBottom: 0 }]}>{t('kid_unlocked_figures_title', 'UNLOCKED FIGURES & PRICES')}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.settingsSub}>{t('kid_unlocked_figures_sub', 'Roblox figures purchased by your child using earned coins:')}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface2, padding: 12, borderRadius: 12, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Coins size={20} color={Colors.amber} />
                <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.text, fontSize: 14 }}>
                  {t('coins_balance', 'Coins Balance:')}
                </Text>
              </View>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 18 }}>
                {coins} 💰
              </Text>
            </View>

            {unlockedAvatars.length === 0 ? (
              <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, textAlign: 'center', marginVertical: 10 }}>
                {t('no_figures_bought_yet', 'No figures purchased in the shop yet.')}
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {AVAILABLE_AVATARS.filter(av => unlockedAvatars.includes(av.id)).map((av) => (
                  <View key={av.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface2, padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: av.color }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <Image source={av.image} style={{ width: 52, height: 52 }} contentFit="contain" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 15 }}>{av.name}</Text>
                        <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 12 }}>
                          {t(`shop_skill_${av.id}`)} · ♥ 100 · ⚔ 14
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,179,0,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 13 }}>
                        {av.price === 0 ? `${t('free_reward')} 🎁` : `${av.price} 💰`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View onLayout={event => { sectionPositions.current.rewards = event.nativeEvent.layout.y; }} style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Gift size={18} color={Colors.amber} />
            <Text style={[styles.secTitle, { marginBottom: 0 }]}>{t('prize_settings').toUpperCase()}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.settingsSub}>{t('prize_settings_sub')}</Text>
            
            <View style={styles.rewardList}>
              {editingPrizes.map((prize, index) => (
                <View key={index} style={{ gap: 8 }}><View style={styles.rewardRow}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('prize_choose_icon')} ${index + 1}`} onPress={() => setChoosingPrizeIcon(choosingPrizeIcon === index ? null : index)} style={styles.rewardIconButton}><Text style={styles.rewardIcon}>{prizeEmoji(prize)}</Text></TouchableOpacity>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={prizeLabel(prize)}
                  onFocus={() => setChoosingPrizeIcon(index)}
                  onChangeText={(text) => updatePrize(index, text)}
                  placeholder={t('family_reward_number', { count: index + 1 })}
                  accessibilityLabel={t('family_reward_number', { count: index + 1 })}
                  placeholderTextColor={Colors.textMuted}
                  maxLength={60}
                />
                </View>{choosingPrizeIcon === index && <View accessibilityRole="radiogroup" accessibilityLabel={t('prize_choose_icon')} style={styles.rewardIconGrid}>{PRIZE_ICONS.map(icon => <TouchableOpacity key={icon} accessibilityRole="radio" accessibilityState={{ checked: prizeEmoji(prize) === icon }} onPress={() => updatePrizeIcon(index, icon)} style={[styles.rewardIconChoice, prizeEmoji(prize) === icon && styles.rewardIconChoiceActive]}><Text style={{ fontSize: 28 }}>{icon}</Text></TouchableOpacity>)}</View>}</View>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSavePrizes}>
              <Text style={styles.saveButtonText}>{t('save_prizes')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dedicated Language Preference Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.textSecondary, fontSize: 13 }}>
              🌐 {t('language_preference', 'LANGUAGE PREFERENCE')}
            </Text>
            <LanguageSwitcher />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardLayer: {
    flex: 1,
  },
  container: {
    padding: 18,
    paddingBottom: 60,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    color: Colors.text,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  section: {
    marginBottom: 24,
  },
  secTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sectionEmoji: { fontSize: 34 },
  sectionTitle: { fontFamily: 'Nunito_900Black', fontSize: 21, lineHeight: 27, color: Colors.text, flexShrink: 1 },
  sectionHint: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, color: Colors.textMuted, marginTop: 2 },
  featurePanel: { backgroundColor: '#131726', borderWidth: 2, borderColor: 'rgba(255,184,0,0.32)', borderRadius: 22, padding: 18 },
  fieldLabel: { fontFamily: 'Nunito_800ExtraBold', color: Colors.textSecondary, fontSize: 16, marginBottom: 8 },
  epicTitleInput: { minHeight: 82, paddingVertical: 14, textAlignVertical: 'top', fontSize: 19 },
  xpChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  xpChoice: { minWidth: 72, minHeight: 48, flexGrow: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: Colors.surface2, borderWidth: 2, borderColor: Colors.border2 },
  xpChoiceActive: { backgroundColor: Colors.amberDim, borderColor: Colors.amber },
  xpChoiceText: { fontFamily: 'Nunito_800ExtraBold', color: Colors.textSecondary, fontSize: 16 },
  xpChoiceTextActive: { color: Colors.amber },
  card: {
    backgroundColor: '#131726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: Colors.text,
    flexShrink: 1,
  },
  childSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
  },
  approveButton: {
    backgroundColor: Colors.greenDim,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.4)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  approveButtonText: {
    color: Colors.green,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
  },
  viewButton: {
    backgroundColor: Colors.amberDim,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewButtonText: {
    color: Colors.amber,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
  },
  settingsSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  rewardList: { gap: 10, marginBottom: 18 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  rewardIconButton: { width: 58, height: 58, flexShrink: 0, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.amberDim, borderWidth: 2, borderColor: 'rgba(255,184,0,0.35)' },
  rewardIcon: { fontSize: 32 },
  rewardIconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 68 },
  rewardIconChoice: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2 },
  rewardIconChoiceActive: { backgroundColor: Colors.amberDim, borderColor: Colors.amber },
  input: {
    width: '100%',
    minHeight: 54,
    backgroundColor: '#1A2035',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.amber,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#121212',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
  },
  questCheckList: {
    gap: 8,
  },
  questCheckRow: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questCheckRowDone: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenDim,
  },
  questCheckName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    flexShrink: 1,
  },
  questCheckNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  checkStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    width: 32,
  },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.green,
  },
  doneTagText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.green,
  },
  pendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  pendingTagText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.textMuted,
  },
  resetDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blueDim,
    borderWidth: 1,
    borderColor: 'rgba(41,182,246,0.3)',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 14,
  },
  resetDayButtonText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.blue,
    flexShrink: 1,
    textAlign: 'center',
  },
  userTag: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.amber,
    marginTop: 2,
  },
  childPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#131726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  childPillActive: {
    borderColor: Colors.amber,
    backgroundColor: Colors.amberDim,
  },
  childPillName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.text,
  },
  childPillNameActive: {
    color: Colors.amber,
  },
  childPillTag: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
  },
});
