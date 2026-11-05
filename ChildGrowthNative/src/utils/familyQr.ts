const FAMILY_CODE = /^[A-HJ-NP-Z2-9]{8}$/;

export function normalizeFamilyCode(value: string) {
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return FAMILY_CODE.test(code) ? code : null;
}

export function formatFamilyCode(value: string) {
  const code = normalizeFamilyCode(value);
  return code ? `${code.slice(0, 4)}-${code.slice(4)}` : value;
}

export function childQrValue(code: string) {
  const normalized = normalizeFamilyCode(code);
  return normalized ? `questblox://link-account?code=${normalized}` : '';
}

export function childCodeFromQr(value: string) {
  const match = /^questblox:\/\/link-account\?code=([^&#]+)(?:&[^#]*)?$/i.exec(value.trim());
  if (!match) return null;
  try {
    return normalizeFamilyCode(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
