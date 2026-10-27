import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bot, Gamepad2, Swords, Users } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FightingArena } from '../../components/questblox/FightingArena';
import { Button, fighterFor, palette, Screen, ui } from '../../components/questblox/UI';
import { fighterCombatImage, fighterHasCombatCutout, fighterImage } from '../../constants/fighterImages';
import { AVAILABLE_AVATARS } from '../../constants/fighters';
import { useAppStore } from '../../store/useAppStore';

export const ALL_ROBLOX_FIGURES = AVAILABLE_AVATARS;

function FighterPicker({ title, fighters, selected, outfit, onSelect }: {
  title: string;
  fighters: typeof AVAILABLE_AVATARS;
  selected: string;
  outfit?: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  return <View style={styles.picker}>
    <Text style={ui.label}>{title}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerList}>
      {fighters.map(fighter => {
        const chosen = fighter.id === selected;
        return <Pressable
          key={fighter.id}
          accessibilityRole="radio"
          accessibilityLabel={t('fight_choose_named', { name: fighter.name })}
          accessibilityState={{ checked: chosen }}
          onPress={() => onSelect(fighter.id)}
          style={[styles.fighterTile, chosen && { borderColor: fighter.color, backgroundColor: `${fighter.color}18` }]}
        >
          <Image source={fighterImage(fighter.id, outfit)} style={styles.fighterThumb} />
          <Text numberOfLines={1} style={[styles.fighterTileName, chosen && { color: palette.ink }]}>{fighter.name}</Text>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

export default function ArenaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const store = useAppStore();
  const [playerId, setPlayerId] = useState(store.currentAvatar);
  const [rivalId, setRivalId] = useState(store.currentAvatar === 'roblox_ninja' ? 'roblox_noob' : 'roblox_ninja');
  const [fighting, setFighting] = useState(false);
  const owned = useMemo(() => AVAILABLE_AVATARS.filter(fighter => store.unlockedAvatars.includes(fighter.id) || fighter.id === 'roblox_noob'), [store.unlockedAvatars]);
  const player = fighterFor(playerId);
  const rival = fighterFor(rivalId);
  const playerName = store.nickname || t('arena_player', { number: 1 });

  return <Screen>
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <Text style={ui.title}>{t('fight_title')}</Text>
        <Text style={ui.meta}>{t('fight_subtitle')}</Text>
      </View>
      <View accessibilityLabel={t('fight_real_time')} style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>{t('fight_live')}</Text></View>
    </View>

    {fighting ? <FightingArena
      playerId={playerId}
      rivalId={rivalId}
      playerName={playerName}
      outfit={store.fighterOutfits[playerId]}
      onLeave={() => setFighting(false)}
    /> : <>
      <View style={styles.modeCard}>
        <View style={styles.modeIcon}><Bot color={palette.gold} size={25} /></View>
        <View style={{ flex: 1 }}><Text style={ui.heading}>{t('fight_arcade')}</Text><Text style={ui.meta}>{t('fight_arcade_desc')}</Text></View>
        <Gamepad2 color={palette.muted} size={25} />
      </View>

      <View style={styles.versusCard}>
        <Image source={require('../../assets/images/fight_arena_neon.png')} contentFit="cover" style={styles.versusBackdrop} />
        <View style={styles.versusShade} />
        <View style={styles.previewSide}>
          <Image source={fighterCombatImage(player.id, store.fighterOutfits[player.id])} contentFit={fighterHasCombatCutout(player.id, store.fighterOutfits[player.id]) ? 'contain' : 'cover'} style={[styles.previewImage, !fighterHasCombatCutout(player.id, store.fighterOutfits[player.id]) && styles.previewPortrait, { borderColor: player.color }]} />
          <Text numberOfLines={1} style={styles.previewName}>{player.name}</Text>
          <Text style={styles.previewMeta}>{t('fight_you')}</Text>
        </View>
        <View style={styles.vsCircle}><Swords color={palette.bg} size={24} /><Text style={styles.vsText}>VS</Text></View>
        <View style={styles.previewSide}>
          <Image source={fighterCombatImage(rival.id)} contentFit={fighterHasCombatCutout(rival.id) ? 'contain' : 'cover'} style={[styles.previewImage, !fighterHasCombatCutout(rival.id) && styles.previewPortrait, { borderColor: rival.color }]} />
          <Text numberOfLines={1} style={styles.previewName}>{rival.name}</Text>
          <Text style={styles.previewMeta}>{t('fight_cpu')}</Text>
        </View>
      </View>

      <FighterPicker title={t('fight_pick_yours')} fighters={owned} selected={playerId} outfit={store.fighterOutfits[playerId]} onSelect={setPlayerId} />
      <FighterPicker title={t('fight_pick_rival')} fighters={AVAILABLE_AVATARS} selected={rivalId} onSelect={setRivalId} />

      <View style={styles.rules}>
        <Text style={styles.rulesTitle}>{t('fight_rules_title')}</Text>
        <Text style={ui.meta}>{t('fight_rules')}</Text>
      </View>
      <Button label={`⚔️ ${t('arena_start')}`} onPress={() => setFighting(true)} />

      <Pressable accessibilityRole="button" onPress={() => router.push('/family-battle')} style={styles.familyCard}>
        <Users color="#93c5fd" size={25} />
        <View style={{ flex: 1 }}><Text style={styles.familyTitle}>{t('online_title')}</Text><Text style={ui.meta}>{t('fight_family_desc')}</Text></View>
        <Text style={styles.familyArrow}>→</Text>
      </Pressable>
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ef444422', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99 },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#ef4444' },
  liveText: { color: '#fca5a5', fontFamily: 'Nunito_900Black', fontSize: 10, letterSpacing: 1 },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 18, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line },
  modeIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#ffc85718' },
  versusCard: { minHeight: 250, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 14, borderRadius: 18, overflow: 'hidden', backgroundColor: '#11182a', borderWidth: 2, borderColor: '#7655c766', shadowColor: '#7c3aed', shadowOpacity: 0.22, shadowRadius: 16 },
  versusBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  versusShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#05071266' },
  previewSide: { flex: 1, alignItems: 'center', gap: 6 },
  previewImage: { width: '100%', aspectRatio: 1, maxWidth: 165, borderRadius: 18 },
  previewPortrait: { borderWidth: 2 },
  previewName: { color: '#fff', fontFamily: 'Nunito_900Black', fontSize: 13, maxWidth: '100%', textShadowColor: '#000', textShadowRadius: 5 },
  previewMeta: { color: '#d8def0', fontFamily: 'Nunito_900Black', fontSize: 10, textTransform: 'uppercase', textShadowColor: '#000', textShadowRadius: 4 },
  vsCircle: { width: 58, height: 58, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold, borderWidth: 3, borderColor: '#fff4c6', transform: [{ rotate: '-7deg' }], shadowColor: palette.gold, shadowOpacity: 0.65, shadowRadius: 18 },
  vsText: { color: palette.bg, fontFamily: 'Nunito_900Black', fontSize: 10, marginTop: -3 },
  picker: { gap: 9 },
  pickerList: { gap: 10, paddingRight: 8 },
  fighterTile: { width: 88, gap: 6, padding: 6, paddingBottom: 9, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#ffffff08' },
  fighterThumb: { width: 72, height: 72, borderRadius: 12 },
  fighterTileName: { color: palette.muted, fontFamily: 'Nunito_700Bold', fontSize: 11, textAlign: 'center' },
  rules: { gap: 5, padding: 14, borderLeftWidth: 3, borderLeftColor: palette.gold, backgroundColor: '#ffc8570a' },
  rulesTitle: { color: palette.ink, fontFamily: 'Nunito_800ExtraBold', fontSize: 14 },
  familyCard: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 18, backgroundColor: '#60a5fa10', borderWidth: 1, borderColor: '#60a5fa33' },
  familyTitle: { color: palette.ink, fontFamily: 'Nunito_800ExtraBold', fontSize: 15 },
  familyArrow: { color: '#93c5fd', fontSize: 24 },
});
