import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, Shield, Sparkles, Swords, Footprints, ArrowUp } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fighterCombatImage, fighterHasCombatCutout, fighterImage } from '../../constants/fighterImages';
import { fighterFor, palette } from './UI';
import { FighterRig } from './FighterRig';
import { AttackAction, chooseAiInput, FightInput, newRealTimeFight, RealTimeFight, stepRealTimeFight } from '../../utils/fightingGame';
import { playSound } from '../../lib/sound';
import { fighterLoadout, RIG_SCALE } from '../../utils/fighterRigging';

interface FightingArenaProps {
  playerId: string;
  rivalId: string;
  playerName: string;
  outfit?: string;
  onLeave: () => void;
}

const neutralInput = (): FightInput => ({ move: 0, block: false });

function FightHealthBar({ fighterId, name, hp, color, rounds, reverse = false, healthLabel }: {
  fighterId: string;
  name: string;
  hp: number;
  color: string;
  rounds: number;
  reverse?: boolean;
  healthLabel: string;
}) {
  const danger = hp <= 28;
  return <View style={[styles.hudSide, reverse && { alignItems: 'flex-end' }]}>
    <View style={[styles.nameRow, reverse && { flexDirection: 'row-reverse' }]}>
      <Image source={fighterImage(fighterId)} style={[styles.hudPortrait, { borderColor: color }]} />
      <Text numberOfLines={1} style={[styles.fighterName, reverse && { textAlign: 'right' }]}>{name}</Text>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel={healthLabel} accessibilityValue={{ min: 0, max: 100, now: Math.round(hp) }} style={styles.healthShell}>
      <View style={[styles.healthFill, { width: `${hp}%`, alignSelf: reverse ? 'flex-end' : 'flex-start', backgroundColor: danger ? '#ef4444' : color }]} />
      <View style={styles.healthShine} />
    </View>
    <View style={[styles.rounds, reverse && { flexDirection: 'row-reverse' }]}>{[0, 1].map(index => <View key={index} style={[styles.roundDiamond, index < rounds && { backgroundColor: color, borderColor: '#fff' }]} />)}</View>
  </View>;
}

