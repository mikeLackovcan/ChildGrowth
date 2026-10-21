import React from 'react';
import { Tabs } from 'expo-router';
import { Colors, QUEST_BACKGROUNDS } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { ListChecks, Gift, ShoppingBag, Globe2 } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const activeBackground = useAppStore((state) => state.activeBackground);
  const background = QUEST_BACKGROUNDS[activeBackground] || QUEST_BACKGROUNDS.clean;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: background.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: 72 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          minHeight: 52,
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 13,
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
        name="world"
        options={{
          title: t('tab_world', 'My World'),
          tabBarIcon: ({ color }) => (
            <Globe2 size={24} color={color} />
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
