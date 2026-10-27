import { fighterImage } from '../constants/fighterImages';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, RefreshCw, Shield, Swords, X, Zap } from 'lucide-react-native';
import { Screen, Button, Progress, fighterFor, palette, ui } from '../components/questblox/UI';
import { AVAILABLE_AVATARS } from '../constants/fighters';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { confirmAction } from '../lib/dialogs';
import { battleErrorKey, battleRequestId, challengeFamily, familyOpponents, leaveBattle, respondToBattle,
  sendBattleMove, watchFamilyBattle, watchFamilyBattles, FamilyBattle, FamilyOpponent } from '../lib/familyBattles';

export default function FamilyBattleScreen() {
  const uid = useAppStore(s => s.userId);
  return <FamilyArena key={uid || 'guest'} uid={uid} />;
}
function FamilyArena({ uid }: { uid: string | null }) {
  const { t } = useTranslation();
  const router = useRouter();
  const s = useAppStore();
  const { battleId } = useLocalSearchParams<{ battleId?: string }>();
  const signedIn = !!uid && uid === auth.currentUser?.uid;
  const [opponents, setOpponents] = useState<FamilyOpponent[]>([]);
  const [rooms, setRooms] = useState<FamilyBattle[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  useEffect(() => { if (typeof battleId === 'string' && /^[a-f0-9]{64}$/.test(battleId)) setRoomId(battleId); }, [battleId]);
  const [room, setRoom] = useState<FamilyBattle | null>(null);
  const [fighter, setFighter] = useState(s.currentAvatar);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const acting = useRef(false), mounted = useRef(true);
  // Keep the invitation's idempotency key after a network error, so retrying
  // cannot send a second invitation when the first response was lost.
  const pendingInvites = useRef<Record<string, string>>({});
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 15000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!signedIn || !uid) { setLoading(false); return; }
    let active = true;
    setLoading(true); setError(null);
    familyOpponents().then(value => { if (active) setOpponents(value); })
      .catch(e => { if (active) setError(battleErrorKey(e)); }).finally(() => { if (active) setLoading(false); });
    const stop = watchFamilyBattles(uid, value => { if (active) setRooms(value); }, e => { if (active) setError(battleErrorKey(e)); });
    return () => { active = false; stop(); };
  }, [uid, signedIn, retry]);
  useEffect(() => {
    setRoom(null);
    if (!roomId || !signedIn) return;
    return watchFamilyBattle(roomId, value => { setRoom(value); if (!value) setError('online_missing'); }, e => setError(battleErrorKey(e)));
  }, [roomId, signedIn, retry]);
  async function act(work: () => Promise<unknown>) {
    if (acting.current) return;
    acting.current = true; setBusy(true); setError(null);
    try { await work(); } catch (e) { if (mounted.current) setError(battleErrorKey(e)); }
    finally { acting.current = false; if (mounted.current) setBusy(false); }
  }
  const owned = AVAILABLE_AVATARS.filter(item => item.id === 'roblox_noob' || s.unlockedAvatars.includes(item.id));
  const chosen = owned.some(item => item.id === fighter) ? fighter : 'roblox_noob';
  const picker = <ScrollView horizontal contentContainerStyle={{ gap: 12 }}>
    {owned.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: chosen === item.id, disabled: busy }} disabled={busy} onPress={() => setFighter(item.id)} style={{ width: 88, borderBottomWidth: 3, borderBottomColor: chosen === item.id ? palette.gold : 'transparent' }}>
      <Image source={fighterImage(item.id, s.fighterOutfits[item.id])} style={{ width: 88, height: 88 }} /><Text style={ui.meta}>{item.name}</Text>
    </Pressable>)}
  </ScrollView>;
  const back = () => { if (roomId) { setRoomId(null); setError(null); } else router.back(); };
  const name = (battle: FamilyBattle, index: number) => battle.names[index] || t('arena_player', { number: index + 1 });
  const expired = !!room && room.expiresAt.toMillis() <= clock && ['invited', 'active'].includes(room.status);
  const duel = room?.duel;
  const myTurn = !!room && !!duel && room.participants[duel.active] === uid && !expired && room.status === 'active';
  return <Screen>
    <View style={ui.row}><Pressable accessibilityRole="button" accessibilityLabel={t('online_back')} onPress={back} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}><ArrowLeft color={palette.ink} /></Pressable><Text style={[ui.title, { flex: 1 }]}>{t('online_title')}</Text></View>
    {!signedIn ? <><View style={ui.row}>{['roblox_noob', 'roblox_ninja'].map(id => <Image key={id} source={fighterFor(id).image} style={{ flex: 1, aspectRatio: 1 }} />)}</View><Text style={ui.text}>{t('online_sign_in')}</Text><Button label={t('online_sign_in_button')} onPress={() => router.push('/login')} /></> : <>
      {error && <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><Text style={ui.text}>{t(error)}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('sync_retry')} onPress={() => setRetry(value => value + 1)} style={{ minHeight: 48, justifyContent: 'center' }}><RefreshCw color={palette.gold} size={28} /></Pressable></View>}
      {busy && <ActivityIndicator accessibilityLabel={t('online_sending')} color={palette.gold} />}
      {!roomId ? <>
        <Text style={ui.meta}>{t('online_family_only')}</Text>
        {picker}
        {loading && <ActivityIndicator accessibilityLabel={t('online_loading')} color={palette.gold} />}
        {!loading && !error && !opponents.length && <><Text style={ui.text}>{t('online_no_siblings')}</Text><Button secondary label={t('online_link')} onPress={() => router.push('/link-account')} /></>}
        {opponents.map(opponent => <Pressable key={opponent.uid} accessibilityRole="button" accessibilityLabel={t('online_challenge', { name: opponent.nickname })} disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => void act(async () => {
          const key = pendingInvites.current[opponent.uid] ||= battleRequestId();
          const result = await challengeFamily(opponent.uid, chosen, key);
          delete pendingInvites.current[opponent.uid];
          if (mounted.current) setRoomId(result.id);
        })} style={[ui.row, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.line }]}>
          <Image source={fighterFor(opponent.fighter).image} style={{ width: 92, height: 92 }} /><Text style={[ui.heading, { flex: 1 }]}>{opponent.nickname}</Text><Swords color={palette.gold} size={36} />
        </Pressable>)}
        {rooms.length > 0 && <Text style={ui.heading}>{t('online_battles')}</Text>}
        {rooms.slice(0, 30).map(item => {
          const other = item.participants[0] === uid ? 1 : 0;
          const isExpired = item.expiresAt.toMillis() <= clock && ['active', 'invited'].includes(item.status);
          return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={t('online_open', { name: name(item, other) })} onPress={() => setRoomId(item.id)} style={[ui.row, { paddingVertical: 8 }]}>
            <Image source={fighterImage(item.fighters[other] || 'roblox_noob', item.outfits?.[other])} style={{ width: 64, height: 64 }} /><View style={{ flex: 1 }}><Text style={ui.text}>{name(item, other)}</Text><Text style={ui.meta}>{t(isExpired ? 'online_expired' : `online_${item.status}`)}</Text></View><Swords color={palette.gold} />
          </Pressable>;
        })}
      </> : !room ? !error && <ActivityIndicator accessibilityLabel={t('online_loading')} color={palette.gold} /> : <>
        <View style={[ui.row, { alignItems: 'flex-start' }]}>{room.participants.map((_, index) => <View key={index} style={{ flex: 1, gap: 8 }}>
          <Text style={ui.heading}>{name(room, index)}</Text><Image source={fighterImage(room.fighters[index] || 'roblox_noob', room.outfits?.[index])} style={ui.art} />
          {duel && <><Progress value={duel.players[index].hp} label={t('arena_health', { name: name(room, index) })} /><Text style={ui.meta}>♥ {duel.players[index].hp} / 100 · 🛡 {duel.players[index].shield}</Text></>}
        </View>)}</View>
        <Text accessibilityLiveRegion="polite" style={ui.heading}>{expired ? t('online_expired') : room.status === 'active' && duel ? t(myTurn ? 'online_your_turn' : 'online_wait_turn', { name: name(room, duel.active) }) : room.status === 'finished' && duel?.winner != null ? t('arena_win', { name: name(room, duel.winner) }) : t(`online_${room.status}`)}</Text>
        {room.status === 'invited' && room.opponent === uid && !expired && <>{picker}<View style={ui.row}>
          {[true, false].map(accept => <Pressable key={String(accept)} accessibilityRole="button" accessibilityLabel={t(accept ? 'online_accept' : 'online_decline')} disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => void act(() => respondToBattle(room.id, accept, chosen))} style={{ flex: 1, alignItems: 'center', padding: 16 }}>{accept ? <Check color={palette.green} size={44} /> : <X color={palette.muted} size={44} />}</Pressable>)}
        </View></>}
        {duel?.event && <Text style={ui.meta}>{t(duel.event.key, { ...duel.event, name: name(room, duel.event.actor) })}</Text>}
        {duel && room.status === 'active' && !expired && <View style={ui.row}>{([{ move: 'attack', Icon: Swords }, { move: 'guard', Icon: Shield }, { move: 'skill', Icon: Zap }] as const).map(({ move, Icon }) => {
          const cooldown = move === 'skill' && duel.turn < duel.players[duel.active].readyAt;
          const disabled = busy || !myTurn || cooldown;
          return <Pressable key={move} accessibilityRole="button" accessibilityLabel={t(`arena_${move}`)} accessibilityState={{ disabled }} disabled={disabled} onPress={() => void act(() => sendBattleMove(room.id, move, duel.turn, battleRequestId()))} style={{ flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, opacity: disabled ? 0.4 : 1 }}><Icon size={36} color={palette.gold} /><Text style={ui.text}>{t(`arena_${move}`)}</Text>{cooldown && <Text style={ui.meta}>{Math.ceil((duel.players[duel.active].readyAt - duel.turn) / 2)}</Text>}</Pressable>;
        })}</View>}
        {['active', 'invited'].includes(room.status) && <Button secondary disabled={busy} label={t('arena_leave')} onPress={() => confirmAction(t('online_leave_confirm'), () => void act(() => leaveBattle(room.id)))} />}
        <Text style={ui.meta}>{t('online_saved')}</Text>
      </>}
    </>}
  </Screen>;
}