function ControlButton({ label, disabled = false, color = palette.gold, children, onPress, onPressIn, onPressOut }: {
  label: string;
  disabled?: boolean;
  color?: string;
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    onPressIn={onPressIn}
    onPressOut={onPressOut}
    style={({ pressed }) => [styles.control, { borderColor: color }, disabled && styles.disabled, pressed && !disabled && { backgroundColor: `${color}33`, transform: [{ scale: 0.94 }] }]}
  >{children}</Pressable>;
}

export function FightingArena({ playerId, rivalId, playerName, outfit, onLeave }: FightingArenaProps) {
  const { t } = useTranslation();
  const [fight, setFight] = useState<RealTimeFight>(() => newRealTimeFight(playerId, rivalId));
  const [stageWidth, setStageWidth] = useState(360);
  const [reduceMotion, setReduceMotion] = useState(true);
  const input = useRef<FightInput>(neutralInput());
  const lastFrame = useRef<number | null>(null);
  const lastEvent = useRef(0);
  const shake = useRef(new Animated.Value(0)).current;
  const impact = useRef(new Animated.Value(0)).current;
  const specialPulse = useRef(new Animated.Value(0)).current;
  const player = fight.fighters[0];
  const rival = fight.fighters[1];
  const controlsDisabled = fight.phase !== 'fighting';
  const playerBusy = player.action === 'jab' || player.action === 'kick' || player.action === 'special' || player.action === 'hit' || player.action === 'ko';
  const playerFighter = fighterFor(playerId);
  const rivalFighter = fighterFor(rivalId);
  const specialIndex = player.action === 'special' ? 0 : rival.action === 'special' ? 1 : null;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(true));
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);

  useFocusEffect(useCallback(() => {
    let frame = 0;
    let active = AppState.currentState === 'active';
    lastFrame.current = null;
    const listener = AppState.addEventListener('change', state => {
      active = state === 'active';
      lastFrame.current = null;
      input.current = neutralInput();
    });
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      if (!active) return;
      const dt = lastFrame.current === null ? 0 : (now - lastFrame.current) / 1000;
      lastFrame.current = now;
      const playerInput = { ...input.current };
      input.current.jump = undefined;
      input.current.attack = undefined;
      setFight(current => stepRealTimeFight(current, [playerInput, chooseAiInput(current)], dt));
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); listener.remove(); input.current = neutralInput(); };
  }, []));

  useEffect(() => {
    if (!fight.event || fight.event.serial === lastEvent.current) return;
    lastEvent.current = fight.event.serial;
    if (!reduceMotion) {
      shake.setValue(0);
      impact.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shake, { toValue: fight.event.blocked ? 2 : -7, duration: 35, useNativeDriver: true }),
          Animated.timing(shake, { toValue: fight.event.blocked ? -2 : 6, duration: 45, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(impact, { toValue: 1, duration: 45, useNativeDriver: true }),
          Animated.timing(impact, { toValue: 0, duration: 230, useNativeDriver: true }),
        ]),
      ]).start();
    }
    playSound(fight.event.blocked ? 'spin' : 'boss_hit');
  }, [fight.event, impact, reduceMotion, shake]);

  useEffect(() => {
    specialPulse.stopAnimation();
    specialPulse.setValue(0);
    if (specialIndex === null || reduceMotion) return;
    Animated.sequence([
      Animated.timing(specialPulse, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(specialPulse, { toValue: 0.66, duration: 250, useNativeDriver: true }),
      Animated.timing(specialPulse, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [reduceMotion, specialIndex, specialPulse]);

  const setMove = (move: -1 | 0 | 1) => { input.current.move = move; };
  const setBlock = (block: boolean) => { input.current.block = block; };
  const attack = (action: AttackAction) => { input.current.attack = action; };
  const jump = () => { input.current.jump = true; };
  const onStageLayout = (event: LayoutChangeEvent) => setStageWidth(event.nativeEvent.layout.width);
  const rigScale = stageWidth / 100 * RIG_SCALE;
  const fighterLeft = (x: number) => stageWidth * x / 100 - 140 * rigScale;
  const winnerName = fight.winner === 0 ? playerName : rivalFighter.name;
  const winnerId = fight.winner === 0 ? player.id : rival.id;
  const winnerColor = fight.winner === 0 ? playerFighter.color : rivalFighter.color;
  const winnerOutfit = fight.winner === 0 ? outfit : undefined;
  const announcement = fight.phase === 'countdown'
    ? (fight.phaseTime > 0.8 ? t('fight_round', { count: fight.round }) : t('fight_go'))
      : fight.phase === 'roundOver' ? fight.winner === null ? t('fight_draw') : t('fight_round_win', { name: winnerName })
      : fight.phase === 'matchOver' ? t(fight.fighters.some(f => f.hp === 0) ? 'fight_ko' : 'fight_time_up') : '';

  const names = [playerName, rivalFighter.name];
  const eventText = fight.event ? t(fight.event.combo >= 2 && !fight.event.blocked ? 'fight_hit_combo' : fight.event.blocked ? 'fight_hit_blocked' : 'fight_hit', {
    name: names[fight.event.attacker],
    damage: fight.event.damage,
    count: fight.event.combo,
  }) : t('fight_tip');

  return <View style={styles.root}>
    <View style={styles.hud}>
      <FightHealthBar fighterId={player.id} name={playerName} hp={player.hp} color={playerFighter.color} rounds={player.rounds} healthLabel={t('arena_health', { name: playerName })} />
      <View style={styles.timerBox}>
        <Text accessibilityLabel={t('fight_time_left', { count: Math.ceil(fight.timeLeft) })} style={styles.timer}>{Math.ceil(fight.timeLeft)}</Text>
        <Text style={styles.roundLabel}>{t('fight_round_short', { count: fight.round })}</Text>
      </View>
      <FightHealthBar fighterId={rival.id} name={rivalFighter.name} hp={rival.hp} color={rivalFighter.color} rounds={rival.rounds} reverse healthLabel={t('arena_health', { name: rivalFighter.name })} />
    </View>

    <Animated.View accessibilityLabel={t('fight_stage_label')} onLayout={onStageLayout} style={[styles.stage, { height: Math.max(220, stageWidth * 0.65), transform: [{ translateX: shake }] }]}>
      <Image source={require('../../assets/images/fight_arena_neon.png')} contentFit="cover" contentPosition="center" style={styles.stageArt} />
      <View style={styles.stageShade} />
      <View style={styles.floorGlow} />
      <View pointerEvents="none" style={[styles.fighterSlot, { left: fighterLeft(player.x), bottom: 16 - 20 * rigScale }]}>
        <FighterRig fighterId={player.id} outfit={outfit} action={player.action} actionElapsed={player.actionElapsed} facing={player.facing} airborne={player.y} reduceMotion={reduceMotion} pixelsPerWorldUnit={stageWidth / 100} />
      </View>
      <View pointerEvents="none" style={[styles.fighterSlot, { left: fighterLeft(rival.x), bottom: 16 - 20 * rigScale }]}>
        <FighterRig fighterId={rival.id} action={rival.action} actionElapsed={rival.actionElapsed} facing={rival.facing} airborne={rival.y} reduceMotion={reduceMotion} pixelsPerWorldUnit={stageWidth / 100} />
      </View>
      {specialIndex !== null && <Animated.View pointerEvents="none" style={[styles.specialCinematic, {
        opacity: reduceMotion ? 0.82 : specialPulse,
        transform: [{ scale: reduceMotion ? 1 : specialPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.08] }) }],
      }]}>
        <View style={[styles.specialRing, { borderColor: specialIndex === 0 ? playerFighter.color : rivalFighter.color }]} />
        <View style={[styles.specialRay, styles.specialRayOne, { backgroundColor: specialIndex === 0 ? playerFighter.color : rivalFighter.color }]} />
        <View style={[styles.specialRay, styles.specialRayTwo, { backgroundColor: specialIndex === 0 ? playerFighter.color : rivalFighter.color }]} />
        <Text style={[styles.specialText, { textShadowColor: specialIndex === 0 ? playerFighter.color : rivalFighter.color }]}>{t('fight_super_callout')}</Text>
      </Animated.View>}
      {!!fight.event && <Animated.View pointerEvents="none" style={[styles.impactFlash, { opacity: impact }]} />}
      {!!fight.event && !fight.event.blocked && <Animated.View pointerEvents="none" style={[styles.damageBurst, {
        left: Math.max(0, Math.min(stageWidth - 74, fight.event.x * stageWidth / 100 - 37)),
        top: undefined,
        bottom: 16 - fight.event.y * stageWidth / 100 - 37,
        opacity: impact,
        transform: [{ scale: impact.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.2] }) }],
      }]}><Text style={styles.damageText}>−{fight.event.damage}</Text></Animated.View>}
      {!!fight.event && fight.event.combo >= 2 && fight.fighters[fight.event.attacker].comboTimer > 0 && <View pointerEvents="none" style={[styles.comboBadge, fight.event.attacker === 1 && { left: undefined, right: 16 }]}>
        <Text style={styles.comboCount}>{fight.event.combo}</Text><Text style={styles.comboLabel}>{t('fight_combo')}</Text>
      </View>}
      {!!announcement && <View accessibilityLiveRegion="assertive" style={styles.announcement}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.announcementText}>{announcement}</Text></View>}
    </Animated.View>

    <View style={styles.weaponRow}>
      <Text style={styles.weaponLabel}>{t('fight_weapon_equipped', { weapon: t(`fight_weapon_${fighterLoadout(player.id).weapon}`) })}</Text>
      <Text style={[styles.weaponLabel, { textAlign: 'right' }]}>{t('fight_weapon_equipped', { weapon: t(`fight_weapon_${fighterLoadout(rival.id).weapon}`) })}</Text>
    </View>

    <View style={styles.energyRow}>
      <Text style={styles.energyLabel}>{t('fight_power')} {Math.round(player.energy)}%</Text>
      <View style={styles.energyTrack}><View style={[styles.energyFill, { width: `${player.energy}%`, backgroundColor: playerFighter.color }]} /></View>
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.event}>{eventText}</Text>

    {fight.phase === 'matchOver' ? <View style={styles.finish}>
      <View accessibilityLabel={t('fight_match_win', { name: winnerName })} style={[styles.finishCard, { borderColor: winnerColor }]}>
        <View style={[styles.winnerGlow, { backgroundColor: winnerColor }]} />
        <View style={[styles.winnerMedallion, { borderColor: winnerColor }]}><Text style={styles.winnerStar}>★</Text></View>
        <Image source={fighterCombatImage(winnerId, winnerOutfit)} contentFit={fighterHasCombatCutout(winnerId, winnerOutfit) ? 'contain' : 'cover'} style={[styles.winnerImage, !fighterHasCombatCutout(winnerId, winnerOutfit) && styles.winnerPortrait]} />
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.winnerName}>{winnerName}</Text>
        <Text style={[styles.finishTitle, { color: winnerColor }]}>{t('fight_match_win', { name: winnerName })}</Text>
        <Text style={styles.finishSubtitle}>{t(fight.winner === 0 ? 'fight_you_win' : 'fight_good_match')}</Text>
        <View style={styles.finalScore}><Text style={styles.finalScoreText}>{t('fight_final_score', { player: player.rounds, rival: rival.rounds })}</Text></View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => { input.current = neutralInput(); lastEvent.current = 0; lastFrame.current = null; shake.setValue(0); impact.setValue(0); setFight(newRealTimeFight(playerId, rivalId)); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{t('arena_again')}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onLeave} style={styles.leaveButton}><Text style={styles.leaveText}>{t('arena_leave')}</Text></Pressable>
    </View> : <>
      <View style={styles.controlsRow}>
        <View style={styles.controlCluster}>
          <Text style={styles.clusterLabel}>{t('fight_move')}</Text>
          <View style={styles.controlLine}>
            <ControlButton label={t('fight_move_left')} disabled={controlsDisabled} onPressIn={() => setMove(-1)} onPressOut={() => setMove(0)}><ChevronLeft color={palette.ink} size={30} /></ControlButton>
            <ControlButton label={t('fight_jump')} disabled={controlsDisabled || playerBusy} onPress={jump}><ArrowUp color={palette.ink} size={26} /></ControlButton>
            <ControlButton label={t('fight_move_right')} disabled={controlsDisabled} onPressIn={() => setMove(1)} onPressOut={() => setMove(0)}><ChevronRight color={palette.ink} size={30} /></ControlButton>
          </View>
        </View>
        <View style={styles.controlCluster}>
          <Text style={styles.clusterLabel}>{t('fight_actions')}</Text>
          <View style={styles.controlLine}>
            <ControlButton label={t('fight_block')} disabled={controlsDisabled} color="#60a5fa" onPressIn={() => setBlock(true)} onPressOut={() => setBlock(false)}><Shield color="#93c5fd" size={25} /></ControlButton>
            <ControlButton label={t('fight_punch')} disabled={controlsDisabled || playerBusy} onPress={() => attack('jab')}><Swords color={palette.gold} size={24} /></ControlButton>
            <ControlButton label={t('fight_kick')} disabled={controlsDisabled || playerBusy} color="#fb923c" onPress={() => attack('kick')}><Footprints color="#fdba74" size={25} /></ControlButton>
            <ControlButton label={t('fight_special')} disabled={controlsDisabled || playerBusy || player.energy < 100} color={playerFighter.color} onPress={() => attack('special')}><Sparkles color={playerFighter.color} size={25} /></ControlButton>
          </View>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onLeave} style={styles.leaveButton}><Text style={styles.leaveText}>{t('arena_leave')}</Text></Pressable>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 12, paddingTop: 4 },
  weaponRow: { flexDirection: 'row', gap: 12 },
  weaponLabel: { flex: 1, color: '#c4b5fd', fontSize: 11, fontFamily: 'Nunito_800ExtraBold' },
  hud: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 2 },
  hudSide: { flex: 1, gap: 5 },
  nameRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 7 },
  hudPortrait: { width: 32, height: 32, borderRadius: 9, borderWidth: 1.5, backgroundColor: '#10172a' },
  fighterName: { flex: 1, color: '#fff', fontFamily: 'Nunito_900Black', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, maxWidth: '100%', textShadowColor: '#000', textShadowRadius: 4 },
  healthShell: { width: '100%', height: 14, padding: 2, overflow: 'hidden', borderRadius: 3, backgroundColor: '#070a12', borderWidth: 1, borderColor: '#ffffff55' },
  healthFill: { height: '100%', borderRadius: 1, shadowColor: '#fff', shadowOpacity: 0.45, shadowRadius: 4 },
  healthShine: { position: 'absolute', top: 2, right: 2, left: 2, height: 2, backgroundColor: '#ffffff55' },
  timerBox: { minWidth: 58, minHeight: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: 17, backgroundColor: '#070a12', borderWidth: 1, borderColor: '#ffc85788', transform: [{ rotate: '4deg' }] },
  timer: { color: '#fff', fontFamily: 'Nunito_900Black', fontSize: 27, lineHeight: 29, fontVariant: ['tabular-nums'], textShadowColor: palette.gold, textShadowRadius: 9, transform: [{ rotate: '-4deg' }] },
  roundLabel: { color: palette.gold, fontFamily: 'Nunito_900Black', fontSize: 8, textTransform: 'uppercase', transform: [{ rotate: '-4deg' }] },
  rounds: { flexDirection: 'row', gap: 5 },
  roundDiamond: { width: 9, height: 9, backgroundColor: '#10172a', borderWidth: 1, borderColor: '#ffffff55', transform: [{ rotate: '45deg' }] },
  stage: { height: 350, overflow: 'hidden', borderRadius: 14, backgroundColor: '#080b16', borderWidth: 2, borderColor: '#7655c777', shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 18 },
  stageArt: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  stageShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#08051c22', borderTopWidth: 26, borderTopColor: '#03050c44', borderBottomWidth: 22, borderBottomColor: '#03050c55' },
  floorGlow: { position: 'absolute', left: '9%', right: '9%', bottom: 13, height: 40, borderRadius: 999, backgroundColor: '#8b5cf655', transform: [{ scaleY: 0.22 }] },
  fighterSlot: { position: 'absolute', bottom: 16 },
  impactFlash: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#ffffff99' },
  damageBurst: { position: 'absolute', top: '38%', width: 74, height: 74, alignItems: 'center', justifyContent: 'center', borderRadius: 99, backgroundColor: '#fb718555', borderWidth: 4, borderColor: '#fff' },
  damageText: { color: '#fff', fontFamily: 'Nunito_900Black', fontSize: 25, textShadowColor: '#ef4444', textShadowRadius: 8 },
  specialCinematic: { position: 'absolute', top: '20%', left: '20%', right: '20%', height: 170, alignItems: 'center', justifyContent: 'center' },
  specialRing: { position: 'absolute', width: 148, height: 148, borderRadius: 999, borderWidth: 9, opacity: 0.72 },
  specialRay: { position: 'absolute', width: '165%', height: 13, borderRadius: 99, opacity: 0.42 },
  specialRayOne: { transform: [{ rotate: '-18deg' }] },
  specialRayTwo: { transform: [{ rotate: '21deg' }] },
  specialText: { color: '#fff', fontFamily: 'Nunito_900Black', fontSize: 24, fontStyle: 'italic', letterSpacing: 1.5, textTransform: 'uppercase', textShadowRadius: 13 },
  comboBadge: { position: 'absolute', top: 18, left: 16, flexDirection: 'row', alignItems: 'baseline', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderLeftWidth: 3, borderLeftColor: palette.gold, backgroundColor: '#050711aa' },
  comboCount: { color: palette.gold, fontFamily: 'Nunito_900Black', fontSize: 29, lineHeight: 31, fontStyle: 'italic' },
  comboLabel: { color: '#fff', fontFamily: 'Nunito_900Black', fontSize: 10, letterSpacing: 1.5 },
  announcement: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#02030ab8', borderTopWidth: 2, borderBottomWidth: 2, borderColor: `${palette.gold}99` },
  announcementText: { color: '#fff', fontFamily: 'Nunito_900Black', fontStyle: 'italic', fontSize: 39, letterSpacing: 1.5, textTransform: 'uppercase', textShadowColor: palette.gold, textShadowRadius: 16, paddingHorizontal: 20 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  energyLabel: { width: 82, color: palette.gold, fontFamily: 'Nunito_900Black', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 },
  energyTrack: { flex: 1, height: 11, padding: 2, borderRadius: 2, overflow: 'hidden', backgroundColor: '#070a12', borderWidth: 1, borderColor: '#ffffff33' },
  energyFill: { height: '100%', borderRadius: 99 },
  event: { minHeight: 20, color: '#d8def0', fontFamily: 'Nunito_700Bold', fontSize: 13, textAlign: 'center' },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  controlCluster: { gap: 7 },
  clusterLabel: { color: palette.muted, fontFamily: 'Nunito_800ExtraBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2 },
  controlLine: { flexDirection: 'row', gap: 7 },
  control: { width: 54, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11192ddd', borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.38, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
  disabled: { opacity: 0.32 },
  finish: { gap: 10 },
  finishCard: { minHeight: 260, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', padding: 16, paddingTop: 6, borderRadius: 18, borderWidth: 2, backgroundColor: '#0a0f1fee' },
  winnerGlow: { position: 'absolute', top: -72, width: 250, height: 250, borderRadius: 999, opacity: 0.18 },
  winnerMedallion: { position: 'absolute', top: 12, right: 14, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 99, borderWidth: 2, backgroundColor: '#080b16' },
  winnerStar: { color: palette.gold, fontFamily: 'Nunito_900Black', fontSize: 20 },
  winnerImage: { width: 152, height: 132, marginBottom: -7 },
  winnerPortrait: { width: 108, height: 108, marginTop: 15, marginBottom: 2, borderRadius: 20 },
  winnerName: { maxWidth: '92%', color: '#fff', fontFamily: 'Nunito_900Black', fontSize: 13, letterSpacing: 1.3, textTransform: 'uppercase' },
  finishTitle: { fontFamily: 'Nunito_900Black', fontSize: 22, textAlign: 'center' },
  finishSubtitle: { color: '#d8def0', fontFamily: 'Nunito_700Bold', fontSize: 13, textAlign: 'center' },
  finalScore: { marginTop: 3, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, backgroundColor: '#ffffff12', borderWidth: 1, borderColor: '#ffffff22' },
  finalScoreText: { color: palette.gold, fontFamily: 'Nunito_900Black', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  primaryButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: palette.gold },
  primaryButtonText: { color: palette.bg, fontFamily: 'Nunito_900Black', fontSize: 15 },
  leaveButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  leaveText: { color: palette.muted, fontFamily: 'Nunito_700Bold', fontSize: 14 },
});
