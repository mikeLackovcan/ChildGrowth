import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check, RotateCcw } from 'lucide-react-native';
import type { TFunction } from 'i18next';
import { Colors } from '../../constants/theme';
import type { Task } from '../../types/progress';
import { calculateQuestReward } from '../../utils/avatarSkills';
import { taskBaseReward } from '../../utils/questDay';

export function QuestReview({ task, child, t, language, onReview }: {
  task: Task; child: { name: string; nickname: string; currentAvatar: string };
  t: TFunction; language: string; onReview: (approved: boolean) => void;
}) {
  const reward = task.pendingReward || calculateQuestReward(taskBaseReward(task), task.diff, child.currentAvatar, Boolean(task.mystery), 0);
  const date = new Date(`${task.date}T12:00:00`);
  return (
    <View style={{ paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text accessible={false} style={{ fontSize: 42 }}>{task.icon || '⭐'}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 18 }}>
            {task.shortName || t(task.name, task.name)}
          </Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>{child.name || child.nickname}</Text>
          {Number.isFinite(date.getTime()) && <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
            {t('review_submitted_day', { date: date.toLocaleDateString(language, { day: 'numeric', month: 'short' }) })}
          </Text>}
        </View>
      </View>
      <Text style={{ color: Colors.amber, fontFamily: 'Nunito_700Bold', fontSize: 13 }}>
        {t('quest_reward_amount', { coins: reward.coinGain, xp: reward.xpGain })}
      </Text>
      {!!task.verificationNote && <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>{task.verificationNote}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('review_approve')} onPress={() => onReview(true)}
          style={{ flex: 1, minHeight: 48, padding: 10, borderRadius: 16, backgroundColor: Colors.green, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <Check size={22} color="#10251A" />
          <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#10251A', textAlign: 'center', flexShrink: 1 }}>{t('review_approve')}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('review_return')} onPress={() => onReview(false)}
          style={{ flex: 1, minHeight: 48, padding: 10, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={20} color={Colors.textSecondary} />
          <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.textSecondary, textAlign: 'center', flexShrink: 1 }}>{t('review_return')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
