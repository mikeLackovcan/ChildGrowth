import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { ListChecks, Gift, ShoppingBag } from 'lucide-react-native';
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
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: (Platform.OS === 'ios' ? 82 : 66) + insets.bottom,
          paddingBottom: (Platform.OS === 'ios' ? 28 : 8) + insets.bottom,
          paddingTop: Platform.OS === 'android' ? 8 : 12,
        },
        tabBarItemStyle: {
          minHeight: 52,
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito_600SemiBold',
          fontSize: Platform.OS === 'android' ? 11 : 12,
          marginBottom: Platform.OS === 'android' ? 1 : 0,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_tracker', 'Quests'),
          tabBarIcon: ({ color }) => (
            <ListChecks size={24} color={color} />
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
      <Tabs.Screen name="tips" options={{ href: null }} />
    </Tabs>
  );
}
