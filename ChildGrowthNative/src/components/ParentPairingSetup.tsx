import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Plus, RefreshCw, ScanLine, Smartphone, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { createManagedChild, createPairingCode, replaceChildDevice } from '../lib/devicePairing';
import { STARTER_HERO_IDS } from '../lib/questTemplates';
import { heroFor } from '../lib/heroCatalog';
import { confirmAction } from '../lib/confirmAction';
import QuestHero from './QuestHero';
import { Colors } from '../constants/theme';
import { deleteChildProfile } from '../lib/deleteChildProfile';
import ReadableTextInput from './ReadableTextInput';
import QRCode from 'react-native-qrcode-svg';
import { pairingQrValue } from '../lib/pairingCode';

export default function ParentPairingSetup() {
  const { t } = useTranslation();
  const role = useAppStore(state => state.role);
  const children = useAppStore(state => state.children);
  const selected = useAppStore(state => state.children.find(child => child.id === state.selectedChildId));
  const [adding, setAdding] = useState(children.length === 0);
  const [name, setName] = useState('');
  const [hero, setHero] = useState('quest_champ');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [ticket, setTicket] = useState<{ childId: string; code: string; recovery?: boolean } | null>(null);
  if (role !== 'parent') return null;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try { await action(); }
    catch { setError('pair_setup_failed'); }
    finally { setBusy(false); }
  }

  async function makeCode(recovery = false) {
    if (!selected?.managed || selected.managedOwner === false) return;
    const childId = selected.id;
    if (recovery) {
      const accepted = await confirmAction(
        t('pair_replace_warning', { name: selected.name }),
        t('pair_replace_confirm'),
        t('gate_cancel'),
      );
      if (!accepted) return;
    }
    void run(async () => {
      setTicket(null);
      const code = recovery ? await replaceChildDevice(childId) : await createPairingCode(childId);
      setTicket({ childId, code, recovery });
    });
  }

  return <View style={styles.section}>
    <View style={styles.heading}>
      <View style={styles.headingCopy}>
        <Text accessibilityRole="header" style={styles.title}>{t('pair_family_title')}</Text>
        <Text style={styles.hint}>{t('pair_family_short')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: adding }}
        style={[styles.addButton, adding && styles.addButtonActive]}
        onPress={() => setAdding(value => !value)}
      >
        <Plus size={20} color={adding ? '#FFFFFF' : Colors.primary} />
        <Text style={[styles.addButtonText, adding && styles.addButtonTextActive]}>{t('parent_add_child')}</Text>
      </Pressable>
    </View>

    <Pressable accessibilityRole="button" disabled={busy} style={styles.existingChildAction} onPress={() => router.push('/claim-child' as never)}>
      <ScanLine size={20} color={Colors.primary} />
      <View style={styles.existingChildCopy}>
        <Text style={styles.existingChildTitle}>{t('guardian_parent_title')}</Text>
        <Text style={styles.existingChildHint}>{t('guardian_parent_short')}</Text>
      </View>
    </Pressable>

    {adding ? <View style={styles.createArea}>
      <Text style={styles.fieldLabel}>{t('pair_child_name')}</Text>
      <ReadableTextInput
        value={name}
        onChangeText={setName}
        maxLength={30}
        editable={!busy}
        accessibilityLabel={t('pair_child_name')}
        placeholder={t('pair_child_name')}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.fieldLabel}>{t('pair_choose_hero')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroes}>
        {STARTER_HERO_IDS.map(id => <Pressable
          key={id}
          disabled={busy}
          accessibilityRole="radio"
          accessibilityState={{ checked: hero === id }}
          accessibilityLabel={heroFor(id).name}
          onPress={() => setHero(id)}
          style={[styles.hero, hero === id && styles.selectedHero]}
        >
          <QuestHero id={id} style={styles.heroImage} />
          <Text numberOfLines={1} style={styles.heroName}>{heroFor(id).name}</Text>
        </Pressable>)}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        disabled={busy || !name.trim()}
        style={[styles.primary, (busy || !name.trim()) && styles.disabled]}
        onPress={() => void run(async () => {
          const uid = auth.currentUser?.uid;
          if (!uid || auth.currentUser?.isAnonymous) throw new Error('parent_required');
          await useAppStore.getState().saveMockState();
          const child = await createManagedChild(name, hero);
          if (auth.currentUser?.uid !== uid || useAppStore.getState().role !== 'parent') return;
          await useAppStore.getState().loadMockState();
          useAppStore.getState().selectChild(child.uid);
          setName('');
          setTicket(null);
          setAdding(false);
        })}
      ><Text style={styles.primaryText}>{t(busy ? 'processing' : 'pair_create')}</Text></Pressable>
    </View> : null}

    {selected?.managed && selected.managedOwner !== false ? <View style={styles.connectArea}>
      <Text style={styles.childTitle}>{t('pair_for_child', { name: selected.name })}</Text>
      <View style={styles.steps}>
        <View style={styles.step}><View style={styles.stepIcon}><Smartphone size={21} color={Colors.primary} /></View><Text style={styles.stepText}>{t('pair_step_kid')}</Text></View>
        <View style={styles.step}><View style={styles.stepIcon}><ScanLine size={22} color={Colors.primary} /></View><Text style={styles.stepText}>{t('pair_step_code')}</Text></View>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.primary} onPress={() => void makeCode(false)}>
        <ScanLine size={21} color="#FFFFFF" /><Text style={styles.primaryText}>{t('pair_connect_device')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryAction} onPress={() => void makeCode(true)}>
        <RefreshCw size={19} color={Colors.primary} /><Text style={styles.secondaryText}>{t('pair_replace_device')}</Text>
      </Pressable>
      {ticket?.childId === selected.id ? <View style={styles.ticket}>
        <Text style={styles.ticketLabel}>{t(ticket.recovery ? 'pair_recovery_code' : 'pair_code_label')}</Text>
        <View style={styles.qr} accessibilityLabel={t('pair_qr_accessible', { name: selected.name })}>
          <QRCode value={pairingQrValue(ticket.code)} size={200} color={Colors.text} backgroundColor="#FFFFFF" />
        </View>
        <Text style={styles.scanHint}>{t('pair_scan_hint')}</Text>
        <Text selectable accessibilityLiveRegion="polite" style={styles.code}>{ticket.code}</Text>
        <Text style={styles.ticketHint}>{t('pair_code_expires')}</Text>
      </View> : null}

      {deleteId !== selected.id ? <Pressable accessibilityRole="button" disabled={busy} style={styles.dangerAction} onPress={() => setDeleteId(selected.id)}>
        <Trash2 size={18} color="#AF332A" /><Text style={styles.danger}>{t('pair_delete_profile')}</Text>
      </Pressable> : <View style={styles.deleteConfirm}>
        <Text style={styles.warning}>{t('pair_delete_warning', { name: selected.name })}</Text>
        <Pressable accessibilityRole="button" disabled={busy} style={styles.dangerAction} onPress={() => {
          const childId = selected.id;
          void run(async () => {
            await deleteChildProfile(childId);
            setDeleteId(null);
            setTicket(null);
            setNotice('pair_deleted');
          });
        }}><Text style={styles.danger}>{t('pair_delete_confirm')}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryAction} onPress={() => setDeleteId(null)}>
          <Text style={styles.secondaryText}>{t('pair_delete_cancel')}</Text>
        </Pressable>
      </View>}
    </View> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{t(notice)}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.danger}>{t(error)}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { paddingVertical: 26, gap: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, lineHeight: 28, color: Colors.text },
  hint: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 22, color: Colors.textSecondary, marginTop: 3 },
  addButton: { minHeight: 48, maxWidth: '44%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, paddingHorizontal: 12, backgroundColor: Colors.blueDim },
  addButtonActive: { backgroundColor: Colors.primary },
  addButtonText: { flexShrink: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.primary, textAlign: 'center' },
  addButtonTextActive: { color: '#FFFFFF' },
  createArea: { paddingTop: 4 },
  existingChildAction: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  existingChildCopy: { flex: 1, minWidth: 0 },
  existingChildTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, lineHeight: 22, color: Colors.primary },
  existingChildHint: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  fieldLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, lineHeight: 22, color: Colors.text, marginBottom: 6, marginTop: 10 },
  input: { width: '100%', minHeight: 58, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontFamily: 'Nunito_700Bold', fontSize: 17, lineHeight: 24, color: Colors.text, textAlign: 'left', textAlignVertical: 'top' },
  heroes: { gap: 10, paddingVertical: 4, paddingRight: 10 },
  hero: { width: 108, alignItems: 'center', padding: 8, borderWidth: 2, borderColor: 'transparent', borderRadius: 18, backgroundColor: '#F4F7FB' },
  selectedHero: { borderColor: Colors.primary, backgroundColor: Colors.blueDim },
  heroImage: { width: 68, height: 76 },
  heroName: { width: '100%', fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text, textAlign: 'center', marginTop: 4 },
  primary: { minHeight: 56, flexDirection: 'row', gap: 9, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: Colors.primary, paddingHorizontal: 16, marginTop: 12 },
  primaryText: { flexShrink: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#FFFFFF', textAlign: 'center' },
  disabled: { opacity: 0.45 },
  connectArea: { paddingTop: 8 },
  childTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 19, lineHeight: 25, color: Colors.text },
  steps: { flexDirection: 'row', gap: 8, marginTop: 14 },
  step: { flex: 1, minWidth: 0, alignItems: 'center' },
  stepIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.blueDim },
  stepText: { fontFamily: 'Nunito_700Bold', fontSize: 14, lineHeight: 19, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  secondaryAction: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 },
  secondaryText: { flexShrink: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.primary, textAlign: 'center' },
  ticket: { alignItems: 'center', marginTop: 10, paddingVertical: 18, borderRadius: 18, backgroundColor: Colors.blueDim },
  qr: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  scanHint: { fontFamily: 'Nunito_700Bold', fontSize: 14, lineHeight: 20, color: Colors.textSecondary, textAlign: 'center', marginTop: 10, paddingHorizontal: 18 },
  ticketLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.textSecondary },
  code: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, letterSpacing: 2, color: Colors.text, marginTop: 5 },
  ticketHint: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, color: Colors.textSecondary, marginTop: 5 },
  dangerAction: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  danger: { flexShrink: 1, fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 22, color: '#AF332A', textAlign: 'center' },
  warning: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  deleteConfirm: { marginTop: 8 },
  notice: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 22, color: '#568A12' },
});
