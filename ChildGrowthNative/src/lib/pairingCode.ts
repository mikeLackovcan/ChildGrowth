const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/;
const ACCOUNT_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const ACCOUNT_NICKNAME_PATTERN = /^[^@/?#&\u0000-\u001F\u007F]{2,30}$/u;
const ACCOUNT_UID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

export type FamilyAccountRole = 'child' | 'parent';

type QuestHeroQrRoute = 'pair' | 'guardian' | 'family';

function questHeroQrParts(value: string): { route: QuestHeroQrRoute; pathRole?: FamilyAccountRole; query: string } | null {
  const candidate = value.trim();
  const appMatch = candidate.match(/^(?:questhero|questchamp):\/{0,3}(pair|guardian|family)(?:\/(child|parent))?\/?\?([^#]*)$/i);
  const webMatch = candidate.match(/^https:\/\/(?:quest-hero-dab6b\.(?:web\.app|firebaseapp\.com))\/(pair|guardian|family)(?:\/(child|parent))?\/?\?([^#]*)$/i);
  const match = appMatch || webMatch;
  if (!match) return null;
  return {
    route: match[1].toLowerCase() as QuestHeroQrRoute,
    ...(match[2] ? { pathRole: match[2].toLowerCase() as FamilyAccountRole } : {}),
    query: match[3],
  };
}

function queryValue(query: string, key: string): string | null {
  const match = query.match(new RegExp(`(?:^|&)${key}=([^&]*)`, 'i'));
  if (!match) return null;
  try { return decodeURIComponent(match[1].replace(/\+/g, ' ')); }
  catch { return null; }
}

export function normalizePairingCode(value: string): string | null {
  let candidate = value.trim();
  const qr = questHeroQrParts(candidate);
  if (qr) candidate = qr.route === 'pair' ? queryValue(qr.query, 'code') || '' : '';
  const clean = candidate.replace(/[\s-]/g, '').toUpperCase();
  return CODE_PATTERN.test(clean) ? clean.match(/.{1,4}/g)!.join('-') : null;
}

export function pairingQrValue(code: string): string {
  const normalized = normalizePairingCode(code);
  return `questhero://pair?code=${encodeURIComponent(normalized || code)}`;
}

export function normalizeGuardianCode(value: string): string | null {
  let candidate = value.trim();
  const qr = questHeroQrParts(candidate);
  if (qr) candidate = qr.route === 'guardian' ? queryValue(qr.query, 'code') || '' : '';
  const clean = candidate.replace(/[\s-]/g, '').toUpperCase();
  return CODE_PATTERN.test(clean) ? clean.match(/.{1,4}/g)!.join('-') : null;
}

export function guardianQrValue(code: string): string {
  const normalized = normalizeGuardianCode(code);
  return `questhero://guardian?code=${encodeURIComponent(normalized || code)}`;
}

export function normalizeFamilyNickname(value: string): string | null {
  const clean = value.trim().replace(/^@/, '').toLowerCase();
  return ACCOUNT_NICKNAME_PATTERN.test(clean) ? clean : null;
}

export function normalizeFamilyAccountCode(value: string): string | null {
  const clean = value.trim().replace(/[\s-]/g, '').toUpperCase();
  return ACCOUNT_CODE_PATTERN.test(clean) ? clean.match(/.{1,4}/g)!.join('-') : null;
}

export function familyAccountQrValue(role: FamilyAccountRole, nickname: string, uid?: string | null): string {
  const normalized = normalizeFamilyNickname(nickname) || nickname.trim().replace(/^@/, '').toLowerCase();
  const identity = uid && ACCOUNT_UID_PATTERN.test(uid) ? `&uid=${encodeURIComponent(uid)}` : '';
  return `questhero://family?role=${role}&nickname=${encodeURIComponent(normalized)}${identity}`;
}

export function parseFamilyAccountQr(value: string): { role: FamilyAccountRole; nickname: string; uid?: string } | null {
  const qr = questHeroQrParts(value);
  if (!qr || qr.route !== 'family') return null;
  const queryRole = queryValue(qr.query, 'role')?.toLowerCase();
  const role = qr.pathRole || (queryRole === 'child' || queryRole === 'parent' ? queryRole : null);
  const nickname = normalizeFamilyNickname(queryValue(qr.query, 'nickname') || '');
  if (!role || !nickname) return null;
  const decodedUid = queryValue(qr.query, 'uid');
  if (decodedUid === null && /(?:^|&)uid=/i.test(qr.query)) return null;
  const uid = decodedUid || undefined;
  if (uid && !ACCOUNT_UID_PATTERN.test(uid)) return null;
  return { role, nickname, ...(uid ? { uid } : {}) };
}
