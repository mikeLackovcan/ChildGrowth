const NICKNAME = /^[a-z0-9_-]{3,24}$/;

export function childQrValue(nickname: string) {
  return `questblox://link-account?tag=${encodeURIComponent(nickname.trim().toLowerCase())}`;
}

export function childTagFromQr(value: string) {
  const match = /^questblox:\/\/link-account\?tag=([^&#]+)(?:&[^#]*)?$/i.exec(value.trim());
  if (!match) return null;
  try {
    const nickname = decodeURIComponent(match[1]).trim().replace(/^@/, '').toLowerCase();
    return NICKNAME.test(nickname) ? nickname : null;
  } catch {
    return null;
  }
}
