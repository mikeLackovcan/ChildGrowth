import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Layout } from '../../constants/theme';
import { BookOpen, Sparkles, Heart, Brain } from 'lucide-react-native';

const TIPS = [
  {
    id: '1',
    title: 'tips_effort_title',
    description: 'tips_effort_body',
    icon: Sparkles,
    color: Colors.cardPink,
  },
  {
    id: '2',
    title: 'tips_together_title',
    description: 'tips_together_body',
    icon: Brain,
    color: Colors.cardBlue,
  },
  {
    id: '3',
    title: 'tips_feelings_title',
    description: 'tips_feelings_body',
    icon: Heart,
    color: Colors.cardYellow,
  }
];

export default function TipsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <BookOpen size={32} color={Colors.text} />
          <Text style={styles.headerTitle}>{t('tips_title')}</Text>
        </View>
        <Text style={styles.headerSub}>{t('tips_subtitle')}</Text>

        <View style={styles.tipsList}>
          {TIPS.map((tip) => (
            <View key={tip.id} style={styles.tipCard}>
              <View style={[styles.iconBox, { backgroundColor: tip.color }]}>
                <tip.icon size={24} color={Colors.text} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{t(tip.title)}</Text>
                <Text style={styles.tipDesc}>{t(tip.description)}</Text>
              </View>
            </View>
          ))}
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
    padding: Layout.padding,
    paddingBottom: 60,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    marginTop: 10,
  },
  headerTitle: {
    ...Typography.header,
  },
  headerSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  tipsList: {
    gap: 16,
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Layout.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipDesc: {
    ...Typography.small,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
