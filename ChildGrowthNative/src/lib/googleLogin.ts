import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
import googleServices from '../../google-services.json';

export async function requestGoogleTokens(): Promise<{ idToken: string; accessToken?: string } | null> {
  if (Platform.OS === 'web') {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.idToken) throw new Error('auth_google_unavailable');
    return { idToken: credential.idToken, accessToken: credential.accessToken };
  }

  if (Constants.appOwnership === 'expo') {
    throw new Error('auth_expo_required');
  }
  if (Platform.OS !== 'android') {
    throw new Error('auth_android_only');
  }

  const clients = googleServices.client.flatMap(client => client.oauth_client);
  const webClientId = clients.find(client => client.client_type === 3)?.client_id;
  if (!webClientId?.startsWith('814466475791-')) {
    throw new Error('auth_google_unavailable');
  }

  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  if (!response.data.idToken) throw new Error('auth_google_unavailable');
  return { idToken: response.data.idToken };
}

/** Clear the native Google session so the next sign-in offers an account chooser. */
export async function signOutGoogleSession(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Firebase sign-out must still complete when Google has no cached native session.
  }
}
