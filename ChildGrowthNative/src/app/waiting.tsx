import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Hourglass, UserRound } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { readFamilyStatus } from '../lib/familyAccounts';
import { Screen, Button, ui, palette } from '../components/questblox/UI';

export default function WaitingScreen() {
  const { t } = useTranslation();
  const uid = useAppStore(state => state.userId);
  const role = useAppStore(state => state.role);
  const invitation = useAppStore(state => state.pendingInvitation);
  const acceptParentInvite = useAppStore(state => state.acceptParentInvite);
  const denyParentInvite = useAppStore(state => state.denyParentInvite);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!uid || uid === 'guest-local') return <Redirect href="/login" />;
  if (role === 'parent') return <Redirect href="/parent-dashboard" />;
  const check = async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const family = await readFamilyStatus();
      if (auth.currentUser?.uid !== uid || useAppStore.getState().userId !== uid) return;
      useAppStore.setState({ children: family.children, linkedParents: family.linked_parents,
        parentEmail: family.parent_email, approvalStatus: family.approval_status,
        pendingInvitation: family.pending_invitation,
        familyReconnectTags: family.familyReconnectTags, familyVerifiedUid: uid });
      if (family.linked_parents.length) router.replace('/(tabs)');
      else setMessage(family.approval_status === 'pending' ? 'family_still_waiting' : 'family_no_invitation');
    } catch { if (useAppStore.getState().userId === uid) setMessage('family_link_error'); }
    finally { setBusy(false); }
  };
  const respond = async (accept: boolean) => {
    if (!invitation || busy) return;
    setBusy(true); setMessage('');
    const ok = await (accept ? acceptParentInvite(invitation.nickname) : denyParentInvite(invitation.nickname));
    setBusy(false);
    if (ok && accept) router.replace('/(tabs)');
    else if (ok) router.replace('/link-account');
    else setMessage('family_link_error');
  };
  return <Screen>
    <Hourglass size={72} color={palette.gold} />
    <Text style={ui.title}>{t('family_waiting_title')}</Text>
    {invitation ? <View style={[ui.card, { alignItems: 'center', width: '100%', paddingVertical: 22 }]}>
      <View style={{ width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panel }}><UserRound size={34} color={palette.gold} /></View>
      <Text style={[ui.heading, { textAlign: 'center' }]}>{invitation.name}</Text>
      <Text style={ui.meta}>@{invitation.nickname}</Text>
      <Text style={[ui.text, { textAlign: 'center' }]}>{t(invitation.sentByMe ? 'family_invite_sent_to' : 'family_invite_received', { name: invitation.name })}</Text>
      {!invitation.sentByMe && <View style={[ui.row, { width: '100%' }]}>
        <View style={{ flex: 1 }}><Button secondary disabled={busy} label={`✕ ${t('family_decline')}`} onPress={() => { void respond(false); }} /></View>
        <View style={{ flex: 1 }}><Button disabled={busy} label={`✓ ${t('family_accept')}`} onPress={() => { void respond(true); }} /></View>
      </View>}
    </View> : <Text style={ui.text}>{t('family_waiting_body')}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={ui.meta}>{t(message)}</Text>}
    <Button disabled={busy} label={t(busy ? 'settings_wait' : 'family_check_status')} onPress={() => { void check(); }} />
    <Button secondary disabled={busy} label={t('family_view_invitation')} onPress={() => router.push('/link-account')} />
    <Button secondary label={t('online_back')} onPress={() => router.replace('/(tabs)')} />
  </Screen>;
}
