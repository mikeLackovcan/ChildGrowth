import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, TextInput, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { Lock, Mail, User, Tag, KeyRound, Sparkles, Wand2, Eye, EyeOff } from 'lucide-react-native';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation();
  const loadMockState = useAppStore((state) => state.loadMockState);
  const userEmail = useAppStore((state) => state.userEmail);
  const role = useAppStore((state) => state.role);
  const setUser = useAppStore((state) => state.setUser);
  const coins = useAppStore((state) => state.coins);
  
  const registerWithEmail = useAppStore((state) => state.registerWithEmail);
  const loginWithEmail = useAppStore((state) => state.loginWithEmail);
  const sendMagicLink = useAppStore((state) => state.sendMagicLink);
  const sendPasswordReset = useAppStore((state) => state.sendPasswordReset);

  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [selectedRole, setSelectedRole] = useState<'child' | 'parent'>('child');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMockState();
  }, []);

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
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        console.warn('Google Sign-In is not fully configured for Firebase yet.');
      } else {
        console.warn('Google Sign-In is not fully configured for Firebase yet.');
      }
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.message || err);
      setUser('google.user@growth.app', null);
    }
  };

  const handleTestLogin = (testRole: 'parent' | 'child') => {
    setUser(`test-${testRole}@growth.app`, testRole);
  };

  const handleAuthSubmit = async () => {
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
          setAuthMessage(regRes.message || 'Registration failed!');
          setLoading(false);
          return;
        }
        await sendMagicLink(email);
        setAuthMessage(t('registration_verification_msg', "Account created! We've sent a magic link to your email for verification 🪄 Check your inbox!"));
      } else {
        if (!password) {
          setAuthMessage(t('enter_password', 'Please enter your password!'));
          setLoading(false);
          return;
        }
        const res = await loginWithEmail(email, password);
        setAuthMessage(res.message || 'Logged in!');
      }
    } catch (err: any) {
      setAuthMessage(err?.message || 'Authentication completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.authBox}>
          
          {/* Top Bar Language Switcher */}
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14 }}>
            <LanguageSwitcher />
          </View>

          {/* App Logo & Branding */}
          <View style={styles.logoBox}>
            <Image 
              source={require('../assets/images/questblox_logo.png')} 
              style={{ width: 88, height: 88, borderRadius: 22 }}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>{t('app_title', 'QuestBlox')}</Text>
          <Text style={styles.subtitle}>{t('app_subtitle', 'Roblox Habit & Battle Arena ⚔️')}</Text>

          {/* Auth Mode Selection Tabs: Clean 2 Tabs (Login & Register) */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity 
              style={[styles.modeTab, authMode === 'signin' && styles.modeTabActive]} 
              onPress={() => { setAuthMode('signin'); setAuthMessage(null); }}
            >
              <KeyRound size={16} color={authMode === 'signin' ? Colors.red : Colors.textMuted} />
              <Text style={[styles.modeTabText, authMode === 'signin' && styles.modeTabTextActive]}>{t('auth_signin', 'Sign In')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeTab, authMode === 'register' && styles.modeTabActive]} 
              onPress={() => { setAuthMode('register'); setAuthMessage(null); }}
            >
              <User size={16} color={authMode === 'register' ? Colors.red : Colors.textMuted} />
              <Text style={[styles.modeTabText, authMode === 'register' && styles.modeTabTextActive]}>{t('auth_register', 'Create Account')}</Text>
            </TouchableOpacity>
          </View>

          {/* Registration Extra Fields: Role, Name & Nickname */}
          {authMode === 'register' && (
            <>
              {/* Role Selection Toggle */}
              <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 4 }}>
                {t('select_account_type', 'Select Account Type / Role:')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TouchableOpacity
                  style={[{ flex: 1, backgroundColor: Colors.surface2, borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, selectedRole === 'child' && { borderColor: Colors.red, backgroundColor: Colors.cardPink }]}
                  onPress={() => setSelectedRole('child')}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20 }}>🎮</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 13 }, selectedRole === 'child' && { color: Colors.red }]}>
                      {t('child_role', 'Kid')}
                    </Text>
                    <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 10 }} numberOfLines={1}>
                      {t('child_role_sub', 'Quests & Battles')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[{ flex: 1, backgroundColor: Colors.surface2, borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, selectedRole === 'parent' && { borderColor: Colors.amber, backgroundColor: Colors.cardYellow }]}
                  onPress={() => setSelectedRole('parent')}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 13 }, selectedRole === 'parent' && { color: Colors.amber }]}>
                      {t('parent_role', 'Parent')}
                    </Text>
                    <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 10 }} numberOfLines={1}>
                      {t('parent_role_sub', 'Manage & Verify')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

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
                  placeholder={t('nickname_placeholder', 'Roblox Nickname / Tag (e.g. AlexRoblox2026)')}
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
                setAuthMessage(res.message || 'Password reset link sent!');
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
              <Text style={styles.msgBannerText}>{authMessage}</Text>
            </View>
          )}

          {/* Primary Form Submit Button */}
          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleAuthSubmit}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? t('processing', 'Processing...') : (
                authMode === 'register' ? t('btn_create_account', 'CREATE ACCOUNT 🚀') :
                t('btn_sign_in', 'SIGN IN 🔑')
              )}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Google Sign-In */}
          <TouchableOpacity 
            style={styles.googleBtn}
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
          >
            <Text style={styles.googleBtnText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  authBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  coinBadge: {
    backgroundColor: Colors.amberDim,
    borderWidth: 1.5,
    borderColor: Colors.amber,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  coinBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: Colors.amber,
  },
  logoBox: {
    width: 60,
    height: 60,
    backgroundColor: Colors.red,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    transform: [{ rotate: '-10deg' }],
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  robloxDiamond: {
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 28,
  },
  googleBtn: {
    width: '100%',
    backgroundColor: Colors.red,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  googleBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border2,
    marginVertical: 16,
  },
  testBtn: {
    width: '100%',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  testBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    padding: 4,
    width: '100%',
    marginBottom: 20,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  modeTabTextActive: {
    color: Colors.red,
    fontFamily: 'Nunito_800ExtraBold',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    width: '100%',
    marginBottom: 12,
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
    backgroundColor: Colors.red,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 10,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    backgroundColor: Colors.amberDim,
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 8,
    padding: 10,
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
