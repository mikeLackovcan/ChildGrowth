import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { LogOut, UserPlus, User, Gift, CheckCircle2, Circle, CheckSquare, RotateCcw, ShoppingBag, Coins, Shield, Tag, Trash2, Plus } from 'lucide-react-native';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { AVAILABLE_AVATARS } from './(tabs)/shop';

export default function ParentDashboardScreen() {
  const { t } = useTranslation();
  const logout = useAppStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
  };
  const userEmail = useAppStore((state) => state.userEmail);
  const fullName = useAppStore((state) => state.fullName);
  const nickname = useAppStore((state) => state.nickname);
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
  const addChildByNickname = useAppStore((state) => state.addChildByNickname);
  const removeChild = useAppStore((state) => state.removeChild);
  const approveChildByParent = useAppStore((state) => state.approveChildByParent);
  const verifyChildTask = useAppStore((state) => state.verifyChildTask);
  const selectChild = useAppStore((state) => state.selectChild);

  const epicBossTask = useAppStore((state) => state.epicBossTask);
  const epicBossXP = useAppStore((state) => state.epicBossXP);
  const setEpicBossTask = useAppStore((state) => state.setEpicBossTask);

  const [editingPrizes, setEditingPrizes] = useState([...prizes]);
  const [childNicknameInput, setChildNicknameInput] = useState('');
  const [childNameInput, setChildNameInput] = useState('');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const approvedChildren = children.filter(c => c.isApproved === true);
  const pendingChildren = children.filter(c => c.isApproved !== true);
  const pendingTaskReviews = children.flatMap(child => (child.tasks || []).filter(t => t.pendingApproval === true).map(t => ({ task: t, child })));
  const activeChild = approvedChildren.find(c => c.id === selectedChildId) || approvedChildren[0];

  const [epicBossTitleInput, setEpicBossTitleInput] = useState(activeChild?.epicBossTask || epicBossTask || '30-min deep focus block 🧠');
  const [epicBossXPInput, setEpicBossXPInput] = useState(String(activeChild?.epicBossXP || epicBossXP || 35));

  React.useEffect(() => {
    if (!userEmail) {
      router.replace('/');
    }
  }, [userEmail]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      useAppStore.getState().loadMockState();
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (activeChild) {
      setEpicBossTitleInput(activeChild.epicBossTask || epicBossTask || '30-min deep focus block 🧠');
      setEpicBossXPInput(String(activeChild.epicBossXP || epicBossXP || 35));
    }
  }, [activeChild?.id, epicBossTask, epicBossXP]);

  if (!userEmail) {
    return null;
  }

  const handleSaveEpicBoss = () => {
    const xpVal = parseInt(epicBossXPInput, 10);
    setEpicBossTask(epicBossTitleInput, isNaN(xpVal) ? 35 : xpVal);
    alert(t('epic_quest_saved_alert', 'Epic Daily Boss Quest updated! ⚔️'));
  };



  const handleAddChild = () => {
    if (!childNicknameInput.trim()) return;
    addChildByNickname(childNicknameInput.trim(), childNameInput.trim());
    setInviteMsg(t('invite_sent_notice', 'Invitation sent to @{{nickname}}! Waiting for kid approval on their app ⏳', { nickname: childNicknameInput.trim() }));
    setChildNicknameInput('');
    setChildNameInput('');
  };

  const handleSavePrizes = () => {
    setPrizes(editingPrizes);
    alert(t('save_prizes'));
  };

  const updatePrize = (index: number, text: string) => {
    const newPrizes = [...editingPrizes];
    newPrizes[index] = text;
    setEditingPrizes(newPrizes);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with Parent Name, Nickname and Administration Badge */}
        <View style={{ backgroundColor: Colors.amberDim, borderWidth: 1.5, borderColor: Colors.amber, borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 4, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Shield size={18} color={Colors.amber} />
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 13, letterSpacing: 0.5 }}>
                {t('parent_control_center', 'PARENTS CONTROL CENTER 👨‍👩‍👧')}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 20 }}>
              {fullName || 'Parent'} (@{nickname || userEmail?.split('@')[0] || 'parent_boss'})
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <LanguageSwitcher />
            <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: 10, borderRadius: 12 }}>
              <LogOut size={18} color={Colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Approvals Section (Parent Approves Child Link Requests) */}
        {pendingChildren.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.secTitle}>{t('pending_approvals', 'PENDING CHILD APPROVAL REQUESTS ⏳')}</Text>
            <View style={{ gap: 10 }}>
              {pendingChildren.map((child) => (
                <View key={child.id} style={[styles.card, { backgroundColor: Colors.cardYellow, borderColor: Colors.amber }]}>
                  <View style={{ gap: 10 }}>
                    <View style={styles.childInfo}>
                      <View style={[styles.avatar, { backgroundColor: Colors.surface }]}>
                        <UserPlus size={22} color={Colors.amber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.childName}>{t('kid_label', 'Kid: {{name}} (@{{nickname}})', { name: child.name, nickname: child.nickname })}</Text>
                        <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.amber, fontSize: 12, marginTop: 2 }}>
                          {child.initiatedBy === 'parent' 
                            ? t('parent_sent_invite_notice', 'Invitation sent to @{{nickname}}! Waiting for kid to accept on their app ⏳', { nickname: child.nickname })
                            : t('kid_requested_link_notice', 'Kid @{{nickname}} ({{name}}) requested parent link with you! Tap Approve to accept link ⏳', { nickname: child.nickname, name: child.name })}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {child.initiatedBy !== 'parent' && (
                        <TouchableOpacity 
                          style={{ flex: 1, backgroundColor: Colors.green, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                          onPress={() => {
                            approveChildByParent(child.id);
                            alert(`🎉 Approved ${child.name} (@${child.nickname})! Account linked successfully.`);
                          }}
                        >
                          <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 13 }}>
                            {t('btn_approve_link', 'APPROVE LINK ✅')}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity 
                        style={{ flex: 1, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
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

        {/* Pending Quest Reviews Section */}
        {pendingTaskReviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.secTitle}>{t('pending_quest_reviews', 'QUESTS AWAITING YOUR VERIFICATION 📸')}</Text>
            <View style={{ gap: 10 }}>
              {pendingTaskReviews.map(({ task, child }) => (
                <View key={`${child.id}_${task.id}`} style={[styles.card, { backgroundColor: Colors.surface2, borderColor: Colors.purple, borderWidth: 1.5 }]}>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.purple, fontSize: 16 }}>
                        {task.icon || '📸'} {task.name}
                      </Text>
                      <View style={{ backgroundColor: Colors.purpleDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.purple, fontSize: 12 }}>
                          {task.diff === 'hard' ? '+35 XP' : task.diff === 'med' ? '+20 XP' : '+10 XP'}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.textSecondary, fontSize: 13 }}>
                      Kid: <Text style={{ color: Colors.text }}>{child.name}</Text> (@{child.nickname})
                    </Text>
                    
                    {task.verificationNote && (
                      <View style={{ backgroundColor: Colors.surface, padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: Colors.purple }}>
                        <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 12 }}>
                          Note: "{task.verificationNote}"
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <TouchableOpacity 
                        style={{ flex: 1, backgroundColor: Colors.green, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                        onPress={() => {
                          verifyChildTask(child.id, task.id, true);
                          alert(`✅ Approved quest "${task.name}" for ${child.name}! XP & Coins awarded.`);
                        }}
                      >
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 13 }}>
                          APPROVE & AWARD XP ✅
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={{ flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                        onPress={() => {
                          verifyChildTask(child.id, task.id, false);
                          alert(`Returned quest to ${child.name}.`);
                        }}
                      >
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.red, fontSize: 13 }}>
                          RETURN TO KID ❌
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Approved Child Selector Switcher Bar (Only approved kids appear here) */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{t('select_child_title', 'YOUR APPROVED CHILDREN 🧒👧')}</Text>
          {approvedChildren.length === 0 ? (
            <View style={styles.card}>
              <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, textAlign: 'center', marginVertical: 8 }}>
                No approved children linked yet. Add a child by nickname below and wait for them to approve!
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
                      <View>
                        <Text style={[styles.childPillName, isSelected && styles.childPillNameActive]}>{child.name}</Text>
                        <Text style={[styles.childPillTag, isSelected && { color: Colors.amber }]}>@{child.nickname}</Text>
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
                      <View>
                        <Text style={styles.childName}>{t('kid_label', 'Kid: {{name}} (@{{nickname}})', { name: activeChild.name, nickname: activeChild.nickname })}</Text>
                        <Text style={styles.childSub}>Level {activeChild.level} • {activeChild.xp} XP • 💰 {activeChild.coins} Coins</Text>
                        {activeChild.linkedParents && activeChild.linkedParents.length > 0 && (
                          <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.blue, fontSize: 11, marginTop: 2 }}>
                            {t('instructed_by', 'Instructed by Parents: ')}{activeChild.linkedParents.map(p => `@${p}`).join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={{ backgroundColor: 'rgba(232,0,27,0.15)', borderWidth: 1, borderColor: Colors.red, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => {
                        if (confirm(`Remove ${activeChild.name} (@${activeChild.nickname})?`)) {
                          removeChild(activeChild.id);
                        }
                      }}
                    >
                      <Trash2 size={14} color={Colors.red} />
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.red, fontSize: 11 }}>{t('remove_child_btn', 'Remove 🗑️')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Add Child by Nickname Section (No Email Required!) */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{t('add_child_by_nickname', 'ADD CHILD BY NICKNAME 👨‍👩‍👧')}</Text>
          <View style={styles.card}>
            <Text style={styles.settingsSub}>{t('add_child_sub', "Enter your child's Nickname to link their account directly (no email needed!):")}</Text>
            
            <View style={{ gap: 10, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={t('name_placeholder', 'Child Name (optional)')}
                  placeholderTextColor={Colors.textMuted}
                  value={childNameInput}
                  onChangeText={setChildNameInput}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={t('nickname_input_placeholder', "Child's Nickname / Tag (e.g. AlexRoblox)")}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  value={childNicknameInput}
                  onChangeText={setChildNicknameInput}
                />
              </View>

              <TouchableOpacity 
                style={{ backgroundColor: Colors.red, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                onPress={handleAddChild}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 13 }}>{t('btn_add_child', 'ADD CHILD 🚀')}</Text>
              </TouchableOpacity>
            </View>

            {inviteMsg && (
              <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.green, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                {inviteMsg}
              </Text>
            )}
          </View>
        </View>

        {/* Edit Epic Daily Boss Quest Card */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{t('edit_epic_boss_title', 'EDIT EPIC DAILY BOSS QUEST ⚔️')}</Text>
          <View style={styles.card}>
            <Text style={styles.settingsSub}>
              {t('edit_epic_boss_sub', 'Customize the main daily boss challenge and XP reward for your child:')}
            </Text>
            
            <View style={{ gap: 10, marginTop: 8 }}>
              <View>
                <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                  {t('epic_quest_title_label', 'Epic Quest Title / Challenge:')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 30-min deep focus block 🧠"
                  placeholderTextColor={Colors.textMuted}
                  value={epicBossTitleInput}
                  onChangeText={setEpicBossTitleInput}
                />
              </View>

              <View>
                <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                  {t('epic_quest_xp_label', 'XP Reward Amount:')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="35"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={epicBossXPInput}
                  onChangeText={setEpicBossXPInput}
                />
              </View>

              <TouchableOpacity 
                style={{ backgroundColor: Colors.amber, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                onPress={handleSaveEpicBoss}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#121212', fontSize: 13 }}>
                  {t('btn_save_epic_quest', 'SAVE EPIC BOSS QUEST 💾')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Parent Check/Uncheck Quest Verification Card */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckSquare size={18} color={Colors.green} />
              <Text style={[styles.secTitle, { marginBottom: 0 }]}>{t('quest_verification_title', 'QUEST VERIFICATION (CHECK / UNCHECK)')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/manage-tasks')} style={styles.viewButton}>
              <Text style={styles.viewButtonText}>{t('manage_quests_btn', 'Manage Quests')} &gt;</Text>
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
                      {task.name}
                    </Text>
                  </View>
                  <View style={styles.checkStatusPill}>
                    {task.done ? (
                      <View style={styles.doneTag}>
                        <CheckCircle2 size={16} color={Colors.green} />
                        <Text style={styles.doneTagText}>{t('done_status', 'DONE ✅')}</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingTag}>
                        <Circle size={16} color={Colors.textMuted} />
                        <Text style={styles.pendingTagText}>{t('pending_status', 'PENDING ⏳')}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Parent Task Control Buttons: Reset Daily / Delete All Tasks */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity 
                style={[styles.resetDayButton, { flex: 1, marginTop: 0 }]} 
                onPress={() => {
                  resetTasksForNewDay();
                  alert(t('new_day_alert', '🔄 New Day Started! All daily quests reset to 0/N completed.'));
                }}
              >
                <RotateCcw size={16} color={Colors.blue} />
                <Text style={styles.resetDayButtonText}>{t('start_fresh_new_day', 'Reset Daily Quests (0/N)')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.resetDayButton, { flex: 1, marginTop: 0, backgroundColor: 'rgba(232,0,27,0.12)', borderColor: Colors.red }]} 
                onPress={() => {
                  if (confirm(t('delete_all_tasks_confirm', 'Are you sure you want to delete all tasks for this child?'))) {
                    deleteAllTasks();
                  }
                }}
              >
                <Trash2 size={16} color={Colors.red} />
                <Text style={[styles.resetDayButtonText, { color: Colors.red }]}>{t('delete_all_tasks_btn', 'Delete All Tasks 🗑️')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Parent Check/Uncheck Awarded Winnings Card */}
        <View style={styles.section}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 26 }}>{av.emoji || '🦸'}</Text>
                      <View>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 15 }}>{av.name}</Text>
                        <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 12 }}>
                          {av.battleClass} · HP {av.hp} · ATK {av.attack}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,179,0,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 13 }}>
                        {av.price === 0 ? 'FREE 🎁' : `${av.price} 💰`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Gift size={18} color={Colors.amber} />
            <Text style={[styles.secTitle, { marginBottom: 0 }]}>{t('prize_settings').toUpperCase()}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.settingsSub}>{t('prize_settings_sub', 'Set the 6 rewards kids can win when finishing all daily quests:')}</Text>
            
            <View style={styles.grid}>
              {editingPrizes.map((prize, index) => (
                <TextInput
                  key={index}
                  style={styles.input}
                  value={prize}
                  onChangeText={(text) => updatePrize(index, text)}
                  placeholder={`Prize ${index + 1}`}
                  placeholderTextColor={Colors.textMuted}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSavePrizes}>
              <Text style={styles.saveButtonText}>{t('save_prizes')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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
    backgroundColor: Colors.redDim,
    borderWidth: 1,
    borderColor: 'rgba(232,0,27,0.4)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  viewButtonText: {
    color: Colors.red,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
  },
  settingsSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  input: {
    width: '48%',
    height: 46,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.red,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
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
  },
  questCheckNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  checkStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  childPillActive: {
    borderColor: Colors.red,
    backgroundColor: Colors.cardPink,
  },
  childPillName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.text,
  },
  childPillNameActive: {
    color: Colors.red,
  },
  childPillTag: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
  },
});
