const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/;

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
