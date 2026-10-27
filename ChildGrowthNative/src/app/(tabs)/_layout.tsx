import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { LayoutDashboard, Swords, Gift, ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffc857',
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#0F1322',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.06)',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          height: 76 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 8,
        },
        tabBarIconStyle: { height: 24, width: 24, flexGrow: 0 },
        tabBarLabelStyle: {
          flexShrink: 0,
          lineHeight: 18,
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_tracker', 'Quests'),
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="shop" options={{ title: t('nav_fighters'), tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} /> }} />
      <Tabs.Screen name="battle" options={{ title: t('nav_arena'), tabBarIcon: ({ color }) => <Swords size={24} color={color} /> }} />
      <Tabs.Screen name="milestones" options={{ title: t('nav_rewards'), tabBarIcon: ({ color }) => <Gift size={24} color={color} /> }} />
      <Tabs.Screen
        name="tips"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
