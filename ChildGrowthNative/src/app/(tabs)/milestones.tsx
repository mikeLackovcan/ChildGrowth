import PrizeWheel from '../../components/questblox/PrizeWheel';
import { wheelRotation } from '../../utils/prizeWheel';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, AccessibilityInfo, TextInput, Modal, Pressable } from 'react-native';
import { useAppStore, WonPrize } from '../../store/useAppStore';
import { canSpin, localDay, tasksForDay } from '../../utils/questDay';
import { Screen, Button, ui, palette } from '../../components/questblox/UI';
import { DEFAULT_PRIZES, PRIZE_ICONS, prizeEmoji, prizeLabel } from '../../constants/prizes';

export default function RewardsScreen() {
  const { t, i18n } = useTranslation();
  const s = useAppStore();
  const [spinPool, setSpinPool] = useState<string[] | null>(null);
  const storedPool = s.prizes.filter(p => p.trim());
  const suggestedPool = storedPool.length > 0 && storedPool.length < DEFAULT_PRIZES.length ? Array.from(new Set([...storedPool, ...DEFAULT_PRIZES])) : storedPool;
  const pool = spinPool || suggestedPool;
  const spinningRef = useRef(false);
  const [spinError, setSpinError] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WonPrize | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newPrizeIcon, setNewPrizeIcon] = useState(PRIZE_ICONS[0]);
  const [presentingPrize, setPresentingPrize] = useState<WonPrize | null>(null);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { subscription.remove(); rotation.stopAnimation(); };
  }, [rotation]);
  const eligible = canSpin(s.tasks, s.epicClaimedDate, s.lastSpinDate) && !s.isSick;
  const hasSpun = s.lastSpinDate === localDay();
  const remaining = tasksForDay(s.tasks).filter(t => !t.done || t.pendingApproval).length;
  const draftPrizes = draft.split('\n').map(prize => prize.trim()).filter(Boolean);
  const updateDraftPrize = (index: number, name: string) => {
    const current = draftPrizes[index] || '';
    const icon = prizeEmoji(current);
    const next = [...draftPrizes];
    next[index] = name.trim() ? `${name.trim()} ${icon}` : icon;
    setDraft(next.join('\n'));
  };
  const removeDraftPrize = (index: number) => setDraft(draftPrizes.filter((_, prizeIndex) => prizeIndex !== index).join('\n'));
  const addDraftPrize = () => {
    const name = newPrizeName.trim();
    if (!name) return;
    setDraft([...draftPrizes, `${name} ${newPrizeIcon}`].join('\n'));
    setNewPrizeName('');
  };
  const spin = async () => {
    if (spinningRef.current) return;
    spinningRef.current = true; setSpinning(true); setSpinError(false); setResult(null);
    const prize = await s.spinPrize();
    if (!prize) { setSpinning(false); spinningRef.current = false; setSpinError(true); return; }
    const drawPool = pool;
    setSpinPool(drawPool);
    const index = drawPool.indexOf(prize.prize);
    if (index < 0) { setResult(prize); setSpinning(false); spinningRef.current = false; return; }
    rotation.setValue(0);
    Animated.timing(rotation, { toValue: wheelRotation(index, drawPool.length), duration: reduceMotion ? 0 : 3200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      setSpinning(false); spinningRef.current = false;
      if (finished) setResult(prize);
    });
  };
  return <>
  <Screen>
    <Text style={ui.title}>{t('wheel_title')}</Text>
    <PrizeWheel prizes={pool} rotation={rotation} />
    <View style={{ gap: 10 }}>
      {result && <View accessibilityLabel={result.prize} style={{ alignItems: 'center', gap: 4, paddingVertical: 4 }}><Text style={{ fontSize: 54 }}>{prizeEmoji(result.prize)}</Text><Text style={ui.heading}>{prizeLabel(result.prize)}</Text></View>}
      <Text accessibilityLiveRegion="polite" style={ui.heading}>{spinning ? t('wheel_spinning') : result ? t('prize_ready') : hasSpun ? t('wheel_saved') : eligible ? t('wheel_ready') : remaining ? t('wheel_remaining', { count: remaining }) : t('wheel_epic')}</Text>
      {!hasSpun && <Button label={spinning ? t('wheel_spinning') : t('wheel_spin')} disabled={!eligible || spinning || !pool.length} onPress={spin} />}
      {spinError && <Text accessibilityLiveRegion="polite" style={ui.text}>{t('reward_connect_retry')}</Text>}
      <Text style={ui.meta}>{pool.length ? t('wheel_equal') : t('wheel_empty')}</Text>
      {pool.map((prize, index) => <View key={`${index}-${prize}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}><Text accessibilityLabel={prize} style={{ fontSize: 32 }}>{prizeEmoji(prize)}</Text><Text style={[ui.text, { flex: 1 }]}>{index + 1} · {prizeLabel(prize)}</Text></View>)}
    </View>
    {(s.role === 'parent' || !s.linkedParents.length) && <>
      <Button secondary disabled={spinning} label={editing ? t('action_cancel') : t('wheel_edit')} onPress={() => { setDraft(s.prizes.join('\n')); setEditing(!editing); setSpinPool(null); }} />
      {editing && <View style={{ gap: 12 }}>
        <Text style={ui.meta}>{t('prize_choose_icon')}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('prize_choose_icon')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PRIZE_ICONS.map(icon => <Pressable key={icon} accessibilityRole="radio" accessibilityState={{ checked: newPrizeIcon === icon }} onPress={() => setNewPrizeIcon(icon)} style={{ width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: newPrizeIcon === icon ? palette.gold : palette.panel, borderWidth: 1, borderColor: newPrizeIcon === icon ? palette.gold : palette.line }}><Text style={{ fontSize: 28 }}>{icon}</Text></Pressable>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput accessibilityLabel={t('prize_name')} placeholder={t('prize_name')} placeholderTextColor={palette.muted} value={newPrizeName} onChangeText={setNewPrizeName} style={[ui.text, { flex: 1, minHeight: 48, borderBottomColor: palette.line, borderBottomWidth: 1, paddingHorizontal: 10 }]} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('prize_add')} disabled={!newPrizeName.trim()} onPress={addDraftPrize} style={{ minHeight: 52, borderRadius: 14, paddingHorizontal: 12, backgroundColor: newPrizeName.trim() ? palette.gold : palette.line, alignItems: 'center', justifyContent: 'center', gap: 1 }}><Text style={{ fontSize: 22 }}>➕</Text><Text style={[ui.meta, { color: palette.bg }]}>{t('prize_add')}</Text></Pressable>
        </View>
        <View style={{ gap: 8 }}>{draftPrizes.map((prize, index) => <View key={`${index}-${prize}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ fontSize: 30 }}>{prizeEmoji(prize)}</Text><TextInput accessibilityLabel={`${t('prize_name')} ${index + 1}`} value={prizeLabel(prize)} onChangeText={name => updateDraftPrize(index, name)} style={[ui.text, { flex: 1, minHeight: 44, borderBottomColor: palette.line, borderBottomWidth: 1, paddingHorizontal: 8 }]} /><Pressable accessibilityRole="button" accessibilityLabel={t('prize_remove')} onPress={() => removeDraftPrize(index)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22, color: palette.muted }}>✕</Text></Pressable></View>)}</View>
        <Button label={t('action_save')} disabled={spinning || !draftPrizes.length} onPress={() => { s.setPrizes([...new Set(draftPrizes)]); setEditing(false); }} />
      </View>}
    </>}
    <View style={{ gap: 16 }}><Text style={ui.heading}>{t('wheel_prizes')}</Text>
      {s.wonPrizes.filter(p => !spinning || p.id !== s.wonPrizes[0]?.id).map(prize => <View key={prize.id} style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ fontSize: 40 }}>{prizeEmoji(prize.prize)}</Text><Text style={[ui.heading, { flex: 1 }]}>{prizeLabel(prize.prize)}</Text></View>
        <Text style={ui.meta}>{new Date(prize.date).toLocaleDateString(i18n.language)} · {prize.redeemed ? t('prize_claimed') : prize.status === 'requested' ? t('prize_requested') : t('prize_agreed')}</Text>
        {!prize.redeemed && <View style={{ flexDirection: 'row', gap: 10 }}>
          {s.linkedParents.length && s.role !== 'parent' && prize.status !== 'approved'
            ? <Pressable accessibilityRole="button" accessibilityLabel={t(prize.status === 'requested' ? 'prize_requested' : 'prize_request')} disabled={prize.status === 'requested'} onPress={() => s.requestPrize(prize.id)} style={{ flex: 1, minHeight: 62, borderRadius: 16, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center', gap: 2, opacity: prize.status === 'requested' ? 0.55 : 1 }}><Text style={{ fontSize: 25 }}>🙋</Text><Text style={ui.meta}>{t(prize.status === 'requested' ? 'prize_requested' : 'prize_request')}</Text></Pressable>
            : <Pressable accessibilityRole="button" accessibilityLabel={t('prize_claim')} onPress={() => s.togglePrizeRedeemed(prize.id)} style={{ flex: 1, minHeight: 62, borderRadius: 16, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center', gap: 2 }}><Text style={{ fontSize: 25 }}>🎁</Text><Text style={[ui.meta, { color: palette.bg }]}>{t('prize_claim')}</Text></Pressable>}
          {s.role !== 'parent' && !s.linkedParents.length && <Pressable accessibilityRole="button" accessibilityLabel={t('prize_show_parent')} onPress={() => setPresentingPrize(prize)} style={{ flex: 1, minHeight: 62, borderRadius: 16, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.gold, alignItems: 'center', justifyContent: 'center', gap: 2 }}><Text style={{ fontSize: 25 }}>👨‍👩‍👧</Text><Text style={ui.meta}>{t('prize_show_parent')}</Text></Pressable>}
        </View>}
      </View>)}
    </View>
  </Screen>
  <Modal visible={Boolean(presentingPrize)} transparent animationType="fade" onRequestClose={() => setPresentingPrize(null)}>
    <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: 'rgba(14,20,34,0.94)', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 }}>
      {presentingPrize && <>
        <Text style={{ fontSize: 76 }}>{prizeEmoji(presentingPrize.prize)}</Text>
        <Text style={[ui.title, { textAlign: 'center' }]}>{prizeLabel(presentingPrize.prize)}</Text>
        <Text style={[ui.meta, { textAlign: 'center' }]}>{t('prize_showing_parent')}</Text>
        <Button label={`✅ ${t('prize_given')}`} onPress={() => { s.togglePrizeRedeemed(presentingPrize.id); setPresentingPrize(null); }} />
        <Button secondary label={t('action_cancel')} onPress={() => setPresentingPrize(null)} />
      </>}
    </View>
  </Modal>
  </>;
}
