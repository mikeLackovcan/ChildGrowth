import React, { useRef, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Mic } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { questDevice } from '../../lib/questDevice';
import { Colors } from '../../constants/theme';

export default function TaskMicrophone({ onResult, onStatus }: { onResult: (text: string) => void; onStatus: (text: string) => void }) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return <Pressable accessibilityRole="button" accessibilityLabel={t('voice_task')} accessibilityState={{ disabled: busy, busy }} disabled={busy}
      style={{ minHeight: 52, minWidth: 52, borderRadius: 12, backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
      onPress={async () => {
        if (!questDevice) { onStatus(t('voice_unavailable')); return; }
        setBusy(true); onStatus('');
        try {
          const locale = ({ en: 'en-US', cs: 'cs-CZ', es: 'es-ES', de: 'de-DE' } as Record<string, string>)[i18n.language.split('-')[0]] || 'en-US';
          const text = await questDevice.speak(locale, t('voice_prompt'));
          if (mounted.current && text.trim()) { onResult(text.trim().slice(0, 100)); onStatus(t('voice_review')); }
        } catch { if (mounted.current) onStatus(t('voice_unavailable')); }
        finally { if (mounted.current) setBusy(false); }
      }}><Mic size={28} color="#081A4B" /></Pressable>;
}
