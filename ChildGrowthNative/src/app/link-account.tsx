import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AtSign, Camera, CheckCircle2, Mail, QrCode, RefreshCw, Users, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { Screen, Button, ui, palette } from '../components/questblox/UI';
import { childQrValue, childTagFromQr } from '../utils/familyQr';

type ConnectMethod = 'nickname' | 'email';

export default function LinkAccountScreen() {
  const { t } = useTranslation();
  const { tag: incomingTag, qr } = useLocalSearchParams<{ tag?: string | string[]; qr?: string | string[] }>();
  const uid = useAppStore(state => state.userId);
  const role = useAppStore(state => state.role);
  const nickname = useAppStore(state => state.nickname);
  const [method, setMethod] = useState<ConnectMethod>('nickname');
  const [tag, setTag] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [foundChild, setFoundChild] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const sending = useRef(false);
  const guest = !uid || uid === 'guest-local';
  const otherRole = role === 'parent' ? t('family_child') : t('family_parent');
  const ownQr = nickname ? childQrValue(nickname) : '';

  useEffect(() => {
    const value = Array.isArray(incomingTag) ? incomingTag[0] : incomingTag;
    if (!value) return;
    const clean = value.trim().replace(/^@/, '').toLowerCase().slice(0, 254);
    setTag(clean);
    setMethod(clean.includes('@') ? 'email' : 'nickname');
  }, [incomingTag]);

  useEffect(() => {
    const value = Array.isArray(qr) ? qr[0] : qr;
    if (role === 'child' && value === 'show') setShowQr(true);
  }, [qr, role]);

  const openScanner = async () => {
    setError(''); setScanned(false);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) { setError('family_camera_denied'); return; }
    }
    setScannerOpen(true);
  };

  const scanChild = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const child = childTagFromQr(data);
    if (!child) { setError('family_qr_invalid'); return; }
    setTag(child); setMethod('nickname'); setFoundChild(child); setError(''); setSent(false); setScannerOpen(false);
  };

  const openSignIn = async () => {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try {
      await useAppStore.getState().logout();
      if (useAppStore.getState().userId) { setError('auth_retry'); return; }
      router.replace('/login');
    } catch { setError('auth_retry'); }
    finally { sending.current = false; setBusy(false); }
  };

  const connect = async () => {
    if (sending.current || guest || auth.currentUser?.uid !== uid) return;
    const cleanTag = tag.trim().replace(/^@/, '').toLowerCase();
    const valid = method === 'email'
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTag)
      : /^[a-z0-9_-]{3,24}$/.test(cleanTag);
    if (!valid) { setError(method === 'email' ? 'family_email_invalid' : 'nickname_invalid_short'); return; }
    sending.current = true; setBusy(true); setError(''); setSent(false);
    try {
      const state = useAppStore.getState();
      const invitationSent = role === 'parent' ? await state.addChildByNickname(cleanTag) : await state.sendParentInvite(cleanTag);
      if (auth.currentUser?.uid !== uid || useAppStore.getState().userId !== uid) return;
      if (!invitationSent) { setError('family_link_error'); return; }
      setSent(true); setTag(''); setFoundChild('');
    } catch { if (useAppStore.getState().userId === uid) setError('family_link_error'); }
    finally { sending.current = false; setBusy(false); }
  };

  return <Screen>
    <Pressable accessibilityRole="button" accessibilityLabel={t('online_back')} onPress={() => router.back()} style={styles.back}><X size={22} color={palette.muted} /></Pressable>
    <View style={styles.hero}>
      <View style={styles.heroIcon}><Users size={38} color={palette.gold} /></View>
      <Text style={ui.title}>{t('family_connect_title')}</Text>
      <Text style={styles.intro}>{guest ? t('family_signin_first') : t('family_connect_intro', { role: otherRole })}</Text>
    </View>
    {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{t(error)}</Text>}
    {sent && <View accessibilityLiveRegion="polite" style={styles.success}><CheckCircle2 size={22} color={palette.green} /><Text style={styles.successText}>{t('family_invitation_sent')}</Text></View>}
    {guest ? <Button disabled={busy} label={t(busy ? 'settings_wait' : 'auth_signin')} onPress={() => { void openSignIn(); }} /> : <>
      {role === 'parent' && <Pressable accessibilityRole="button" accessibilityLabel={t('family_scan_child_qr')} onPress={() => { void openScanner(); }} style={styles.scanButton}>
        <View style={styles.scanIcon}><Camera size={30} color={palette.bg} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.scanTitle}>{t('family_scan_child_qr')}</Text><Text style={styles.scanSub}>{t('family_scan_child_qr_hint')}</Text></View>
        <QrCode size={25} color={palette.gold} />
      </Pressable>}
      {role === 'parent' && <View style={styles.orRow}><View style={styles.line} /><Text style={styles.orText}>{t('auth_or_clean')}</Text><View style={styles.line} /></View>}
      <View accessibilityRole="tablist" style={styles.tabs}>
        {(['nickname', 'email'] as const).map(item => {
          const selected = method === item;
          const Icon = item === 'email' ? Mail : AtSign;
          return <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { setMethod(item); setTag(''); setError(''); }} style={[styles.tab, selected && styles.tabActive]}>
            <Icon size={21} color={selected ? palette.bg : palette.muted} />
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{t(item === 'email' ? 'auth_field_email' : 'auth_field_nickname')}</Text>
          </Pressable>;
        })}
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t(method === 'email' ? 'family_email_label' : 'family_nickname_label', { role: otherRole })}</Text>
        <View style={styles.inputShell}>
          {method === 'email' ? <Mail size={22} color={palette.gold} /> : <AtSign size={22} color={palette.gold} />}
          <TextInput testID="family-connect-input" accessibilityLabel={t(method === 'email' ? 'family_email_label' : 'family_nickname_label', { role: otherRole })}
            value={tag} editable={!busy} onChangeText={value => { setTag(value); setError(''); setSent(false); }} autoCapitalize="none" autoCorrect={false}
            keyboardType={method === 'email' ? 'email-address' : 'default'} maxLength={method === 'email' ? 254 : 24} returnKeyType="send" onSubmitEditing={() => { void connect(); }}
            placeholder={t(method === 'email' ? 'family_email_placeholder' : 'family_nickname_placeholder')} placeholderTextColor={palette.muted} style={styles.input} />
        </View>
      </View>
      {!!foundChild && <View accessibilityLiveRegion="polite" style={styles.found}><CheckCircle2 size={21} color={palette.green} /><Text style={styles.foundText}>{t('family_qr_child_found', { name: foundChild })}</Text></View>}
      <Button disabled={busy || !tag.trim()} label={t(busy ? 'settings_wait' : 'family_connect_button')} onPress={() => { void connect(); }} />
      {role === 'child' && <><View style={styles.orRow}><View style={styles.line} /><Text style={styles.orText}>{t('auth_or_clean')}</Text><View style={styles.line} /></View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showQr }} onPress={() => setShowQr(value => !value)} style={styles.qrButton}>
        <QrCode size={28} color={palette.gold} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.qrTitle}>{t('family_show_child_qr')}</Text><Text style={styles.qrSub}>{t('family_qr_short')}</Text></View>
      </Pressable>
      {showQr && ownQr && <View style={styles.qrPanel}>
        <View style={styles.qrPaper}><QRCode value={ownQr} size={190} quietZone={8} color="#0e1422" backgroundColor="#ffffff" /></View>
        <Text style={styles.qrName}>@{nickname}</Text>
        <Text style={styles.qrHelp}>{t('family_qr_child_help')}</Text>
      </View>}</>}
    </>}
    <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
      <SafeAreaView style={styles.scannerSafe}>
        <View style={styles.scannerHeader}><Text style={styles.scannerTitle}>{t('family_scan_child_qr')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('online_back')} onPress={() => setScannerOpen(false)} style={styles.close}><X size={25} color={palette.ink} /></Pressable></View>
        <Text style={styles.scannerHint}>{t('family_scan_child_qr_hint')}</Text>
        <View style={styles.cameraShell}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : scanChild} />
          <View pointerEvents="none" style={styles.scanFrame} />
        </View>
        {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{t(error)}</Text>}
        {scanned && <Pressable accessibilityRole="button" onPress={() => { setScanned(false); setError(''); }} style={styles.retry}><RefreshCw size={21} color={palette.bg} /><Text style={styles.retryText}>{t('family_scan_again')}</Text></Pressable>}
      </SafeAreaView>
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: -10 },
  hero: { alignItems: 'center', gap: 8 }, heroIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#202b41', alignItems: 'center', justifyContent: 'center' },
  intro: { ...ui.text, color: palette.muted, textAlign: 'center', maxWidth: 430 }, tabs: { flexDirection: 'row', gap: 10 },
  tab: { flex: 1, minWidth: 0, minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  tabActive: { backgroundColor: palette.gold, borderColor: palette.gold }, tabText: { color: palette.muted, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, flexShrink: 1 }, tabTextActive: { color: palette.bg },
  fieldGroup: { gap: 8 }, label: { color: palette.ink, fontFamily: 'Nunito_800ExtraBold', fontSize: 16 },
  inputShell: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 2, borderColor: '#3b4b66', backgroundColor: palette.panel, paddingHorizontal: 15, minHeight: 62 },
  input: { flex: 1, minWidth: 0, color: palette.ink, fontFamily: 'Nunito_700Bold', fontSize: 17, paddingVertical: 12 },
  error: { color: '#ff9b9b', fontFamily: 'Nunito_700Bold', textAlign: 'center', fontSize: 14 }, success: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#183b35', padding: 12, borderRadius: 14 },
  successText: { color: palette.green, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, flexShrink: 1 }, orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, line: { flex: 1, height: 1, backgroundColor: palette.line }, orText: { color: palette.muted, fontFamily: 'Nunito_700Bold' },
  qrButton: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, minHeight: 62 }, qrTitle: { color: palette.ink, fontFamily: 'Nunito_800ExtraBold', fontSize: 18 }, qrSub: { color: palette.muted, fontFamily: 'Nunito_600SemiBold', fontSize: 13, flexShrink: 1 },
  qrPanel: { alignItems: 'center', gap: 10, paddingVertical: 8 }, qrPaper: { padding: 10, backgroundColor: '#fff', borderRadius: 18 }, qrName: { color: palette.gold, fontFamily: 'Nunito_900Black', fontSize: 20 }, qrHelp: { color: palette.muted, fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 360 },
  scanButton: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 82, borderRadius: 20, borderWidth: 2, borderColor: palette.gold, padding: 13 },
  scanIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  scanTitle: { color: palette.ink, fontFamily: 'Nunito_900Black', fontSize: 19 }, scanSub: { color: palette.muted, fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 18, flexShrink: 1 },
  found: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }, foundText: { color: palette.green, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, flexShrink: 1 },
  scannerSafe: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: 20, paddingBottom: 20, gap: 18 }, scannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  scannerTitle: { color: palette.ink, fontFamily: 'Nunito_900Black', fontSize: 25, flex: 1 }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, scannerHint: { color: palette.muted, fontFamily: 'Nunito_700Bold', fontSize: 16, lineHeight: 22 },
  cameraShell: { flex: 1, minHeight: 260, overflow: 'hidden', borderRadius: 24, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }, scanFrame: { width: '72%', aspectRatio: 1, borderRadius: 24, borderWidth: 4, borderColor: palette.gold },
  retry: { minHeight: 52, borderRadius: 16, backgroundColor: palette.gold, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, retryText: { color: palette.bg, fontFamily: 'Nunito_900Black', fontSize: 16 },
});
