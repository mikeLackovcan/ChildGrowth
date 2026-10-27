import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { Lock, Mail, User, Tag, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const userId = useAppStore(state => state.userId);
  const loadMockState = useAppStore((state) => state.loadMockState);
  const userEmail = useAppStore((state) => state.userEmail);
  const role = useAppStore((state) => state.role);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);

  const registerWithEmail = useAppStore((state) => state.registerWithEmail);
  const loginWithEmail = useAppStore((state) => state.loginWithEmail);
  const sendMagicLink = useAppStore((state) => state.sendMagicLink);
  const sendPasswordReset = useAppStore((state) => state.sendPasswordReset);
  const signInWithGoogle = useAppStore((state) => state.signInWithGoogle);

  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [selectedRole, setSelectedRole] = useState<'child' | 'parent' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const googleClientIds = {
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '35992182600-oounvs8ja932t3drbsq2e3ru0lemh8c2.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '35992182600-f4v50jk30bmcb2cs95k430cqqpctlgqd.apps.googleusercontent.com',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '35992182600-f4v50jk30bmcb2cs95k430cqqpctlgqd.apps.googleusercontent.com',
  };
  const googleConfigured = Boolean(googleClientIds.androidClientId && googleClientIds.webClientId);

  const [googleRequest, googleResponse, promptGoogleSignIn] = Google.useAuthRequest({
    ...googleClientIds,
    selectAccount: true,
  });

  useEffect(() => {
    loadMockState();
  }, []);

  useEffect(() => {
    if (userEmail && !(userId === 'guest-local' && pathname === '/login')) {
      if (!role) {
        router.replace('/role-select');
      } else if (role === 'parent') {
        router.replace('/parent-dashboard');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [userEmail, role, userId, pathname]);

  // AuthSession completes its code exchange asynchronously on non-Android platforms.
  useEffect(() => {
    if (Platform.OS === 'android' || googleResponse?.type !== 'success' || !selectedRole) return;
    let active = true;
    setLoading(true);
    signInWithGoogle(googleResponse.authentication?.idToken || googleResponse.params.id_token || '',
      googleResponse.authentication?.accessToken, selectedRole)
      .then(result => { if (active) setAuthMessage(result.success ? null : result.message || t('auth_retry')); })
      .catch(() => { if (active) setAuthMessage(t('auth_retry')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [googleResponse]);

  const handleGoogleSignIn = async () => {
    if (loading || !selectedRole) return;
    setLoading(true);
    setAuthMessage(null);
    try {
      let idToken = '';
      let accessToken: string | undefined;
      if (Platform.OS === 'android') {
        const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({ webClientId: googleClientIds.webClientId, offlineAccess: false });
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        // Do not silently reuse the previous family member's Google account.
        await GoogleSignin.signOut().catch(() => null);
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) return; // User cancelled the account picker.
        idToken = response.data.idToken || '';
      } else {
        if (!googleConfigured || !googleRequest) {
          setAuthMessage(t('auth_google_wait'));
          return;
        }
        const response = await promptGoogleSignIn();
        if (response.type === 'cancel' || response.type === 'dismiss') return;
        if (response.type !== 'success') {
          setAuthMessage(response.type === 'error' ? t('auth_retry') : t('auth_google_finish'));
          return;
        }
        return; // The AuthSession response effect completes Firebase sign-in.
      }
      const result = await signInWithGoogle(idToken, accessToken, selectedRole);
      if (!result.success) setAuthMessage(result.message || t('auth_retry'));
    } catch (error: any) {
      const code = String(error?.code || '');
      if (code === 'SIGN_IN_CANCELLED') return;
      setAuthMessage(code === '10' || code === 'DEVELOPER_ERROR'
        ? t('auth_google_config')
        : code === 'PLAY_SERVICES_NOT_AVAILABLE'
          ? t('auth_google_services')
          : t('auth_retry'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    setAuthMessage(null);
    try {
      await continueAsGuest();
      router.replace('/(tabs)');
    } catch { setAuthMessage(t('auth_retry')); }
    finally { setLoading(false); }
  };

  const handleAuthSubmit = async () => {
    if (!selectedRole) return;
    if (!email.trim()) {
      setAuthMessage(t('enter_valid_email', 'Please enter a valid email address!'));
      return;
    }

    setLoading(true);
    setAuthMessage(null);

    try {
      if (authMode === 'register') {
        if (!password || !fullName.trim() || !nickname.trim()) {
          setAuthMessage(t('fill_all_fields', 'Please fill in Name, Nickname, Email, and Password!'));
          setLoading(false);
          return;
        }
        const regRes = await registerWithEmail(email.trim(), password, fullName.trim(), nickname.trim(), selectedRole);
        if (!regRes.success) {
          setAuthMessage(regRes.message || t('auth_register_retry'));
          setLoading(false);
          return;
        }
        sendMagicLink(email).catch(() => {});
        if (selectedRole === 'parent') {
          router.replace('/parent-dashboard');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        if (!password) {
          setAuthMessage(t('enter_password', 'Please enter your password!'));
          setLoading(false);
          return;
        }
        const res = await loginWithEmail(email.trim(), password);
        if (res.success) {
          const currentRole = useAppStore.getState().role;
          if (currentRole === 'parent') {
            router.replace('/parent-dashboard');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          setAuthMessage(res.message || t('auth_retry'));
        }
      }
    } catch (err: any) {
      setAuthMessage(t('auth_retry'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} showsVerticalScrollIndicator={false}>
        <View style={styles.authBox}>

          {/* Top Bar Language Switcher */}
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14 }}>
            <LanguageSwitcher compact />
          </View>

          <View style={styles.brandRow}>
            <Image source={require('../../assets/images/app-icon-v2.png')} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.brand}>Questblox</Text>
          </View>
          {!selectedRole ? (
            <>
              <Text style={styles.title}>{t('auth_who_clean')}</Text>
              <Text style={styles.roleIntro}>{t('auth_role_first_hint')}</Text>
              <View style={styles.roleChoiceGrid}>
                {(['child', 'parent'] as const).map(accountRole => (
                  <TouchableOpacity
                    key={accountRole}
                    testID={`auth-role-${accountRole}`}
                    accessibilityRole="button"
                    accessibilityLabel={accountRole === 'child' ? t('auth_child_clean') : t('auth_parent_clean')}
                    disabled={loading}
                    onPress={() => { setSelectedRole(accountRole); setAuthMessage(null); }}
                    style={[styles.roleChoiceCard, accountRole === 'child' ? styles.childRoleCard : styles.parentRoleCard]}
                    activeOpacity={0.82}
                  >
                    <Text accessible={false} style={styles.roleChoiceIcon}>{accountRole === 'child' ? '🎮' : '👨‍👩‍👧'}</Text>
                    <Text style={styles.roleChoiceText}>
                      {accountRole === 'child' ? t('auth_child_clean') : t('auth_parent_clean')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <TouchableOpacity
                testID="auth-change-role"
                accessibilityRole="button"
                accessibilityLabel={t('auth_change_role')}
                disabled={loading}
                style={styles.selectedRoleRow}
                onPress={() => { setSelectedRole(null); setAuthMessage(null); }}
              >
                <ArrowLeft size={20} color="#ffc857" />
                <Text accessible={false} style={styles.selectedRoleIcon}>{selectedRole === 'child' ? '🎮' : '👨‍👩‍👧'}</Text>
                <Text style={styles.selectedRoleText}>
                  {selectedRole === 'child' ? t('auth_child_clean') : t('auth_parent_clean')}
                </Text>
                <Text style={styles.changeRoleText}>{t('auth_change_role')}</Text>
              </TouchableOpacity>

              <Text style={styles.title}>{authMode === 'signin' ? t('auth_welcome_clean', 'Welcome back') : t('auth_join_clean', 'Join the adventure')}</Text>

          {/* Auth Mode Selection Tabs: Clean 2 Tabs (Login & Register) */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              testID="auth-tab-signin" accessibilityRole="tab" accessibilityState={{ selected: authMode === 'signin' }} aria-selected={authMode === 'signin'} disabled={loading}
              style={[styles.modeTab, authMode === 'signin' && styles.modeTabActive]}
              onPress={() => { setAuthMode('signin'); setAuthMessage(null); }}
            >
              <Text style={[styles.modeTabText, authMode === 'signin' && styles.modeTabTextActive]}>{t('auth_signin', 'Sign In')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="auth-tab-register" accessibilityRole="tab" accessibilityState={{ selected: authMode === 'register' }} aria-selected={authMode === 'register'} disabled={loading}
              style={[styles.modeTab, authMode === 'register' && styles.modeTabActive]}
              onPress={() => { setAuthMode('register'); setAuthMessage(null); }}
            >
              <Text style={[styles.modeTabText, authMode === 'register' && styles.modeTabTextActive]}>{t('auth_register', 'Create Account')}</Text>
            </TouchableOpacity>
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }}
            testID="auth-google-btn" accessibilityLabel={t('auth_google')}
            style={[styles.googleBtn, loading && { opacity: 0.6 }]}
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text accessible={false} style={styles.googleMark}>G</Text>
            <Text style={styles.googleBtnText}>{t('auth_google')}</Text>
          </TouchableOpacity>
          <Text style={styles.alternativeLabel}>{t('auth_or_clean', 'or')}</Text>

          {authMode === 'register' && (
            <>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>{t('auth_field_name', 'Name')}</Text>
                <View style={[styles.inputBox, focusedField === 'name' && styles.inputFocused]}>
                <User size={18} color={Colors.textMuted} />
                <TextInput
                  testID="auth-input-name"
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  accessibilityLabel={t('auth_field_name')}
                  style={styles.input}
                  placeholder={t('name_placeholder', 'Name (e.g. Alex)')}
                  placeholderTextColor={Colors.textMuted}
                  autoComplete="name"
                  textContentType="name"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>{t('auth_field_nickname', 'Nickname')}</Text>
                <View style={[styles.inputBox, focusedField === 'nickname' && styles.inputFocused]}>
                <Tag size={18} color={Colors.textMuted} />
                <TextInput
                  testID="auth-input-nickname"
                  onFocus={() => setFocusedField('nickname')} onBlur={() => setFocusedField(null)}
                  accessibilityLabel={t('auth_field_nickname')}
                  style={styles.input}
                  placeholder={t('auth_nickname_clean', 'Nickname')}
                  placeholderTextColor={Colors.textMuted}
                  autoComplete="username"
                  textContentType="nickname"
                  autoCapitalize="none"
                  value={nickname}
                  onChangeText={setNickname}
                />
              </View>
              </View>
            </>
          )}

          {/* Email Input */}
          <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>{t('auth_field_email', 'Email')}</Text>
                <View style={[styles.inputBox, focusedField === 'email' && styles.inputFocused]}>
            <Mail size={18} color={Colors.textMuted} />
            <TextInput
              testID="auth-input-email"
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                  accessibilityLabel={t('auth_field_email')}
              style={styles.input}
              placeholder={t('email_placeholder', 'Email address')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
          </View>
              </View>

          {/* Password Input with Show/Hide Password toggle for Credential Saving */}
          <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>{t('auth_field_password', 'Password')}</Text>
                <View style={[styles.inputBox, focusedField === 'password' && styles.inputFocused]}>
            <Lock size={18} color={Colors.textMuted} />
            <TextInput
              testID="auth-input-password"
                  onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                  accessibilityLabel={t('auth_field_password')}
              style={styles.input}
              placeholder={t('password_placeholder', 'Password')}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPassword}
              autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              textContentType={authMode === 'register' ? 'newPassword' : 'password'}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} accessibilityRole="button" accessibilityLabel={showPassword ? t('auth_password_hide') : t('auth_password_show')} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              {showPassword ? (
                <EyeOff size={18} color={Colors.textMuted} />
              ) : (
                <Eye size={18} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
              </View>

          {/* Forgot password link */}
          {authMode === 'signin' && (
            <TouchableOpacity
              accessibilityRole="button" disabled={loading}
              style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: -8 }}
              onPress={async () => {
                if (!email.trim()) {
                  setAuthMessage(t('enter_valid_email', 'Please enter your email address first!'));
                  return;
                }
                setLoading(true);
                setAuthMessage(null);
                try {
                  const res = await sendPasswordReset(email.trim());
                  setAuthMessage(res.message || t(res.success ? 'auth_reset_sent' : 'auth_email_retry'));
                } catch {
                  setAuthMessage(t('auth_email_retry'));
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.blue, fontSize: 13 }}>
                {t('forgot_password', 'Forgot password?')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Status Message Alert Banner */}
          {authMessage && (
            <View style={styles.msgBanner} accessibilityLiveRegion="polite">
              <Text style={styles.msgBannerText}>{authMessage}</Text>
            </View>
          )}

          {/* Primary Form Submit Button */}
          <TouchableOpacity
            accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }}
            testID="auth-submit-btn"
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleAuthSubmit}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? t('processing', 'Processing...') : (
                authMode === 'register' ? t('auth_create_clean', 'Create account') :
                t('auth_signin', 'Sign in')
              )}
            </Text>
          </TouchableOpacity>




          {selectedRole === 'child' && (
          <TouchableOpacity
            accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }}
            testID="auth-guest-btn"
            style={styles.guestBtn}
            activeOpacity={0.8}
            onPress={handleGuestMode}
            disabled={loading}
          >
            <Text style={styles.guestBtnText}>{t('auth_guest')}</Text>
          </TouchableOpacity>
          )}
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0e1422' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 24, maxWidth: 440, width: '100%', alignSelf: 'center' },
  authBox: { width: '100%' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 26 },
  logoImg: { width: 48, height: 48, borderRadius: 12 },
  brand: { fontFamily: 'Nunito_900Black', fontSize: 22, color: '#f6f7fd' },
  title: { fontFamily: 'Nunito_900Black', fontSize: 30, lineHeight: 36, color: '#f6f7fd', marginBottom: 22 },
  roleIntro: { fontFamily: 'Nunito_600SemiBold', fontSize: 17, lineHeight: 24, color: '#aab8cf', marginTop: -12, marginBottom: 22 },
  roleChoiceGrid: { flexDirection: 'row', gap: 14 },
  roleChoiceCard: { flex: 1, minHeight: 178, borderRadius: 24, alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 2 },
  childRoleCard: { backgroundColor: '#172d48', borderColor: '#4db8ff' },
  parentRoleCard: { backgroundColor: '#342a18', borderColor: '#ffc857' },
  roleChoiceIcon: { fontSize: 58, lineHeight: 70, marginBottom: 10 },
  roleChoiceText: { fontFamily: 'Nunito_900Black', fontSize: 22, color: '#f6f7fd', textAlign: 'center' },
  selectedRoleRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14, alignSelf: 'flex-start' },
  selectedRoleIcon: { fontSize: 25 },
  selectedRoleText: { fontFamily: 'Nunito_900Black', fontSize: 17, color: '#f6f7fd' },
  changeRoleText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#ffc857', marginLeft: 3 },
  modeTabsRow: { flexDirection: 'row', gap: 24, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#293347' },
  modeTab: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  modeTabActive: { borderBottomColor: '#ffc857' },
  modeTabText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#aab8cf' },
  modeTabTextActive: { color: '#ffc857' },
  fieldLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#aab8cf', marginBottom: 10 },
  roleRow: { flexDirection: 'row', gap: 24, marginBottom: 20 },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  roleSelected: { borderBottomColor: '#ffc857' },
  roleText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#aab8cf' },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#46516a', paddingHorizontal: 2, minHeight: 54, width: '100%' },
  inputLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#aab8cf' },
  inputFocused: { borderBottomColor: '#ffc857' },
  input: { flex: 1, minHeight: 54, fontFamily: 'Nunito_600SemiBold', fontSize: 16, color: '#f6f7fd' },
  submitBtn: { width: '100%', backgroundColor: '#ffc857', minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#0e1422' },
  alternativeLabel: { textAlign: 'center', color: '#aab8cf', fontFamily: 'Nunito_600SemiBold', marginTop: 16, marginBottom: 16 },
  googleBtn: { width: '100%', minHeight: 60, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, backgroundColor: '#ffffff', flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dadce0' },
  googleMark: { fontSize: 28, fontWeight: '700', color: '#4285f4' },
  googleBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#1f1f1f', flexShrink: 1, textAlign: 'center' },
  guestBtn: { minHeight: 48, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  guestBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#aab8cf' },
  msgBanner: { borderLeftWidth: 3, borderLeftColor: '#ffc857', padding: 12, marginBottom: 12 },
  msgBannerText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#ffc857' },
});
