// A cache can retain the last server-verified relationship while offline. Old
// client-authored approval fields are preserved separately as recovery evidence.
export function familyCacheState(saved: Record<string, any>, uid: string) {
  const verified = saved.familyVerifiedUid === uid;
  const children = Array.isArray(saved.children) ? saved.children : [];
  const parents = Array.isArray(saved.linkedParents) ? saved.linkedParents : [];
  const tags = saved.role === 'parent' ? children.map(child => child?.nickname) : [...parents, saved.parentEmail];
  return {
    familyVerifiedUid: verified ? uid : null,
    familyReconnectTags: verified ? saved.familyReconnectTags || [] : [...new Set(tags.filter(tag => typeof tag === 'string' && /^[a-z0-9_-]{3,24}$/.test(tag)))],
    children: verified ? children : [],
    selectedChildId: verified ? saved.selectedChildId || null : null,
    linkedParents: verified ? parents : [],
    parentEmail: verified ? saved.parentEmail || null : null,
    approvalStatus: verified ? saved.approvalStatus || null : null,
  };
}
