import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import storage from './projectStorage';
import { releaseDeviceLink } from './devicePairing';
import { loadOwnCloudData } from './familyCloud';
import { useAppStore } from '../store/useAppStore';
import { useWorldStore } from '../store/useWorldStore';

let disconnecting = false;

/** Revoke this device, retain its local profile and town, and stop all future cloud writes. */
export async function disconnectManagedDevice(): Promise<void> {
  if (disconnecting) throw new Error('pair_busy');
  const initial = useAppStore.getState();
  if (initial.deviceConnection !== 'linked' || initial.role !== 'child' || !initial.userId || !initial.nickname) {
    throw new Error('pair_use_child_device');
  }
  disconnecting = true;
  try {
    await auth.authStateReady();
    if (auth.currentUser && !auth.currentUser.isAnonymous) throw new Error('pair_session_changed');
    const deviceUid = auth.currentUser?.uid;
    if (auth.currentUser) {
      try {
        const baseline = await loadOwnCloudData(initial.userId);
        if (baseline) await storage.setItem('device_reconnect_baseline_' + initial.userId, JSON.stringify(baseline));
      } catch (error: any) {
        // A parent may have already revoked access or deleted this profile.
        if (error?.message !== 'pair_not_connected' && error?.code !== 'permission-denied') throw error;
      }
    }
    await useWorldStore.getState().hydrate(initial.userId);
    const world = useWorldStore.getState();
    // Make a durable recovery copy before revoking any remote access.
    await storage.setItem('device_disconnect_backup_' + initial.userId, JSON.stringify(useAppStore.getState()));
    await storage.setItem('world_' + initial.userId, JSON.stringify({
      spentPower: world.spentPower, placements: world.placements, updatedAt: world.updatedAt,
    }));
    if (useAppStore.getState().userId !== initial.userId || auth.currentUser?.uid !== deviceUid) {
      throw new Error('pair_session_changed');
    }
    if (auth.currentUser) {
      await releaseDeviceLink();
      if (auth.currentUser?.uid !== deviceUid) throw new Error('pair_session_changed');
      await signOut(auth);
    }
    if (useAppStore.getState().userId !== initial.userId) throw new Error('pair_session_changed');
    // Read again: a notification may have completed a quest during the network request.
    const local = { ...useAppStore.getState(), deviceConnection: 'local' as const,
      linkedParents: [], parentEmail: null, approvalStatus: null };
    useAppStore.setState({ deviceConnection: 'local', linkedParents: [], parentEmail: null, approvalStatus: null });
    await storage.setItem('mockState_' + initial.nickname, JSON.stringify(local));
    await storage.setItem('mockState', JSON.stringify(local));
  } finally { disconnecting = false; }
}
