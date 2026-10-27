import { useAppStore } from '../store/useAppStore';

// A delayed editor must never write its draft into a different child or account.
export function saveChildPrizes(parentId: string | null, childId: string, prizes: string[]): boolean {
  const state = useAppStore.getState();
  if (state.role !== 'parent' || state.userId !== parentId || state.selectedChildId !== childId
    || state.familyOperationBusy
    || !state.children.some(child => child.id === childId && child.isApproved)) return false;
  state.setPrizes(prizes.map(prize => prize.trim()).filter(Boolean));
  return true;
}
