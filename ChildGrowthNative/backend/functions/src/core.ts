import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
if (!getApps().length) initializeApp();
export const db = getFirestore();
export const now = () => Timestamp.now();
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function authenticated(request: { auth?: { uid: string } }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  return request.auth.uid;
}
export function text(value: unknown, max = 128): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('/')) throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  return value.trim();
}
export function requestKey(value: unknown): string {
  const key = text(value, 80);
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(key)) throw new HttpsError('invalid-argument', 'INVALID_REQUEST_ID');
  return key;
}
export const linkId = (parent: string, child: string) => digest(`${parent}:${child}`);
export async function requireFamily(transaction: Transaction, parentId: string, first: string, second: string) {
  const links = await Promise.all([first, second].map(child => transaction.get(db.doc(`familyLinks/${linkId(parentId, child)}`))));
  if (links.some(link => link.data()?.status !== 'accepted')) throw new HttpsError('permission-denied', 'FAMILY_REQUIRED');
}
export function queueNotice(transaction: Transaction, id: string, recipient: string, kind: string, data: Record<string, string>) {
  transaction.set(db.doc(`notificationOutbox/${digest(id)}`), { recipient, kind, data, status: 'pending', createdAt: now(), attempts: 0 });
}
