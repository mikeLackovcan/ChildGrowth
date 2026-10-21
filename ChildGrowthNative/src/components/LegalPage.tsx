import React, { ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/theme';

export const SUPPORT_EMAIL = 'mike.fecko@gmail.com';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        {Platform.OS !== 'web' ? (
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ) : null}
        <Text style={styles.brand}>QUEST CHAMP</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {children}
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={styles.contact}>
        <Text style={styles.contactText}>{SUPPORT_EMAIL}</Text>
      </Pressable>
      <Text style={styles.footer}>© 2026 Quest Champ</Text>
    </ScrollView>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{title}</Text>{children}</View>;
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 34, paddingBottom: 56 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  brand: { color: Colors.primary, fontFamily: 'Nunito_800ExtraBold', fontSize: 14, letterSpacing: 1.4 },
  back: { minHeight: 44, justifyContent: 'center', paddingRight: 20 },
  backText: { color: Colors.primary, fontFamily: 'Nunito_700Bold', fontSize: 15 },
  title: { color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 34, lineHeight: 41, marginTop: 22, marginBottom: 12 },
  section: { borderTopWidth: 1, borderTopColor: '#E6EAF0', paddingTop: 22, marginTop: 22 },
  heading: { color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 20, lineHeight: 27, marginBottom: 8 },
  paragraph: { color: Colors.textSecondary, fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 23, marginBottom: 10 },
  contact: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', marginTop: 24 },
  contactText: { color: Colors.primary, fontFamily: 'Nunito_800ExtraBold', fontSize: 16 },
  footer: { color: Colors.textSecondary, fontFamily: 'Nunito_600SemiBold', fontSize: 13, marginTop: 28 },
});
