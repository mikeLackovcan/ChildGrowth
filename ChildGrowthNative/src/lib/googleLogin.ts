import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
import googleServices from '../../google-services.json';

export async function requestGoogleTokens(): Promise<{ idToken: string; accessToken?: string } | null> {
  if (Platform.OS === 'web') {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.idToken) throw new Error('Google did not return an ID token.');
    return { idToken: credential.idToken, accessToken: credential.accessToken };
  }

  if (Constants.appOwnership === 'expo') {
    throw new Error('Google sign-in needs the Quest Champ Android app, not Expo Go. You can continue as a guest.');
  }
  if (Platform.OS !== 'android') {
    throw new Error('Google sign-in is currently configured for Android only.');
  }

  const clients = googleServices.client.flatMap(client => client.oauth_client);
  const webClientId = clients.find(client => client.client_type === 3)?.client_id;
  if (!webClientId?.startsWith('814466475791-')) {
    throw new Error('Quest Champ Google configuration is missing.');
  }

  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  if (!response.data.idToken) throw new Error('Google did not return an ID token.');
  return { idToken: response.data.idToken };
}
