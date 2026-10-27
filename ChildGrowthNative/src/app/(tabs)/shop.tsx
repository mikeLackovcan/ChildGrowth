import { fighterImage } from '../../constants/fighterImages';
import { useTranslation } from 'react-i18next';
import { DUEL_SKILLS } from '../../utils/duel';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { AVAILABLE_AVATARS } from '../../constants/fighters';
import { WORLD_THEMES, ThemeKey } from '../../constants/theme';
import { Screen, Button, ChoiceTabs, SceneArt, ui, palette, fighterFor } from '../../components/questblox/UI';
export { AVAILABLE_AVATARS } from '../../constants/fighters';
export type { RobloxAvatar } from '../../constants/fighters';

export default function FightersScreen() {
  const { t, i18n } = useTranslation();
  const number = (value: number) => value.toLocaleString(i18n.language);
  const s = useAppStore();
  const [selected, setSelected] = useState(s.currentAvatar);
  const [tab, setTab] = useState<'mine' | 'all'>('all');
  const [stats, setStats] = useState(false);
  const [themes, setThemes] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const purchasing = useRef(false);
  const [purchaseError, setPurchaseError] = useState(false);
  const purchase = async (action: () => Promise<boolean>, fighterId?: string) => {
    if (purchasing.current) return;
    const uid = s.userId;
    purchasing.current = true; setBusy(true); setMessage(''); setPurchaseError(false);
    try {
      const confirmed = await action();
      if (useAppStore.getState().userId !== uid) return;
      if (confirmed && fighterId) setMessage(fighterId);
      if (!confirmed) setPurchaseError(true);
    } catch { if (useAppStore.getState().userId === uid) setPurchaseError(true); }
    finally { purchasing.current = false; setBusy(false); }
  };
  const fighter = fighterFor(selected);
  const skill = DUEL_SKILLS[fighter.id];
  const choices = [t('shop_all'), t('shop_mine')] as const;
  const owned = s.unlockedAvatars.includes(fighter.id) || fighter.id === 'roblox_noob';
  const equipped = fighterFor(s.currentAvatar).id === fighter.id;
  const figures = AVAILABLE_AVATARS.filter(f => tab === 'all' || s.unlockedAvatars.includes(f.id) || f.id === 'roblox_noob');
  return <Screen>
    <View><Text style={ui.title}>{t('shop_title')}</Text><Text style={ui.meta}>{t('shop_intro')}</Text></View>
    <ChoiceTabs choices={choices} selected={tab === 'mine' ? choices[1] : choices[0]} onSelect={value => {
      const mine = value === choices[1];
      setTab(mine ? 'mine' : 'all');
      if (mine && !owned) { setSelected(s.currentAvatar); setStats(false); }
    }} />
    <View style={{ gap: 8 }}>
      <Text style={ui.meta}>{number(figures.length)} / {number(AVAILABLE_AVATARS.length)} · {t('shop_browse')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
        {figures.map(f => {
          const collected = s.unlockedAvatars.includes(f.id) || f.id === 'roblox_noob';
          return <Pressable accessibilityRole="button" accessibilityLabel={t(collected ? 'shop_view_owned' : 'shop_view_price', { name: f.name, price: number(f.price) })} accessibilityState={{ selected: f.id === fighter.id }} key={f.id} onPress={() => { setSelected(f.id); setStats(false); }} style={{ width: 90, gap: 5, paddingBottom: 8, borderBottomWidth: 2, borderColor: f.id === fighter.id ? palette.gold : 'transparent' }}>
            <Image source={fighterImage(f.id, s.fighterOutfits[f.id])} style={{ width: 90, height: 90, borderRadius: 4 }} />
            <Text numberOfLines={2} style={[ui.meta, { color: palette.ink }]}>{f.name}</Text>
            <Text style={[ui.meta, { color: collected ? palette.green : palette.gold }]}>{collected ? fighterFor(s.currentAvatar).id === f.id ? `✓ ${t('shop_active')}` : `✓ ${t('shop_owned')}` : `🪙 ${number(f.price)}`}</Text>
          </Pressable>;
        })}
      </ScrollView>
    </View>
    <View style={[ui.card, { padding: 0 }]}><View style={{ height: 260, marginHorizontal: -20 }}><SceneArt source={fighterImage(fighter.id, s.fighterOutfits[fighter.id])} centered /></View><View style={{ paddingVertical: 14, gap: 12 }}><Text style={ui.label}>{equipped ? `✓ ${t('shop_active')}` : owned ? t('shop_owned') : `🪙 ${number(fighter.price)}`}</Text><Text style={ui.title}>{fighter.name}</Text>
      <View style={{ gap: 4 }}><Text style={ui.heading}>{t(`shop_skill_${fighter.id}`)}</Text><Text style={ui.meta}>{t('shop_quest_power')} · {t(`shop_buff_${fighter.id}`)}</Text></View>
      {!equipped && <Button label={owned ? t('shop_use') : s.coins >= fighter.price ? t('shop_unlock', { price: number(fighter.price) }) : t('shop_more', { amount: number(fighter.price - s.coins) })} disabled={busy || equipped || (!owned && s.coins < fighter.price)} onPress={() => {
        void purchase(() => owned ? s.setCurrentAvatar(fighter.id) : s.buyAvatar(fighter.id), fighter.id);
      }} />}
      {equipped && <Button label={t('shop_arena')} onPress={() => router.push('/(tabs)/battle')} />}
      {fighter.id === 'roblox_noob' && owned && <View style={{ gap: 8 }}>
        <Text style={ui.heading}>{t('outfit_title')}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('outfit_title')} style={ui.row}>
          {(['original', 'explorer'] as const).map(outfit => {
            const chosen = (s.fighterOutfits[fighter.id] || 'original') === outfit;
            return <Pressable key={outfit} accessibilityRole="radio" accessibilityLabel={t(`outfit_${outfit}`)} accessibilityState={{ checked: chosen, disabled: busy }} aria-checked={chosen}
              disabled={busy || chosen} onPress={() => { void purchase(() => s.setFighterOutfit(fighter.id, outfit)); }}
              style={{ flex: 1, minHeight: 100, borderBottomWidth: 3, borderColor: chosen ? palette.gold : 'transparent', paddingBottom: 8 }}>
              <Image source={fighterImage(fighter.id, outfit)} style={{ width: '100%', height: 120 }} contentFit="contain" />
              <Text style={[ui.meta, { textAlign: 'center', color: chosen ? palette.gold : palette.ink }]}>{chosen ? '✓ ' : ''}{t(`outfit_${outfit}`)}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={ui.meta}>{t('outfit_cosmetic')}</Text>
      </View>}
      <Button secondary label={stats ? t('shop_less') : t('shop_details')} onPress={() => setStats(!stats)} />
      {stats && <View style={{ gap: 6 }}><Text accessibilityLabel={t('shop_base_stats', { health: number(100), attack: number(14) })} style={ui.text}>♥ {number(100)} · ⚔ {number(14)}</Text>
        {skill && <>
          {!!skill.damage && <Text style={ui.text}>⚡ {t('shop_damage', { value: number(skill.damage) })}</Text>}
          {!!skill.heal && <Text style={ui.text}>💚 {t('shop_heal', { value: number(skill.heal) })}</Text>}
          {!!skill.shield && <Text style={ui.text}>🛡️ {t('shop_shield', { value: number(skill.shield) })}</Text>}
          {!!skill.burn && <Text style={ui.text}>🔥 {t('shop_burn', { value: number(skill.burn) })}</Text>}
          {!!skill.weaken && <Text style={ui.text}>❄️ {t('shop_weaken')}</Text>}
          {!!skill.pierce && <Text style={ui.text}>⚔️ {t('shop_pierce')}</Text>}
          {!!skill.cost && <Text style={ui.text}>♥ {t('shop_cost', { value: number(skill.cost) })}</Text>}
          {!!skill.charge && <Text style={ui.text}>🔋 {t('shop_charge', { value: number(skill.charge) })}</Text>}
        </>}
        <Text style={ui.meta}>{t('arena_balanced')}</Text></View>}
    </View></View>
    {busy && <Text accessibilityLiveRegion="polite" style={ui.meta}>{t('settings_wait')}</Text>}
    {purchaseError && <Text accessibilityLiveRegion="polite" style={ui.meta}>{t('shop_unconfirmed')}</Text>}
    {purchaseError && s.userId && s.userId !== 'guest-local' && <Button secondary label={t('recovery_title')} onPress={() => router.push('/sync-recovery')} />}
    {!!message && <Text accessibilityLiveRegion="polite" style={[ui.text, { color: palette.green }]}>{t('shop_equipped', { name: fighterFor(message).name })}</Text>}
    <Button secondary label={themes ? t('shop_less') : t('shop_worlds')} onPress={() => setThemes(!themes)} />
    {themes && (Object.keys(WORLD_THEMES) as ThemeKey[]).map(key => <View key={key} style={ui.card}><Text style={ui.heading}>{WORLD_THEMES[key].icon} {t(`shop_theme_${key}`)}</Text><Button secondary label={s.activeTheme === key ? `✓ ${t('shop_active')}` : s.unlockedThemes.includes(key) ? t('shop_use') : t('shop_unlock', { price: number(WORLD_THEMES[key].price) })} disabled={busy || s.activeTheme === key || (!s.unlockedThemes.includes(key) && s.coins < WORLD_THEMES[key].price)} onPress={() => { void purchase(() => s.unlockedThemes.includes(key) ? s.setActiveTheme(key) : s.unlockTheme(key, WORLD_THEMES[key].price)); }} /></View>)}
  </Screen>;
}
