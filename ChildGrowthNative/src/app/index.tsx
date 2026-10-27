import { authErrorKey } from '../lib/authMessages';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, Lock, Mail, User, Tag, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react-native';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { requestGoogleTokens } from '../lib/googleLogin';
import QuestPipMark from '../components/QuestPipMark';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const loadMockState = useAppStore((state) => state.loadMockState);
  const userEmail = useAppStore((state) => state.userEmail);
  const role = useAppStore((state) => state.role);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  
  const registerWithEmail = useAppStore((state) => state.registerWithEmail);
  const loginWithEmail = useAppStore((state) => state.loginWithEmail);
  const sendPasswordReset = useAppStore((state) => state.sendPasswordReset);
  const signInWithGoogle = useAppStore((state) => state.signInWithGoogle);

  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [entryMode, setEntryMode] = useState<'choose' | 'parent'>('choose');
  const selectedRole = 'parent' as const;
  const [parentConfirmed, setParentConfirmed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMockState();
  }, [loadMockState]);

  useEffect(() => {
    if (userEmail) {
      if (!role) {
        router.replace('/role-select');
      } else if (role === 'parent') {
        router.replace('/parent-dashboard');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [userEmail, role]);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    if (!parentConfirmed) {
      setAuthMessage(t('parent_account_required'));
      return;
    }
    setLoading(true);
    setAuthMessage(null);
    try {
      const tokens = await requestGoogleTokens();
      if (!tokens) return;
      const result = await signInWithGoogle(tokens.idToken, tokens.accessToken, selectedRole);
      if (!result.success) setAuthMessage(result.message || t('auth_failed'));
    } catch (error) {
      setAuthMessage(t(authErrorKey(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    setAuthMessage(null);
    try { await continueAsGuest(); }
    catch { setAuthMessage(t('auth_guest_failed')); }
    finally { setLoading(false); }
  };

  const handleAuthSubmit = async () => {
    if (!parentConfirmed) {
      setAuthMessage(t('parent_account_required'));
      return;
    }
    if (!email) {
      setAuthMessage(t('enter_valid_email', 'Please enter a valid email address!'));
      return;
    }

    setLoading(true);
    setAuthMessage(null);

    try {
      if (authMode === 'register') {
        if (!password || !fullName || !nickname) {
          setAuthMessage(t('fill_all_fields', 'Please fill in Name, Nickname, Email, and Password!'));
          setLoading(false);
          return;
        }
        const regRes = await registerWithEmail(email, password, fullName, nickname, selectedRole);
        if (!regRes.success) {
          setAuthMessage(regRes.message || t('auth_failed'));
          setLoading(false);
          return;
        }
        setAuthMessage(regRes.message || t('auth_created'));
      } else {
        if (!password) {
          setAuthMessage(t('enter_password', 'Please enter your password!'));
          setLoading(false);
          return;
        }
        const res = await loginWithEmail(email, password);
        setAuthMessage(res.message || t(res.success ? 'auth_signed_in' : 'auth_failed'));
      }
    } catch (err: any) {
      setAuthMessage(t(authErrorKey(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.authContent}>
          
          {/* Top Bar Language Switcher */}
          <View style={styles.languageRow}>
            <LanguageSwitcher />
          </View>

          {/* App Logo & Branding */}
          <View style={styles.logoBox}>
            <QuestPipMark size={92} />
          </View>
          
          <Text style={styles.title}>{t('app_title', 'Quest Champ')}</Text>
          <Text style={styles.subtitle}>{t('app_subtitle', 'Small steps. Big adventures.')}</Text>

          {entryMode === 'choose' ? <View style={styles.roleChoices}>
            <Text accessibilityRole="header" style={styles.roleQuestion}>{t('entry_who')}</Text>
            <TouchableOpacity
              style={styles.guestBtn}
              activeOpacity={0.82}
              onPress={handleGuestMode}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t('entry_kid_accessible')}
            >
              <View style={styles.roleIcon}><Sparkles size={25} color="#FFFFFF" /></View>
              <View style={styles.roleCopy}>
                <Text style={styles.guestBtnText}>{t('entry_kid')}</Text>
                <Text style={styles.guestBtnHint}>{t('entry_kid_hint')}</Text>
              </View>
              <Text style={styles.roleArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.parentRoleBtn}
              activeOpacity={0.82}
              onPress={() => { setEntryMode('parent'); setAuthMessage(null); }}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t('entry_parent_accessible')}
            >
              <View style={styles.parentRoleIcon}><ShieldCheck size={25} color={Colors.primary} /></View>
              <View style={styles.roleCopy}>
                <Text style={styles.parentRoleTitle}>{t('entry_parent')}</Text>
                <Text style={styles.parentRoleHint}>{t('entry_parent_hint')}</Text>
              </View>
              <Text style={[styles.roleArrow, { color: Colors.primary }]}>›</Text>
            </TouchableOpacity>
            <Text style={styles.privacyNote}>{t('entry_privacy')}</Text>
          </View> : <>
          <TouchableOpacity style={styles.backToRoles} accessibilityRole="button" onPress={() => { setEntryMode('choose'); setAuthMessage(null); }}>
            <ArrowLeft size={20} color={Colors.primary} /><Text style={styles.backToRolesText}>{t('entry_change')}</Text>
          </TouchableOpacity>

          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.sectionLabel}>{t('parent_signin_heading')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Auth Mode Selection Tabs: Clean 2 Tabs (Login & Register) */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity 
              style={[styles.modeTab, authMode === 'signin' && styles.modeTabActive]} 
              onPress={() => { setAuthMode('signin'); setAuthMessage(null); }}
            >
              <Text style={[styles.modeTabText, authMode === 'signin' && styles.modeTabTextActive]}>{t('auth_signin', 'Sign In')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeTab, authMode === 'register' && styles.modeTabActive]} 
              onPress={() => { setAuthMode('register'); setAuthMessage(null); }}
            >
              <Text style={[styles.modeTabText, authMode === 'register' && styles.modeTabTextActive]}>{t('auth_register', 'Create Account')}</Text>
            </TouchableOpacity>
          </View>

          {/* Registration Extra Fields: Role, Name & Nickname */}
          {authMode === 'register' && (
            <>
              <Text style={styles.parentNoticeText}>{t('parent_account_note')}</Text>

              <View style={styles.inputBox}>
                <User size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder={t('name_placeholder', 'Name (e.g. Alex)')}
                  placeholderTextColor={Colors.textMuted}
                  autoComplete="name"
                  textContentType="name"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.inputBox}>
                <Tag size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder={t('nickname_placeholder', 'Quest Champ nickname (e.g. AlexQuest)')}
                  placeholderTextColor={Colors.textMuted}
                  autoComplete="username"
                  textContentType="nickname"
                  autoCapitalize="none"
                  value={nickname}
                  onChangeText={setNickname}
                />
              </View>
            </>
          )}

          {/* Email Input */}
          <View style={styles.inputBox}>
            <Mail size={18} color={Colors.textMuted} />
            <TextInput
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

          {/* Password Input with Show/Hide Password toggle for Credential Saving */}
          <View style={styles.inputBox}>
            <Lock size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder={t('password_placeholder', 'Password')}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPassword}
              autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              textContentType={authMode === 'register' ? 'newPassword' : 'password'}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
              {showPassword ? (
                <EyeOff size={18} color={Colors.textMuted} />
              ) : (
                <Eye size={18} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Forgot password link */}
          {authMode === 'signin' && (
            <TouchableOpacity 
              style={{ alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 }}
              onPress={async () => {
                if (!email) {
                  setAuthMessage(t('enter_valid_email', 'Please enter your email address first!'));
                  return;
                }
                const res = await sendPasswordReset(email);
                setAuthMessage(res.message || t(res.success ? 'auth_reset_sent' : 'auth_failed'));
              }}
            >
              <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.blue, fontSize: 13 }}>
                {t('forgot_password', 'Forgot password?')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Status Message Alert Banner */}
          {authMessage && (
            <View style={styles.msgBanner}>
              <Text accessibilityRole="alert" style={styles.msgBannerText}>{authMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.parentCheckRow}
            activeOpacity={0.8}
            onPress={() => setParentConfirmed(value => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: parentConfirmed }}
          >
            <View style={[styles.parentCheckbox, parentConfirmed && styles.parentCheckboxChecked]}>
              <Text style={styles.parentCheckmark}>{parentConfirmed ? '✓' : ''}</Text>
            </View>
            <Text style={styles.parentCheckText}>{t('parent_account_confirm')}</Text>
          </TouchableOpacity>

          {/* Primary Form Submit Button */}
          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleAuthSubmit}
            activeOpacity={0.8}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            <Text style={styles.submitBtnText}>
              {loading ? t('processing', 'Processing...') : (
                authMode === 'register' ? t('btn_create_account', 'CREATE ACCOUNT 🚀') :
                t('btn_sign_in', 'SIGN IN 🔑')
              )}
            </Text>
          </TouchableOpacity>

          {/* Google Sign-In */}
          <TouchableOpacity 
            style={styles.googleBtn}
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('google_sign_in')}
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            <Text style={styles.googleMark}>G</Text>
            <Text style={styles.googleBtnText}>{t('google_sign_in')}</Text>
          </TouchableOpacity>
          </>}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  authContent: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  languageRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  parentNoticeText: {
    width: '100%',
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  parentCheckRow: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  parentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentCheckboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  parentCheckmark: { color: '#FFF', fontFamily: 'Nunito_800ExtraBold', fontSize: 15 },
  parentCheckText: { flex: 1, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary, fontSize: 15, lineHeight: 22 },
  logoBox: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 31,
    color: Colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 18,
  },
  roleChoices: { width: '100%', gap: 12 },
  roleQuestion: { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: Colors.text, textAlign: 'center', marginBottom: 2 },
  roleCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  roleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  parentRoleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.blueDim },
  roleArrow: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, color: '#FFFFFF' },
  parentRoleBtn: { width: '100%', minHeight: 76, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF' },
  parentRoleTitle: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 18 },
  parentRoleHint: { fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 1 },
  privacyNote: { fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  backToRoles: { alignSelf: 'flex-start', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7 },
  backToRolesText: { fontFamily: 'Nunito_800ExtraBold', color: Colors.primary, fontSize: 15 },
  googleBtn: {
    width: '100%',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  googleMark: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#4285F4' },
  googleBtnText: {
    flexShrink: 1,
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: Colors.text,
  },
  guestBtn: {
    width: '100%',
    minHeight: 76,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  guestBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFFFFF',
    fontSize: 18,
  },
  guestBtnHint: {
    fontFamily: 'Nunito_600SemiBold',
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  sectionDivider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border2,
  },
  sectionLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  modeTabsRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border2,
  },
  modeTabActive: {
    borderBottomColor: Colors.primary,
  },
  modeTabText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  modeTabTextActive: {
    color: Colors.primary,
    fontFamily: 'Nunito_800ExtraBold',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingHorizontal: 2,
    height: 48,
    width: '100%',
    marginBottom: 14,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: Colors.text,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  msgBanner: {
    paddingVertical: 8,
    width: '100%',
    marginBottom: 12,
  },
  msgBannerText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.amber,
    textAlign: 'center',
  },
});
