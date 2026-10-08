import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { LayoutDashboard, Swords, Gift, ShoppingBag } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.red,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          height: (Platform.OS === 'ios' ? 88 : 64) + insets.bottom,
          paddingBottom: (Platform.OS === 'ios' ? 28 : 10) + insets.bottom,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
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
      <Tabs.Screen
        name="battle"
        options={{
          title: t('tab_battle', 'Battle'),
          tabBarIcon: ({ color }) => (
            <Swords size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="milestones"
        options={{
          title: t('tab_prizes', 'Prizes'),
          tabBarIcon: ({ color }) => (
            <Gift size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('tab_shop', 'Shop'),
          tabBarIcon: ({ color }) => (
            <ShoppingBag size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
