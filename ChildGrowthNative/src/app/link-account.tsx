import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Camera, CheckCircle2, KeyRound, QrCode, RefreshCw, ShieldCheck, Users, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { readChildConnectionCode } from '../lib/familyAccounts';
import { Screen, Button, ui, palette } from '../components/questblox/UI';
import { childCodeFromQr, childQrValue, formatFamilyCode, normalizeFamilyCode } from '../utils/familyQr';

export default function LinkAccountScreen() {
  const { t } = useTranslation();
  const uid = useAppStore(state => state.userId);
  const role = useAppStore(state => state.role);
  const addChildByCode = useAppStore(state => state.addChildByCode);
  const [code, setCode] = useState('');
  const [childCode, setChildCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const sending = useRef(false);
  const guest = !uid || uid === 'guest-local';

  useEffect(() => {
    let active = true;
    if (guest || role !== 'child') { setChildCode(''); return; }
    setLoadingCode(true); setError('');
    void readChildConnectionCode().then(value => {
      if (active) setChildCode(value);
    }).catch(() => {
      if (active) setError('family_code_load_error');
    }).finally(() => {
      if (active) setLoadingCode(false);
    });
    return () => { active = false; };
  }, [guest, role, uid]);

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
    const found = childCodeFromQr(data);
    if (!found) { setError('family_qr_invalid'); return; }
    setCode(formatFamilyCode(found)); setError(''); setSent(false); setScannerOpen(false);
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
    if (sending.current || guest || role !== 'parent' || auth.currentUser?.uid !== uid) return;
    const normalized = normalizeFamilyCode(code);
    if (!normalized) { setError('family_code_invalid'); return; }
    sending.current = true; setBusy(true); setError(''); setSent(false);
    try {
      const invitationSent = await addChildByCode(normalized);
      if (auth.currentUser?.uid !== uid || useAppStore.getState().userId !== uid) return;
      if (!invitationSent) { setError('family_link_error'); return; }
      setSent(true); setCode('');
    } catch { if (useAppStore.getState().userId === uid) setError('family_link_error'); }
    finally { sending.current = false; setBusy(false); }
  };

  const changeCode = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean);
    setError(''); setSent(false);
  };

  const ownQr = childQrValue(childCode);
  return <Screen>
    <Pressable accessibilityRole="button" accessibilityLabel={t('online_back')} onPress={() => router.back()} style={styles.back}><X size={22} color={palette.muted} /></Pressable>
    <View style={styles.hero}>
      <View style={styles.heroIcon}>{role === 'child' ? <QrCode size={38} color={palette.gold} /> : <Users size={38} color={palette.gold} />}</View>
      <Text style={[ui.title, { textAlign: 'center' }]}>{t(role === 'child' ? 'family_code_child_title' : 'family_code_parent_title')}</Text>
      <Text style={styles.intro}>{guest ? t('family_signin_first') : t(role === 'child' ? 'family_code_child_intro' : 'family_code_parent_intro')}</Text>
    </View>
    {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{t(error)}</Text>}
    {sent && <View accessibilityLiveRegion="polite" style={styles.success}><CheckCircle2 size={22} color={palette.green} /><Text style={styles.successText}>{t('family_code_sent')}</Text></View>}
    {guest ? <Button disabled={busy} label={t(busy ? 'settings_wait' : 'auth_signin')} onPress={() => { void openSignIn(); }} /> : role === 'child' ? <>
      {loadingCode && <Text accessibilityLiveRegion="polite" style={styles.loading}>{t('family_code_loading')}</Text>}
      {!!ownQr && <View testID="child-family-qr" style={styles.qrPanel}>
        <View style={styles.qrPaper}><QRCode value={ownQr} size={210} quietZone={8} color="#0e1422" backgroundColor="#ffffff" /></View>
        <View style={styles.codePill}><KeyRound size={22} color={palette.gold} /><Text selectable style={styles.codeText}>{formatFamilyCode(childCode)}</Text></View>
        <Text style={styles.qrHelp}>{t('family_code_child_intro')}</Text>
      </View>}
    </> : <>
      <Pressable testID="scan-child-qr-btn" accessibilityRole="button" accessibilityLabel={t('family_scan_child_qr')} onPress={() => { void openScanner(); }} style={styles.scanButton}>
        <View style={styles.scanIcon}><Camera size={30} color={palette.bg} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.scanTitle}>{t('family_scan_child_qr')}</Text><Text style={styles.scanSub}>{t('family_scan_child_qr_hint')}</Text></View>
        <QrCode size={25} color={palette.gold} />
      </Pressable>
      <View style={styles.orRow}><View style={styles.line} /><Text style={styles.orText}>{t('auth_or_clean')}</Text><View style={styles.line} /></View>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('family_code_label')}</Text>
        <View style={styles.inputShell}>
          <KeyRound size={23} color={palette.gold} />
          <TextInput testID="family-code-input" accessibilityLabel={t('family_code_label')} value={code} editable={!busy} onChangeText={changeCode}
            autoCapitalize="characters" autoCorrect={false} maxLength={9} returnKeyType="send" onSubmitEditing={() => { void connect(); }}
            placeholder={t('family_code_placeholder')} placeholderTextColor={palette.muted} style={styles.input} />
        </View>
        <Text style={styles.inputHint}>{t('family_code_type_hint')}</Text>
      </View>
      <Button disabled={busy || !normalizeFamilyCode(code)} label={t(busy ? 'settings_wait' : 'family_code_send')} onPress={() => { void connect(); }} />
      <View style={styles.consent}><ShieldCheck size={22} color={palette.green} /><Text style={styles.consentText}>{t('family_code_accept_note')}</Text></View>
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
  intro: { ...ui.text, color: palette.muted, textAlign: 'center', maxWidth: 430 },
  fieldGroup: { gap: 8 }, label: { color: palette.ink, fontFamily: 'Nunito_800ExtraBold', fontSize: 17 },
  inputShell: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, borderWidth: 2, borderColor: palette.gold, backgroundColor: palette.panel, paddingHorizontal: 15, minHeight: 66 },
  input: { flex: 1, minWidth: 0, color: palette.ink, fontFamily: 'Nunito_900Black', fontSize: 24, letterSpacing: 2, paddingVertical: 12 },
  inputHint: { color: palette.muted, fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  error: { color: '#ff9b9b', fontFamily: 'Nunito_700Bold', textAlign: 'center', fontSize: 14 },
  loading: { color: palette.muted, fontFamily: 'Nunito_700Bold', textAlign: 'center', fontSize: 16 },
  success: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#183b35', padding: 12, borderRadius: 14 },
  successText: { color: palette.green, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, flexShrink: 1 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, line: { flex: 1, height: 1, backgroundColor: palette.line }, orText: { color: palette.muted, fontFamily: 'Nunito_700Bold' },
  qrPanel: { alignItems: 'center', gap: 14, paddingVertical: 6 }, qrPaper: { padding: 10, backgroundColor: '#fff', borderRadius: 20 },
  codePill: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: palette.gold, borderRadius: 18, paddingVertical: 11, paddingHorizontal: 18 },
  codeText: { color: palette.ink, fontFamily: 'Nunito_900Black', fontSize: 25, letterSpacing: 2 },
  qrHelp: { color: palette.muted, fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 360 },
  scanButton: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 86, borderRadius: 20, borderWidth: 2, borderColor: palette.gold, padding: 13 },
  scanIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  scanTitle: { color: palette.ink, fontFamily: 'Nunito_900Black', fontSize: 19 }, scanSub: { color: palette.muted, fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 18, flexShrink: 1 },
  consent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 8 }, consentText: { color: palette.green, fontFamily: 'Nunito_700Bold', fontSize: 14, flexShrink: 1, textAlign: 'center' },
  scannerSafe: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: 20, paddingBottom: 20, gap: 18 }, scannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  scannerTitle: { color: palette.ink, fontFamily: 'Nunito_900Black', fontSize: 25, flex: 1 }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, scannerHint: { color: palette.muted, fontFamily: 'Nunito_700Bold', fontSize: 16, lineHeight: 22 },
  cameraShell: { flex: 1, minHeight: 260, overflow: 'hidden', borderRadius: 24, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }, scanFrame: { width: '72%', aspectRatio: 1, borderRadius: 24, borderWidth: 4, borderColor: palette.gold },
  retry: { minHeight: 52, borderRadius: 16, backgroundColor: palette.gold, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, retryText: { color: palette.bg, fontFamily: 'Nunito_900Black', fontSize: 16 },
});
