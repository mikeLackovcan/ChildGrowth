import { fighterImage } from '../../constants/fighterImages';
import QuestCelebration from '../../components/questblox/QuestCelebration';
import { canManageQuest } from '../../utils/accountState';
import { Pencil, Trash2, Plus, Volume2 } from 'lucide-react-native';
import { confirmAction } from '../../lib/dialogs';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, AppState, TextInput } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { calculateQuestReward, getNextLockedAvatar } from '../../utils/avatarSkills';
import { questVisual } from '../../utils/questVisuals';
import { localDay, tasksForDay, taskBaseReward } from '../../utils/questDay';
import { Screen, Button, Progress, SceneArt, ui, palette, fighterFor } from '../../components/questblox/UI';

export default function QuestsScreen() {
  const s = useAppStore();
  const { t, i18n } = useTranslation();
  const [editingRevision, setEditingRevision] = useState<string | number>(0);
  const [editingQuest, setEditingQuest] = useState<string | null>(null);
  const [questName, setQuestName] = useState('');
  const [message, setMessage] = useState('');
  const [handlingInvite, setHandlingInvite] = useState(false);
  const [claimingGift, setClaimingGift] = useState(false);
  const [epicOpen, setEpicOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [detailsTask, setDetailsTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  useEffect(() => {
    let syncing = false;
    const refresh = async () => {
      const state = useAppStore.getState();
      if (state.lastActiveDate !== localDay()) state.resetTasksForNewDay();
      if (!syncing && state.userId !== 'guest-local' && !!state.userEmail) {
        syncing = true;
        try { await state.loadMockState(); } finally { syncing = false; }
      }
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    const listener = AppState.addEventListener('change', status => { if (status === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  const { quest } = useLocalSearchParams<{ quest?: string }>();
  useEffect(() => { if (quest && s.tasks.some(task => task.id === quest)) setSelectedTask(quest); }, [quest]);
  useEffect(() => () => { import('expo-speech').then(speech => speech.stop()).catch(() => {}); }, []);
  if (!s.userEmail) return <Redirect href="/login" />;
  if (s.role === 'parent') return <Redirect href="/parent-dashboard" />;
  const today = localDay();
  const tasks = tasksForDay(s.tasks);
  const done = tasks.filter(task => task.done).length;
  const allDone = tasks.every(task => task.done && !task.pendingApproval);
  const epicDone = s.epicClaimedDate === today;
  const goal = getNextLockedAvatar(s.unlockedAvatars, s.coins);
  const goalFighter = fighterFor(goal?.id || s.currentAvatar);
  const epicReward = calculateQuestReward(s.epicBossXP || 35, 'boss', s.currentAvatar, false, done);
  const completed = done + Number(epicDone);
  const activeTask = selectedTask || tasks.find(task => !task.done && !task.pendingApproval)?.id;
  const currentFighter = fighterFor(s.currentAvatar);
  const defaultEpicTask = '30-min deep focus block 🧠';
  const epicTaskName = s.epicBossTask === defaultEpicTask ? t('quest_focus_full') : s.epicBossTask;
  const invitation = s.children.find(c => c.initiatedBy === 'parent' && !c.isApproved && c.linkedParents?.length);
  return <Screen>
    <View style={{ height: 250, marginHorizontal: -20, justifyContent: 'center', paddingHorizontal: 20 }}>
      <SceneArt source={fighterImage(currentFighter.id, s.fighterOutfits[currentFighter.id])} prominent />
      <View style={{ width: '48%', gap: 10 }}><Text style={ui.label}>{t('quest_today')}</Text><Text style={[ui.title, { fontSize: 30, lineHeight: 35 }]}>{epicDone ? t('quest_hero_ready') : t('quest_hero_intro')}</Text><Text style={ui.meta}>{t('quest_progress', { done: completed, total: tasks.length + 1 })}</Text></View>
    </View>
    {!!message && <QuestCelebration message={message} fighter={s.currentAvatar} />}
    {invitation && <View style={{ gap: 12, paddingVertical: 16 }}><Text style={ui.heading}>👨‍👩‍👧 {t('family_waiting_title')}</Text><Text style={ui.text}>{t('family_invitation_from', { name: invitation.linkedParents[0] })}</Text>
      <Button disabled={handlingInvite} label={t('family_accept')} onPress={async () => {
        if (handlingInvite) return; setHandlingInvite(true);
        try { if (!await s.acceptParentInvite(invitation.linkedParents[0])) setMessage(t('family_link_error')); } finally { setHandlingInvite(false); }
      }} />
      <Button secondary disabled={handlingInvite} label={t('family_decline')} onPress={async () => {
        if (handlingInvite) return; setHandlingInvite(true);
        try { if (!await s.denyParentInvite(invitation.linkedParents[0])) setMessage(t('family_link_error')); } finally { setHandlingInvite(false); }
      }} />
    </View>}
    {s.approvalStatus === 'pending' && <View style={ui.card}><Text style={ui.heading}>{t('family_waiting_title')}</Text><Text style={ui.meta}>{s.pendingInvitation ? t(s.pendingInvitation.sentByMe ? 'family_invite_sent_to' : 'family_invite_received', { name: s.pendingInvitation.name }) : t('family_waiting_body')}</Text><Button secondary label={t('family_check_status')} onPress={() => router.push('/waiting')} /></View>}
    <Pressable accessibilityRole="button" accessibilityLabel={t('quest_collection')} onPress={() => router.push('/(tabs)/shop')} style={{ gap: 8 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.meta}>{goal ? t('quest_saving', { name: goalFighter.name }) : currentFighter.name}</Text><Text style={[ui.meta, { color: palette.gold }]}>{goal ? `${t('quest_coins_left', { count: goal.coinsNeeded })} →` : `${t('quest_meet_fighter')} →`}</Text></View>
      <Progress value={goal?.progressPct ?? 100} label={t('quest_savings_progress')} />
    </Pressable>
    {s.isSick ? <View style={ui.card}><Text style={ui.heading}>{t('quest_rest_title')}</Text><Text style={ui.text}>{t('quest_rest_body')}</Text><Button label={t('quest_rest_end')} onPress={() => s.setSick(false)} /></View> : <>
      <View style={{ position: 'relative', paddingLeft: 34 }}>
        <View style={{ position: 'absolute', left: 10, top: 18, bottom: 50, width: 2, backgroundColor: palette.line }} />
        <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <Text style={ui.label}>{t('quest_path')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('quest_add')} testID="quest-add-button" onPress={() => router.push('/manage-tasks')} style={({ pressed }) => ({ width: 64, height: 64, borderRadius: 32, backgroundColor: palette.gold, borderWidth: 3, borderColor: '#fff0bf', alignItems: 'center', justifyContent: 'center', marginVertical: 8, elevation: 5, shadowColor: palette.gold, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 10, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
            <Plus size={36} strokeWidth={3} color={palette.bg} />
          </Pressable>
        </View>
        {!tasks.length && <Text style={ui.meta}>{t('quest_empty')}</Text>}
        {tasks.map((task, index) => {
          const reward = task.awardedReward || calculateQuestReward(taskBaseReward(task), task.diff, s.currentAvatar, Boolean(task.mystery), done, s.superchargedTaskId === task.id);
          const visual = questVisual(task, t(task.name, task.name), s.language);
          const expanded = activeTask === task.id && !task.done && !task.pendingApproval;
          return <View key={task.id} style={{ paddingVertical: 16, gap: 12 }}>
            <View style={{ position: 'absolute', left: -34, top: 18, width: 22, height: 22, borderRadius: 11, backgroundColor: task.done ? palette.green : expanded ? palette.gold : palette.bg, borderWidth: 1, borderColor: task.done ? palette.green : palette.line, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: task.done || expanded ? palette.bg : palette.muted, fontSize: 11 }}>{task.done ? '✓' : index + 1}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t(task.done ? 'quest_view_completed' : task.pendingApproval ? 'quest_view_pending' : 'quest_view', { name: t(task.name, task.name) })} accessibilityState={{ expanded: expanded || detailsTask === task.id }} onPress={() => {
              if (task.done || task.pendingApproval || expanded) setDetailsTask(detailsTask === task.id ? null : task.id);
              else { setSelectedTask(task.id); setDetailsTask(null); }
            }} style={[ui.row, { gap: 12, flex: 1, minWidth: 0 }]}>
              <View accessible={false} style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: 86, height: 86, borderRadius: 43, backgroundColor: `${visual.color}15` }} />
                <Text style={{ fontSize: 70, lineHeight: 88 }}>{visual.icon}</Text>
                {task.done && <View style={{ position: 'absolute', right: 0, bottom: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.bg }}>✓</Text></View>}
              </View>
              <View style={{ flex: 1, gap: 5 }}><Text style={[ui.heading, { fontSize: 23 }]}>{visual.label}</Text><Text accessibilityLabel={task.pendingApproval ? t('quest_parent_check') : task.done ? t('quest_done') : t('quest_reward_amount', { coins: reward.coinGain, xp: reward.xpGain })} style={ui.meta}>{task.pendingApproval ? `⏳ ${t('quest_parent_check')}` : task.done ? `✓ ${t('quest_done')}` : `🪙 ${reward.coinGain}  ·  ✨ ${reward.xpGain}`}</Text></View>
            </Pressable>
            {editingQuest !== task.id && canManageQuest(task, s.role, s.linkedParents) && <View style={{ width: 44, alignSelf: 'center' }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('quest_edit', { name: t(task.name, task.name) })}
                onPress={() => { setQuestName(t(task.name, task.name)); setEditingRevision(task.revision ?? 0); setEditingQuest(task.id); }}
                style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
                <Pencil size={18} color={palette.muted} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('quest_delete', { name: t(task.name, task.name) })}
                onPress={() => task.pendingApproval ? setMessage(t('quest_review_before_delete')) : confirmAction(t('quest_delete_confirm', { name: t(task.name, task.name) }), () => {
                  s.removeTask(task.id); if (selectedTask === task.id) setSelectedTask(null);
                  if (detailsTask === task.id) setDetailsTask(null);
                })} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
                <Trash2 size={18} color={palette.muted} />
              </Pressable>
            </View>}
            </View>
            {expanded && <Pressable accessibilityRole="button" accessibilityLabel={t('quest_listen')} onPress={async () => {
              setDetailsTask(task.id);
              try { const speech = await import('expo-speech'); await speech.stop(); speech.speak(t(task.name, task.name), { language: s.language, rate: 0.85, onError: () => setMessage(t('quest_voice_error')) }); } catch { setMessage(t('quest_voice_error')); }
            }} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Volume2 size={25} color={palette.gold} /></Pressable>}
            {detailsTask === task.id && <Text style={ui.text}>{t(task.name, task.name)}</Text>}
            {editingQuest === task.id ? <View style={{ gap: 10 }}>
              <TextInput autoFocus accessibilityLabel={t('quest_instructions')} value={questName} onChangeText={setQuestName}
                style={[ui.text, { padding: 12, borderRadius: 10, backgroundColor: palette.panel, minHeight: 48 }]}
                returnKeyType="done" />
              <View style={ui.row}>
                <View style={{ flex: 1 }}><Button label={t('action_save')} disabled={!questName.trim()} onPress={() => {
                  if (s.updateTask(task.id, { name: questName.trim() }, editingRevision)) setEditingQuest(null);
                  else setMessage(t('quest_edit_changed'));
                }} /></View>
                <View style={{ flex: 1 }}><Button secondary label={t('action_cancel')} onPress={() => setEditingQuest(null)} /></View>
              </View>
            </View> : null}

            {expanded && editingQuest !== task.id && <>
              {!task.startedAt ? <Button label={`▶ ${t('quest_start')}`} onPress={() => { setMessage(''); s.startQuest(task.id); }} /> : <Button label={`✓ ${t('quest_complete_action')}`} onPress={() => {
                const result = s.toggleTaskDone(task.id, Boolean(task.mystery));
                setSelectedTask(null);
                setDetailsTask(null);
                setMessage(result ? t('quest_complete', { coins: result.coinGain }) : task.requiresApproval ? t('quest_waiting') : '');
              }} />}
              {task.startedAt && <Text style={ui.meta}>{t('quest_working')}</Text>}
              {task.canPostpone && <Button secondary label={`${t('quest_later')} →`} onPress={() => { s.postponeTask(task.id); setSelectedTask(null); }} />}
            </>}
          </View>;
        })}
        <View style={{ paddingVertical: 22, gap: 12 }}>
          <View style={{ position: 'absolute', left: -34, top: 24, width: 22, height: 22, borderRadius: 11, backgroundColor: epicDone ? palette.green : palette.gold, alignItems: 'center', justifyContent: 'center' }}><Text>{epicDone ? '✓' : '★'}</Text></View>
          <Text style={ui.label}>{t('quest_epic')}</Text>
          <View style={{ height: 170, marginRight: -20, justifyContent: 'flex-end' }}>
            <SceneArt source={fighterFor('roblox_dragon').image} />
            <View style={{ width: '66%', gap: 8, paddingBottom: 12 }}><Text style={{ fontSize: 58, lineHeight: 68 }}>{s.epicBossTask === defaultEpicTask ? '🧠' : '⭐'}</Text><Text style={ui.heading}>{epicTaskName}</Text>{s.epicBossTask === defaultEpicTask && <Text style={ui.meta}>⏱ {t('quest_minutes', { count: 30 })}</Text>}<Text style={ui.meta}>{epicDone ? `✓ ${t('quest_done')}` : `🪙 ${epicReward.coinGain} · ${epicReward.xpGain} XP`}</Text></View>
          </View>
          {!epicDone && <Button disabled={!allDone} label={allDone ? (epicOpen ? `✓ ${t('quest_complete_action')}` : `${t('quest_start')} →`) : `🔒 ${t('quest_first')}`} onPress={() => {
            if (!epicOpen) { setEpicOpen(true); return; }
            const reward = s.claimEpicBoss();
            if (reward) setMessage(t('quest_spin_ready', { coins: reward.coinGain }));
          }} />}
          {epicOpen && !epicDone && <Text style={ui.text}>{t('quest_epic_instructions', { name: epicTaskName })}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('quest_open_rewards')} onPress={() => router.push('/(tabs)/milestones')} style={[ui.row, { paddingVertical: 20 }]}>
          <View style={{ position: 'absolute', left: -34, top: 36, width: 22, height: 22, borderRadius: 11, backgroundColor: s.lastSpinDate === today ? palette.green : palette.bg, borderWidth: 1, borderColor: palette.line, alignItems: 'center' }}><Text style={{ color: palette.gold }}>✦</Text></View>
          <View style={{ flex: 1, gap: 4 }}><Text style={ui.heading}>{t(s.lastSpinDate === today ? 'quest_your_prize' : 'quest_reward_spin')}</Text><Text style={ui.meta}>{s.lastSpinDate === today ? `${t('quest_open')} →` : allDone && epicDone ? `${t('wheel_spin')} →` : `🔒 ${t('quest_spin_locked')}`}</Text></View><Image source={require('../../assets/images/prize-wheel.jpg')} style={{ width: 86, height: 86, borderRadius: 43 }} />
        </Pressable>
      </View>
    </>}
    <Button secondary label={more ? t('quest_less') : t('quest_more')} onPress={() => setMore(!more)} />
    {more && <View style={ui.card}>
      <Button secondary label={`🔔 ${t('notification_channel')}`} onPress={() => router.push('/reminders')} />
      <Text style={ui.heading}>{t('day_title')}</Text>
      <Text style={ui.meta}>{t('profile_level', { level: s.level })} · {s.xp.toLocaleString(i18n.language)} / 100 XP</Text><Progress value={s.xp} label={t('day_progress')} />
      <Text style={ui.heading}>{t('day_feeling')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('day_feeling')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {([{ id: 'wiped', icon: '😴' }, { id: 'thriving', icon: '🙂' }, { id: 'too_easy', icon: '⚡' }] as const).map(mood => <Pressable key={mood.id} accessibilityRole="radio" accessibilityLabel={t(`day_${mood.id}`)} accessibilityState={{ checked: s.dailyMood === mood.id }} aria-checked={s.dailyMood === mood.id} onPress={() => s.setDailyMood(mood.id)} style={{ flexGrow: 1, flexBasis: 90, alignItems: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: s.dailyMood === mood.id ? palette.gold : 'transparent' }}>
          <Text style={{ fontSize: 38 }}>{mood.icon}</Text><Text style={[ui.meta, { textAlign: 'center' }]}>{t(`day_${mood.id}`)}</Text>
        </Pressable>)}
      </View>
      {s.linkedParents.length > 0 && <Text style={ui.meta}>{t('day_parent_note')}</Text>}
      <Button secondary label={t('day_manage')} onPress={() => router.push('/manage-tasks')} />
      <Button secondary label={t('family_view_invitation')} onPress={() => router.push('/link-account')} />
      <Button secondary label={`🌙 ${t('day_rest')}`} onPress={() => s.setSick(true)} />
      <Button secondary disabled={claimingGift || s.dailyChestClaimedDate === today} label={t(claimingGift ? 'reminder_saving' : s.dailyChestClaimedDate === today ? 'gift_collected' : 'gift_collect')} onPress={async () => { if (claimingGift) return; setClaimingGift(true); try { const r = await s.claimDailyLoginChest(); setMessage(r ? t('gift_received', { coins: r.coins, xp: r.xp }) : t('reward_connect_retry')); } finally { setClaimingGift(false); } }} />
      {s.tasks.filter(task => !tasks.some(a => a.id === task.id)).map(task => <View key={task.id}><Text style={ui.text}>{t(task.name, task.name)}</Text><Text style={ui.meta}>{task.postponedUntil ? t('day_moved', { date: new Date(`${task.postponedUntil}T12:00:00`).toLocaleDateString(i18n.language) }) : t(`freq_${task.freq}`)}</Text></View>)}
    </View>}
  </Screen>;
}
