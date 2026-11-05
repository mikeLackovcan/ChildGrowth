const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/;
const ACCOUNT_NICKNAME_PATTERN = /^[^@/?#&\u0000-\u001F\u007F]{2,30}$/u;

export type FamilyAccountRole = 'child' | 'parent';

export function normalizePairingCode(value: string): string | null {
  let candidate = value.trim();
  if (/^questhero:\/\/pair/i.test(candidate)) {
    const match = candidate.match(/[?&]code=([^&#]+)/i);
    candidate = match ? decodeURIComponent(match[1]) : '';
  }
  const clean = candidate.replace(/[\s-]/g, '').toUpperCase();
  return CODE_PATTERN.test(clean) ? clean.match(/.{1,4}/g)!.join('-') : null;
}

export function pairingQrValue(code: string): string {
  const normalized = normalizePairingCode(code);
  return `questhero://pair?code=${encodeURIComponent(normalized || code)}`;
}

export function normalizeGuardianCode(value: string): string | null {
  let candidate = value.trim();
  if (/^questhero:\/\/guardian/i.test(candidate)) {
    const match = candidate.match(/[?&]code=([^&#]+)/i);
    candidate = match ? decodeURIComponent(match[1]) : '';
  }
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

export function familyAccountQrValue(role: FamilyAccountRole, nickname: string): string {
  const normalized = normalizeFamilyNickname(nickname) || nickname.trim().replace(/^@/, '').toLowerCase();
  return `questhero://family?role=${role}&nickname=${encodeURIComponent(normalized)}`;
}

export function parseFamilyAccountQr(value: string): { role: FamilyAccountRole; nickname: string } | null {
  if (!/^questhero:\/\/family\?/i.test(value.trim())) return null;
  const roleMatch = value.match(/[?&]role=(child|parent)(?:&|$)/i);
  const nicknameMatch = value.match(/[?&]nickname=([^&#]+)/i);
  if (!roleMatch || !nicknameMatch) return null;
  let decoded = '';
  try { decoded = decodeURIComponent(nicknameMatch[1]); }
  catch { return null; }
  const nickname = normalizeFamilyNickname(decoded);
  if (!nickname) return null;
  return { role: roleMatch[1].toLowerCase() as FamilyAccountRole, nickname };
}
