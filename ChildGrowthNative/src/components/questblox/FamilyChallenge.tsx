import React, { useEffect, useState } from 'react';
import { Text, View, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { readFamilyStatus } from '../../lib/familyAccounts';
import { Progress, ui, palette } from './UI';
export default function FamilyChallenge() {
  const uid = useAppStore(s => s.userId);
  const { t } = useTranslation();
  const [team, setTeam] = useState<{ total: number; done: number } | null>(null);
  useEffect(() => {
    setTeam(null);
    if (!uid || uid === 'guest-local') return;
    let active = true, busy = false;
    const refresh = async () => {
      if (busy || !active || useAppStore.getState().userId !== uid) return;
      busy = true;
      try { const result = await readFamilyStatus(); if (active) setTeam(result.familyChallenge || null); }
      catch { if (active) setTeam(null); }
      finally { busy = false; }
    };
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30000);
    const listener = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [uid]);
  if (!team || !team.total) return null;
  return <View style={{ gap: 8, paddingVertical: 12 }}>
    <Text style={ui.heading}>{team.done === team.total ? '🏆' : '🐉'} {t(team.done === team.total ? 'team_cleared' : 'team_boss')}</Text>
    <Progress value={100 * team.done / team.total} label={t('team_progress', { done: team.done, total: team.total })} />
    <Text style={[ui.meta, { color: palette.gold }]}>{t('team_progress', { done: team.done, total: team.total })}</Text>
  </View>;
}
