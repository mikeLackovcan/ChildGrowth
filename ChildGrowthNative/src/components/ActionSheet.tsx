import React from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import useReducedMotion from '../hooks/useReducedMotion';

export default function ActionSheet({ visible, title, onClose, children }: React.PropsWithChildren<{
  visible: boolean; title: string; onClose: () => void;
}>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('close')} />
        <View style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom) }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')}><X color={Colors.text} size={22} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,26,75,.3)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, width: '100%', maxWidth: 620, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 12, paddingTop: 12 },
  title: { flex: 1, fontSize: 23, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, paddingTop: 12, gap: 16 },
});
