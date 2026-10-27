import { useAppStore } from '../store/useAppStore';

// Recheck after any asynchronous confirmation: the selected child may have changed.
export function parentActionScopeMatches(parentId: string | null, childId: string): boolean {
  const state = useAppStore.getState();
  return state.role === 'parent' && state.userId === parentId
    && state.selectedChildId === childId && !state.familyOperationBusy
    && state.children.some(child => child.id === childId && child.isApproved === true);
}
