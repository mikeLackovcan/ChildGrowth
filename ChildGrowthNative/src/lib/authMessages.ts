// Never expose provider diagnostics, tokens or configuration details in UI copy.
export function authErrorKey(error: unknown): string {
  const value = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : {};
  const code = typeof value.code === 'string' ? value.code : typeof value.message === 'string' ? value.message : '';
  const keys: Record<string, string> = {
    'auth/invalid-email': 'auth_email_invalid',
    'auth/invalid-credential': 'auth_credentials',
    'auth/wrong-password': 'auth_credentials',
    'auth/user-not-found': 'auth_credentials',
    'auth/email-already-in-use': 'auth_email_used',
    'auth/weak-password': 'auth_password_weak',
    'auth/network-request-failed': 'auth_network',
    'auth/too-many-requests': 'auth_retry_later',
    'auth/user-disabled': 'auth_unavailable',
    'auth/operation-not-allowed': 'auth_unavailable',
    'auth/popup-blocked': 'auth_popup_blocked',
    'auth/popup-closed-by-user': 'auth_cancelled',
    'auth/cancelled-popup-request': 'auth_cancelled',
    'SIGN_IN_CANCELLED': 'auth_cancelled',
    'auth_expo_required': 'auth_expo_required',
    'auth_android_only': 'auth_android_only',
    'auth_google_unavailable': 'auth_google_unavailable',
  };
  return keys[code] || 'auth_failed';
}
