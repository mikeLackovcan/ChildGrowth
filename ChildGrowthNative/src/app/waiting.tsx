import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Layout } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { Hourglass } from 'lucide-react-native';

export default function WaitingScreen() {
  const setUser = useAppStore((state) => state.setUser);

  const handleLogout = () => {
    setUser(null, null);
    router.replace('/');
  };

  const handleCheckStatus = () => {
    // In a real app, this would poll the backend. For now, we simulate approval
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Hourglass size={64} color={Colors.primary} style={{ marginBottom: 20 }} strokeWidth={2} />
          <Text style={styles.title}>Waiting...</Text>
          <Text style={styles.subtitle}>Your parent must approve your request before you can start your quests.</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            activeOpacity={0.8}
            onPress={handleCheckStatus}
          >
            <Text style={styles.primaryButtonText}>Check Status</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <Text style={styles.secondaryButtonText}>Logout</Text>
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    ...Typography.header,
    fontSize: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.subtitle,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    height: 56,
    borderRadius: Layout.borderRadiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
