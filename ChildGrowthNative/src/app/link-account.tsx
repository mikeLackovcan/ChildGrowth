import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { connectGuestDevice } from '../lib/connectGuestDevice';
import { releaseDeviceLink } from '../lib/devicePairing';
import { normalizePairingCode } from '../lib/pairingCode';

const errorKeys = new Set(['pair_invalid_code', 'pair_expired_code', 'pair_already_connected',
  'pair_progress_conflict', 'pair_use_child_device', 'pair_session_changed', 'pair_busy']);

export default function LinkAccountScreen() {
  const { t } = useTranslation();
  const userId = useAppStore(state => state.userId);
  const role = useAppStore(state => state.role);
  const deviceConnection = useAppStore(state => state.deviceConnection);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const pending = useRef(false);
  const scanLocked = useRef(false);
  const eligible = role === 'child' && (userId === 'guest-local' || deviceConnection === 'local');
  const canRelease = eligible && ['pair_progress_conflict', 'pair_already_connected'].includes(error);
  const validCode = normalizePairingCode(code);

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
    const parsed = normalizePairingCode(data);
    setScanning(false);
    if (!parsed) { setError('pair_qr_invalid'); return; }
    setCode(parsed);
    await connect(parsed);
  }

  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text accessibilityRole="header" style={styles.title}>{t('pair_child_title')}</Text>
      <Text style={styles.hint}>{t(eligible ? 'pair_child_help' : 'pair_existing')}</Text>
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
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
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
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, gap: 20 },
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
});
