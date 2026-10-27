import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import type { TFunction } from 'i18next';
import type { RecoveryRequest } from '../../types/recovery';
import { Button, ui, palette, fighterFor } from './UI';

export function RecoveryReview({ request, childName, currentCoins, t, language, busy, onReview }: {
  request: RecoveryRequest; childName: string; currentCoins: number; t: TFunction; language: string; busy: boolean;
  onReview: (approved: boolean) => void;
}) {
  if (request.kind === 'quest') return <View style={{ gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: palette.line }}>
    <Text style={ui.heading}>⭐ {childName} · {t(request.quest.name, request.quest.name)}</Text>
    <Text style={ui.text}>{t('recovery_quest_summary', { date: new Date(`${request.quest.day}T12:00:00`).toLocaleDateString(language), coins: request.quest.reward.coinGain, xp: request.quest.reward.xpGain })}</Text>
    <Text style={ui.meta}>{t('recovery_quest_explain')}</Text>
    <Button disabled={busy} label={t('review_approve')} onPress={() => onReview(true)} />
    <Button secondary disabled={busy} label={t('recovery_decline')} onPress={() => onReview(false)} />
  </View>;
  const claim = request.claim;
  return <View style={{ gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: palette.line }}>
    <Text style={ui.heading}>🗂️ {childName} · {t('recovery_legacy')}</Text>
    <Text style={ui.text}>{t('recovery_parent_summary', { current: currentCoins, coins: Math.max(currentCoins, claim.coins), level: claim.level, xp: claim.xp })}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {claim.unlockedAvatars.map(id => <View key={id} style={{ width: 84, gap: 4 }}>
        <Image source={fighterFor(id).image} style={{ width: 84, height: 84 }} contentFit="contain" />
        <Text style={ui.meta}>{fighterFor(id).name}</Text>
      </View>)}
    </View>
    {claim.tasks.map((task, index) => <Text key={index} style={ui.text}>{task.icon || '⭐'} {task.shortName || t(task.name, task.name)}</Text>)}
    {claim.wonPrizes.map((prize, index) => <Text key={index} style={ui.text}>🎁 {prize.prize} · {t(prize.redeemed ? 'prize_enjoyed' : 'prize_agreed')}</Text>)}
    <Text style={ui.meta}>{t('recovery_parent_explain')}</Text>
    <Button disabled={busy} label={t('recovery_restore')} onPress={() => onReview(true)} />
    <Button secondary disabled={busy} label={t('recovery_decline')} onPress={() => onReview(false)} />
  </View>;
}
