import { useAppStore } from '../store/useAppStore';
import { deleteManagedChild } from './devicePairing';
import { localDateKey } from './questSchedule';

/** Called only after a parent confirms deletion of this specific profile. */
export async function deleteChildProfile(childId: string): Promise<void> {
  const initial = useAppStore.getState();
  if (initial.role !== 'parent' || !initial.children.some(child => child.id === childId && child.managed)) {
    throw new Error('pair_parent_required');
  }
  if (initial.familyOperationBusy) throw new Error('pair_busy');
  const owner = initial.userId;
  const epoch = initial.familyOperationEpoch + 1;
  useAppStore.setState({ familyOperationBusy: true, familyOperationEpoch: epoch });
  try {
    await deleteManagedChild(childId);
    const current = useAppStore.getState();
    if (current.userId !== owner || current.role !== 'parent') throw new Error('pair_session_changed');
    const children = current.children.filter(child => child.id !== childId);
    if (current.selectedChildId !== childId) {
      useAppStore.setState({ children });
    } else {
      useAppStore.setState({
        children, selectedChildId: null, tasks: [], wonPrizes: [], prizes: [],
        coins: 0, xp: 0, level: 1, totalEarned: 0, rewardGoal: null, activityHistory: [],
        dailyEarnings: { date: localDateKey(), coins: 0 }, lastSpinDate: null,
        currentAvatar: 'default', unlockedAvatars: ['default'],
        activeBackground: 'clean', unlockedBackgrounds: ['clean'],
        activeTheme: 'classic', unlockedThemes: ['classic'], epicBossTask: '', epicBossXP: 35,
      });
      if (children[0]) useAppStore.getState().selectChild(children[0].id);
    }
    await useAppStore.getState().saveMockState();
  } finally {
    const current = useAppStore.getState();
    if (current.familyOperationEpoch === epoch) {
      useAppStore.setState({ familyOperationBusy: false, familyOperationEpoch: epoch + 1 });
    }
  }
}
