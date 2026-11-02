import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Layout } from '../../constants/theme';
import { BookOpen, Sparkles, Heart, Brain, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { QuestbloxIcon } from '../../components/questblox/QuestbloxBrand';

const TIPS = [
  {
    id: '1',
    title: 'tips_positive_title',
    description: 'tips_positive_body',
    icon: Sparkles,
    color: Colors.cardPink,
  },
  {
    id: '2',
    title: 'tips_screen_title',
    description: 'tips_screen_body',
    icon: Brain,
    color: Colors.cardBlue,
  },
  {
    id: '3',
    title: 'tips_emotion_title',
    description: 'tips_emotion_body',
    icon: Heart,
    color: Colors.cardYellow,
  }
];

export default function TipsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <QuestbloxIcon size={42} />
          <BookOpen size={32} color={Colors.text} />
          <Text style={styles.headerTitle}>{t('tips_title')}</Text>
        </View>
        <Text style={styles.headerSub}>{t('tips_subtitle')}</Text>

        <View style={styles.tipsList}>
          {TIPS.map((tip) => (
            <TouchableOpacity key={tip.id} style={styles.tipCard} activeOpacity={0.8}>
              <View style={[styles.iconBox, { backgroundColor: tip.color }]}>
                <tip.icon size={24} color={Colors.text} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{t(tip.title)}</Text>
                <Text style={styles.tipDesc}>{t(tip.description)}</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.promoCard}>
          <Text style={styles.promoTitle}>{t('tips_more_title')}</Text>
          <Text style={styles.promoDesc}>{t('tips_more_body')}</Text>
          <TouchableOpacity style={styles.promoButton}>
            <Text style={styles.promoButtonText}>{t('tips_more_action')}</Text>
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
  promoCard: {
    backgroundColor: Colors.primary,
    padding: 24,
    borderRadius: Layout.borderRadius,
    alignItems: 'center',
  },
  promoTitle: {
    ...Typography.title,
    color: '#FFF',
    marginBottom: 8,
  },
  promoDesc: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  promoButton: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  promoButtonText: {
    color: Colors.primary,
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
});
