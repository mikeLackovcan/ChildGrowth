import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { claimGuardianCode } from '../lib/devicePairing';
import { createFamilyInvite } from '../lib/familyCloud';
import { normalizeFamilyAccountCode, normalizeFamilyNickname, normalizeGuardianCode, parseFamilyAccountQr } from '../lib/pairingCode';
import { useAppStore } from '../store/useAppStore';

const errorKeys = new Set(['pair_invalid_code', 'pair_expired_code', 'pair_already_connected', 'pair_parent_required',
  'family_account_not_found', 'family_same_account', 'family_wrong_role', 'family_profile_not_ready']);

export default function ClaimChildScreen() {
  const { t } = useTranslation();
  const role = useAppStore(state => state.role);
  const userEmail = useAppStore(state => state.userEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const pending = useRef(false);
  const scanLocked = useRef(false);
  const eligible = role === 'parent' && Boolean(userEmail);
  const scannedAccount = parseFamilyAccountQr(code);
  const childNickname = scannedAccount?.role === 'child' ? scannedAccount.nickname : normalizeFamilyNickname(code);
  const validCode = normalizeGuardianCode(code) || normalizeFamilyAccountCode(code) || childNickname;

  async function connect(candidate = code, targetUid?: string) {
    if (pending.current || !eligible) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const normalized = normalizeGuardianCode(candidate);
      if (normalized) {
        await claimGuardianCode(normalized);
      } else {
        const scanned = parseFamilyAccountQr(candidate);
        const target = scanned?.role === 'child' ? scanned.nickname : normalizeFamilyNickname(candidate);
        if (!target) throw new Error('family_child_qr_invalid');
        await createFamilyInvite(target, 'parent', targetUid || scanned?.uid);
      }
      await useAppStore.getState().loadMockState();
      router.replace('/parent-dashboard');
    } catch (cause: any) {
      const key = cause?.message;
      setError(errorKeys.has(key) || key === 'family_child_qr_invalid' ? key : 'pair_setup_failed');
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
    setScanning(false);
    const account = parseFamilyAccountQr(data);
    if (account?.role === 'child') {
      setCode(account.nickname);
      await connect(account.nickname, account.uid);
      return;
    }
    const parsedCode = normalizeGuardianCode(data);
    if (!parsedCode) { setError('family_child_qr_invalid'); return; }
    setCode(parsedCode);
    await connect(parsedCode);
  }

  return <SafeAreaView style={styles.screen} edges={['top', 'right', 'bottom', 'left']}>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        <Text accessibilityRole="header" style={styles.title}>{t('guardian_parent_title')}</Text>
        <Text style={styles.hint}>{t(eligible ? 'family_parent_connect_help' : 'guardian_parent_required')}</Text>
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
            <Text style={styles.scanText}>{t('guardian_scan_camera')}</Text>
          </View> : <Pressable accessibilityRole="button" disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => void openScanner()}>
            <ScanLine size={23} color="#FFFFFF" /><Text style={styles.primaryText}>{t(busy ? 'processing' : 'guardian_scan')}</Text>
          </Pressable>)}
          {Platform.OS !== 'web' ? <Text style={styles.or}>{t('pair_or_code')}</Text> : null}
          <TextInput
            value={code}
            onChangeText={setCode}
            editable={!busy}
            maxLength={80}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel={t('family_child_identity_label')}
            placeholder={t('family_child_identity_label')}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <Pressable accessibilityRole="button" disabled={busy || !validCode} style={[styles.button, (busy || !validCode) && styles.disabled]} onPress={() => void connect()}>
            <Text style={styles.buttonText}>{t(busy ? 'processing' : 'family_connect_child')}</Text>
          </Pressable>
        </>}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy} style={styles.back} onPress={() => router.replace('/parent-dashboard')}>
          <Text style={styles.backText}>{t('pair_back_parent')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, paddingBottom: 48, gap: 20 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, lineHeight: 35, color: Colors.text },
  hint: { fontFamily: 'Nunito_600SemiBold', fontSize: 16, lineHeight: 24, color: Colors.textSecondary },
  input: { minHeight: 60, borderBottomWidth: 1, borderColor: Colors.border, fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: Colors.text },
  primary: { minHeight: 60, borderRadius: 17, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  primaryText: { flexShrink: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#FFFFFF', textAlign: 'center' },
  button: { minHeight: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  buttonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#FFFFFF' },
  disabled: { opacity: 0.45 },
  or: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  error: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 22, color: '#AF332A' },
  back: { minHeight: 48, justifyContent: 'center' },
  backText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: Colors.primary },
  scanner: { height: 300, overflow: 'hidden', borderRadius: 22, backgroundColor: Colors.text },
  scanFrame: { position: 'absolute', width: 190, height: 190, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 22, alignSelf: 'center', top: 48 },
  scanClose: { position: 'absolute', top: 10, right: 10, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.52)', alignItems: 'center', justifyContent: 'center' },
  scanText: { position: 'absolute', bottom: 12, left: 16, right: 16, color: '#FFFFFF', textAlign: 'center', fontFamily: 'Nunito_800ExtraBold', fontSize: 15 },
});
