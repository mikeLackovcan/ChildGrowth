import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { progressBusy } from '../../lib/progressQueue';
export default function SyncActivity() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(progressBusy);
  useEffect(() => { const timer = setInterval(() => setBusy(progressBusy()), 500); return () => clearInterval(timer); }, []);
  return busy ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}><ActivityIndicator size="small" color="#f7ce68" /><Text style={{ color: '#f7ce68', flexShrink: 1 }}>{t('sync_working')}</Text></View> : null;
}
