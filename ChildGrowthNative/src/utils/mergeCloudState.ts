const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
const keyed = (value: any) => Array.isArray(value) && value.every(item => object(item) && typeof item.id === 'string');

// Three-way merge: only local changes are written, preserving independent device
// changes. Conflicting edits fail explicitly rather than silently losing progress.
export function mergeCloudState(base: any, local: any, remote: any, path = ''): any {
  if (same(local, base)) return remote;
  if (same(remote, base) || same(local, remote)) return local;
  if (path.endsWith('updated_at')) return local;
  if (object(base) && object(local) && object(remote)) {
    const result: Record<string, any> = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
      const value = mergeCloudState(base[key], local[key], remote[key], `${path}.${key}`);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  if (keyed(base) && keyed(local) && keyed(remote)) {
    const ids = new Set<string>([...remote.map((v: any) => v.id), ...local.map((v: any) => v.id)]);
    return [...ids].map(id => mergeCloudState(base.find((v: any) => v.id === id), local.find((v: any) => v.id === id), remote.find((v: any) => v.id === id), `${path}.${id}`)).filter(v => v !== undefined);
  }
  throw new Error('SYNC_CONFLICT');
}
