import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export function QuestbloxIcon({ size = 44 }: { size?: number }) {
  const { t } = useTranslation();
  return <Image
    source={require('../../../assets/images/app-icon-v2.png')}
    accessibilityLabel={t('brand_logo')}
    style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
  />;
}

export function QuestbloxBrand({ size = 44 }: { size?: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <QuestbloxIcon size={size} />
    <Text style={{ color: '#f6f7fd', fontFamily: 'Nunito_900Black', fontSize: 21 }}>Questblox</Text>
  </View>;
}
