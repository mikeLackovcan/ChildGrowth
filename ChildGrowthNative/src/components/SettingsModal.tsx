import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { Settings, LogOut, User, Shield, X, Globe, RotateCcw } from 'lucide-react-native';
import LanguageSwitcher from './LanguageSwitcher';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const userEmail = useAppStore((state) => state.userEmail);
  const fullName = useAppStore((state) => state.fullName);
  const nickname = useAppStore((state) => state.nickname);
  const role = useAppStore((state) => state.role);
  const coins = useAppStore((state) => state.coins);
  const linkedParents = useAppStore((state) => state.linkedParents);
  const removeParent = useAppStore((state) => state.removeParent);
  const clearAllData = useAppStore((state) => state.clearAllData);
  const logout = useAppStore((state) => state.logout);

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const handleResetAllData = async () => {
    onClose();
    await clearAllData();
    router.replace('/');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Settings size={22} color={Colors.red} />
              <Text style={styles.title}>{t('account_settings_title', 'Settings & Account ⚙️')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card */}
          <View style={styles.profileBox}>
            <View style={styles.avatarCircle}>
              <User size={24} color={Colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{fullName || nickname || 'Kid Hero'}</Text>
              <Text style={styles.userEmail}>{userEmail || `@${nickname || 'hero'}`}</Text>
              {nickname && (
                <Text style={styles.userTag}>Roblox Tag: @{nickname}</Text>
              )}
            </View>
          </View>

          {/* Wallet & Role Summary */}
          <View style={styles.infoRow}>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillLabel}>Role:</Text>
              <Text style={styles.infoPillVal}>{role === 'parent' ? '👨‍👩‍👧 Parent' : '🎮 Roblox Kid'}</Text>
            </View>

            <View style={styles.infoPill}>
              <Text style={styles.infoPillLabel}>Coins:</Text>
              <Text style={styles.infoPillVal}>💰 {coins}</Text>
            </View>
          </View>

          {/* Linked Parents & Remove Parent Option for Kids */}
          {role !== 'parent' && linkedParents && linkedParents.length > 0 ? (
            <View style={{ backgroundColor: Colors.surface2, borderRadius: 12, padding: 12, gap: 8 }}>
              <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.textSecondary, fontSize: 12 }}>
                {t('instructed_by', 'Instructed by Parents: ')}
              </Text>
              {linkedParents.map((parentTag) => (
                <View key={parentTag} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 8, borderRadius: 8 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 13 }}>@{parentTag}</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(232,0,27,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                    onPress={() => removeParent(parentTag)}
                  >
                    <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.red, fontSize: 11 }}>{t('remove_parent_btn', 'Remove Parent ❌')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : role !== 'parent' ? (
            <TouchableOpacity 
              style={{ backgroundColor: Colors.cardPink, borderWidth: 1, borderColor: Colors.red, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => {
                onClose();
                router.push('/link-account');
              }}
            >
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.red, fontSize: 13 }}>
                👨‍👩‍👧 {t('link_account_title', 'Link Parent Account')}
              </Text>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.red, fontSize: 12 }}>Link 🚀</Text>
            </TouchableOpacity>
          ) : null}

          {/* Language Switcher */}
          <View style={styles.langRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Globe size={18} color={Colors.textSecondary} />
              <Text style={styles.langLabel}>Language / Jazyk:</Text>
            </View>
            <LanguageSwitcher />
          </View>

          {/* Reset All App Data Button */}
          <TouchableOpacity 
            style={[styles.logoutBtn, { backgroundColor: 'rgba(232,0,27,0.15)', borderWidth: 1, borderColor: Colors.red }]} 
            activeOpacity={0.8}
            onPress={() => {
              if (confirm('Wipe all local users & data to start completely fresh?')) {
                handleResetAllData();
              }
            }}
          >
            <RotateCcw size={18} color={Colors.red} />
            <Text style={[styles.logoutBtnText, { color: Colors.red }]}>RESET ALL APP DATA 🔄</Text>
          </TouchableOpacity>

          {/* Log Out Button */}
          <TouchableOpacity 
            style={styles.logoutBtn} 
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <LogOut size={18} color="#FFF" />
            <Text style={styles.logoutBtnText}>{t('logout_btn', 'LOG OUT OF QUESTBLOX 🚪')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.text,
    fontSize: 18,
  },
  closeBtn: {
    backgroundColor: Colors.surface2,
    padding: 6,
    borderRadius: 20,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface2,
    padding: 14,
    borderRadius: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.text,
    fontSize: 16,
  },
  userEmail: {
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textSecondary,
    fontSize: 13,
  },
  userTag: {
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.amber,
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoPill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  infoPillLabel: {
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textSecondary,
    fontSize: 13,
  },
  infoPillVal: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.text,
    fontSize: 14,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface2,
    padding: 12,
    borderRadius: 12,
  },
  langLabel: {
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
    fontSize: 14,
  },
  parentSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardYellow,
    borderWidth: 1,
    borderColor: Colors.amber,
    paddingVertical: 12,
    borderRadius: 14,
  },
  parentSwitchText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.amber,
    fontSize: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.red,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  logoutBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFF',
    fontSize: 14,
  },
});
