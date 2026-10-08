import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { Users, Baby, Lock } from 'lucide-react-native';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function RoleSelectScreen() {
  const { t } = useTranslation();
  const setUser = useAppStore((state) => state.setUser);
  const userEmail = useAppStore((state) => state.userEmail);
  
  const [showGate, setShowGate] = useState(false);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathError, setMathError] = useState(false);

  const handleChildSelect = () => {
    setUser(userEmail, 'child');
    router.replace('/child-onboard');
  };

  const handleParentAttempt = () => {
    setShowGate(true);
    setMathAnswer('');
    setMathError(false);
  };

  const handleGateSubmit = () => {
    if (mathAnswer.trim() === '56') {
      setShowGate(false);
      setUser(userEmail, 'parent');
      router.replace('/parent-dashboard');
    } else {
      setMathError(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.authBox}>
          <View style={{ marginBottom: 16 }}>
            <LanguageSwitcher />
          </View>
          
          <Text style={styles.title}>{t('welcome')}</Text>
          <Text style={styles.subtitle}>{t('who_is_using')}</Text>

          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleCard, { backgroundColor: Colors.blue }]}
              activeOpacity={0.8}
              onPress={handleParentAttempt}
            >
              <View style={styles.iconWrapper}>
                <Users size={30} color="#FFFFFF" />
              </View>
              <Text style={styles.roleText}>{t('parent_role')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleCard, { backgroundColor: Colors.green }]}
              activeOpacity={0.8}
              onPress={handleChildSelect}
            >
              <View style={styles.iconWrapper}>
                <Baby size={30} color="#121212" />
              </View>
              <Text style={[styles.roleText, { color: '#121212' }]}>{t('child_role')}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

      <Modal visible={showGate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Lock size={32} color={Colors.amber} />
            </View>
            <Text style={styles.gateTitle}>Parental Gate</Text>
            <Text style={styles.gateSubtitle}>Solve this math problem to access parent features:</Text>
            <Text style={styles.gateQuestion}>What is 7 x 8?</Text>
            
            <TextInput 
              style={[styles.gateInput, mathError && styles.gateInputError]} 
              keyboardType="number-pad"
              value={mathAnswer}
              onChangeText={(text) => { setMathAnswer(text); setMathError(false); }}
              placeholder="Enter answer"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            {mathError && <Text style={styles.errorText}>Incorrect answer. Try again.</Text>}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGate(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleGateSubmit}>
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  authBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  roleContainer: {
    width: '100%',
    gap: 14,
  },
  roleCard: {
    width: '100%',
    height: 70,
    borderRadius: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    borderRadius: 16,
    maxWidth: 380,
    width: '100%',
    alignSelf: 'center',
  },
  gateTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  gateSubtitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  gateQuestion: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: Colors.amber,
    textAlign: 'center',
    marginBottom: 16,
  },
  gateInput: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
    marginBottom: 10,
  },
  gateInputError: {
    borderColor: Colors.red,
  },
  errorText: {
    color: Colors.red,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.red,
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#FFF',
  },
});
