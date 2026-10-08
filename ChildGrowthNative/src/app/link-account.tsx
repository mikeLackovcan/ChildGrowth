import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Layout } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { Link2, ArrowRight } from 'lucide-react-native';

export default function LinkAccountScreen() {
  const { t } = useTranslation();
  const sendParentInvite = useAppStore((state) => state.sendParentInvite);
  const [parentNickInput, setParentNickInput] = useState('');

  const handleSendRequest = () => {
    const cleanTag = parentNickInput.replace(/^@/, '').trim();
    if (!cleanTag) {
      Alert.alert(t('invalid_nickname_title', 'Invalid Input'), t('invalid_nickname_msg', "Please enter your parent's nickname or email address."));
      return;
    }
    
    sendParentInvite(cleanTag);
    const displayTag = cleanTag.includes('@') ? cleanTag : `@${cleanTag}`;
    Alert.alert('🎉 Invitation Sent!', `Parent link request sent to ${displayTag}. Waiting for parent approval!`);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Link2 size={40} color={Colors.red} />
        </View>

        <Text style={styles.title}>{t('link_account_title', 'Link Parent Account')}</Text>
        <Text style={styles.subtitle}>
          {t('link_account_sub', "Enter your parent's Nickname or Email address so they can approve your account and manage daily quests.")}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t('parent_nickname_label', "Parent's Nickname or Email")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('parent_nick_placeholder', 'Parent Nickname or Email (e.g. @tatko or parent@mail.com)')}
            placeholderTextColor={Colors.textMuted}
            value={parentNickInput}
            onChangeText={setParentNickInput}
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.button} onPress={handleSendRequest} activeOpacity={0.8}>
            <Text style={styles.buttonText}>{t('btn_send_request', 'Send Request 🚀')}</Text>
            <ArrowRight size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
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
    padding: Layout.padding,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.text,
    textAlign: 'center',
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: Layout.borderRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.red,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFF',
    fontSize: 16,
  },
});
