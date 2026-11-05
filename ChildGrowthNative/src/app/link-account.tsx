import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { connectGuestDevice } from '../lib/connectGuestDevice';
import { createGuardianCode, listManagedGuardians, releaseDeviceLink } from '../lib/devicePairing';
import { createFamilyInvite } from '../lib/familyCloud';
import {
  familyAccountQrValue,
  guardianQrValue,
  normalizeFamilyNickname,
  normalizePairingCode,
  parseFamilyAccountQr,
} from '../lib/pairingCode';

const errorKeys = new Set(['pair_invalid_code', 'pair_expired_code', 'pair_already_connected',
  'pair_progress_conflict', 'pair_use_child_device', 'pair_session_changed', 'pair_busy',
  'family_account_not_found', 'family_same_account', 'family_wrong_role', 'family_profile_not_ready']);

export default function LinkAccountScreen() {
  const { t } = useTranslation();
  const userId = useAppStore(state => state.userId);
  const nickname = useAppStore(state => state.nickname);
  const role = useAppStore(state => state.role);
  const deviceConnection = useAppStore(state => state.deviceConnection);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [guardianCode, setGuardianCode] = useState('');
  const [accountInput, setAccountInput] = useState('');
  const [notice, setNotice] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const pending = useRef(false);
  const scanLocked = useRef(false);
  // Store identity is already hydrated before this screen opens. Do not depend on
  // Firebase's transient currentUser value here: it can briefly be null on a cold
  // launch and incorrectly send a signed-in child into the guest camera flow.
  const registeredChild = role === 'child' && Boolean(userId && nickname) && userId !== 'guest-local'
    && deviceConnection !== 'linked';
  const eligible = role === 'child' && !registeredChild && (userId === 'guest-local' || deviceConnection === 'local');
  const linked = role === 'child' && deviceConnection === 'linked' && Boolean(userId);
  const canRelease = eligible && ['pair_progress_conflict', 'pair_already_connected'].includes(error);
  const validCode = normalizePairingCode(code);
  const scannedAccount = parseFamilyAccountQr(accountInput);
  const validParentNickname = scannedAccount?.role === 'parent'
    ? scannedAccount.nickname
    : normalizeFamilyNickname(accountInput);

  useEffect(() => {
    if (!linked || !userId) return;
    void listManagedGuardians(userId).then(guardians => {
      const names = guardians.map(item => item.parent_name);
      if (names.length) useAppStore.setState({ linkedParents: names, parentEmail: names[0], approvalStatus: 'approved' });
    }).catch(() => {});
  }, [linked, userId]);

  async function connect(candidate = code) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const normalized = normalizePairingCode(candidate);
      if (!normalized) throw new Error('pair_invalid_code');
      await connectGuestDevice(normalized);
      router.replace('/(tabs)');
    } catch (cause: any) {
      setError(errorKeys.has(cause?.message) ? cause.message : 'pair_setup_failed');
    } finally { pending.current = false; setBusy(false); }
  }

  async function inviteParent(candidate = accountInput) {
    if (pending.current || !registeredChild) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const scanned = parseFamilyAccountQr(candidate);
      const target = scanned?.role === 'parent' ? scanned.nickname : normalizeFamilyNickname(candidate);
      if (!target) throw new Error('family_parent_qr_invalid');
      await createFamilyInvite(target, 'child');
      useAppStore.setState({ parentEmail: target, approvalStatus: 'pending' });
      setAccountInput(target);
      setNotice('family_invite_sent');
    } catch (cause: any) {
      const key = cause?.message;
      setError(errorKeys.has(key) || key === 'family_parent_qr_invalid' ? key : 'pair_setup_failed');
    } finally { pending.current = false; setBusy(false); }
  }

  async function openScanner() {
    if (Platform.OS === 'web') return;
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission.granted) { setError('pair_camera_denied'); return; }
    scanLocked.current = false;
    setError('');
    setScanning(true);
  }

  async function handleScan(data: string) {
    if (scanLocked.current || pending.current) return;
    scanLocked.current = true;
    if (registeredChild) {
      setScanning(false);
      const account = parseFamilyAccountQr(data);
      if (!account || account.role !== 'parent') { setError('family_parent_qr_invalid'); return; }
      setAccountInput(account.nickname);
      await inviteParent(account.nickname);
      return;
    }
    const parsed = normalizePairingCode(data);
    setScanning(false);
    if (!parsed) { setError('pair_qr_invalid'); return; }
    setCode(parsed);
    await connect(parsed);
  }

  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text accessibilityRole="header" style={styles.title}>{t(linked ? 'guardian_child_title' : registeredChild ? 'family_account_child_title' : 'pair_child_title')}</Text>
      <Text style={styles.hint}>{t(linked ? 'guardian_child_help' : registeredChild ? 'family_account_child_help' : eligible ? 'pair_child_help' : 'pair_existing')}</Text>
      {eligible && <>
        {Platform.OS !== 'web' && (scanning ? <View style={styles.scanner}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => void handleScan(data)}
            onMountError={() => { setScanning(false); setError('pair_camera_unavailable'); }}
          />
          <View pointerEvents="none" style={styles.scanFrame} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('pair_scan_close')} style={styles.scanClose} onPress={() => setScanning(false)}>
            <X size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.scanText}>{t('pair_scan_camera')}</Text>
        </View> : <Pressable accessibilityRole="button" disabled={busy} style={[styles.scanButton, busy && styles.disabled]} onPress={() => void openScanner()}>
          <ScanLine size={23} color="#FFFFFF" /><Text style={styles.scanButtonText}>{t(busy ? 'processing' : 'pair_scan')}</Text>
        </Pressable>)}
        {Platform.OS !== 'web' ? <Text style={styles.or}>{t('pair_or_code')}</Text> : null}
        <TextInput value={code} onChangeText={setCode} editable={!busy} maxLength={20}
          autoCapitalize="characters" autoCorrect={false}
          accessibilityLabel={t('pair_code_label')} placeholder={t('pair_code_label')} style={styles.input} />
        <Pressable accessibilityRole="button" disabled={busy || !validCode} style={[styles.button, (busy || !validCode) && styles.disabled]}
          onPress={() => void connect()}><Text style={styles.buttonText}>{t(busy ? 'processing' : 'pair_connect')}</Text></Pressable>
      </>}
      {registeredChild && nickname && <>
        <View style={styles.accountTicket}>
          <Text style={styles.ticketLabel}>{t('family_child_qr_title')}</Text>
          <View style={styles.qr} accessibilityLabel={t('family_child_qr_accessible')}>
            <QRCode value={familyAccountQrValue('child', nickname)} size={210} color={Colors.text} backgroundColor="#FFFFFF" />
          </View>
          <Text selectable style={styles.accountCode}>@{nickname}</Text>
          <Text style={styles.ticketHint}>{t('family_child_qr_help')}</Text>
        </View>
        <Text style={styles.or}>{t('family_or_scan_parent')}</Text>
        {Platform.OS !== 'web' && (scanning ? <View style={styles.scanner}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => void handleScan(data)}
            onMountError={() => { setScanning(false); setError('pair_camera_unavailable'); }}
          />
          <View pointerEvents="none" style={styles.scanFrame} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('pair_scan_close')} style={styles.scanClose} onPress={() => setScanning(false)}>
            <X size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.scanText}>{t('family_scan_parent_camera')}</Text>
        </View> : <Pressable accessibilityRole="button" disabled={busy} style={[styles.scanButton, busy && styles.disabled]} onPress={() => void openScanner()}>
          <ScanLine size={23} color="#FFFFFF" /><Text style={styles.scanButtonText}>{t(busy ? 'processing' : 'family_scan_parent')}</Text>
        </Pressable>)}
        <TextInput value={accountInput} onChangeText={setAccountInput} editable={!busy} maxLength={80}
          autoCapitalize="none" autoCorrect={false}
          accessibilityLabel={t('family_parent_nickname_label')} placeholder={t('family_parent_nickname_label')}
          placeholderTextColor={Colors.textMuted} style={styles.input} />
        <Pressable accessibilityRole="button" disabled={busy || !validParentNickname} style={[styles.button, (busy || !validParentNickname) && styles.disabled]}
          onPress={() => void inviteParent()}><Text style={styles.buttonText}>{t(busy ? 'processing' : 'family_send_invite')}</Text></Pressable>
      </>}
      {linked && <>
        {guardianCode ? <View style={styles.ticket}>
          <View style={styles.qr} accessibilityLabel={t('guardian_qr_accessible')}>
            <QRCode value={guardianQrValue(guardianCode)} size={210} color={Colors.text} backgroundColor="#FFFFFF" />
          </View>
          <Text selectable accessibilityLiveRegion="polite" style={styles.code}>{guardianCode}</Text>
          <Text style={styles.ticketHint}>{t('pair_code_expires')}</Text>
        </View> : <Pressable accessibilityRole="button" disabled={busy} style={[styles.scanButton, busy && styles.disabled]} onPress={async () => {
          if (pending.current) return;
          pending.current = true; setBusy(true); setError('');
          try { setGuardianCode(await createGuardianCode()); }
          catch (cause: any) { setError(errorKeys.has(cause?.message) ? cause.message : 'pair_setup_failed'); }
          finally { pending.current = false; setBusy(false); }
        }}><ScanLine size={23} color="#FFFFFF" /><Text style={styles.scanButtonText}>{t(busy ? 'processing' : 'guardian_show_qr')}</Text></Pressable>}
      </>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{t(notice, { nickname: validParentNickname || accountInput })}</Text> : null}
      {canRelease && <Pressable accessibilityRole="button" disabled={busy} style={styles.link} onPress={async () => {
        if (pending.current) return;
        pending.current = true; setBusy(true);
        try { await releaseDeviceLink(); setError(''); setCode(''); }
        catch { setError('pair_setup_failed'); }
        finally { pending.current = false; setBusy(false); }
      }}><Text style={styles.linkText}>{t('pair_release')}</Text></Pressable>}
      <Pressable accessibilityRole="button" disabled={busy} style={styles.link}
        onPress={() => router.replace('/(tabs)')}><Text style={styles.linkText}>{t('pair_back')}</Text></Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, paddingBottom: 48, gap: 20 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: Colors.text },
  hint: { fontFamily: 'Nunito_600SemiBold', fontSize: 16, lineHeight: 24, color: Colors.textSecondary },
  input: { minHeight: 60, borderBottomWidth: 1, borderColor: Colors.border, fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: Colors.text },
  button: { minHeight: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  buttonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#FFFFFF' },
  disabled: { opacity: 0.45 },
  error: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#AF332A' },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: Colors.primary },
  scanButton: { minHeight: 60, borderRadius: 17, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  scanButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#FFFFFF' },
  or: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  scanner: { height: 300, overflow: 'hidden', borderRadius: 22, backgroundColor: Colors.text },
  scanFrame: { position: 'absolute', width: 190, height: 190, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 22, alignSelf: 'center', top: 48 },
  scanClose: { position: 'absolute', top: 10, right: 10, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.52)', alignItems: 'center', justifyContent: 'center' },
  scanText: { position: 'absolute', bottom: 12, left: 16, right: 16, color: '#FFFFFF', textAlign: 'center', fontFamily: 'Nunito_800ExtraBold', fontSize: 15 },
  ticket: { alignItems: 'center', gap: 10, paddingVertical: 18, borderRadius: 20, backgroundColor: Colors.blueDim },
  accountTicket: { alignItems: 'center', gap: 10, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.blueDim },
  qr: { padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  code: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, letterSpacing: 2, color: Colors.text },
  accountCode: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: Colors.text },
  ticketLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text },
  ticketHint: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  notice: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 22, color: '#568A12' },
});
