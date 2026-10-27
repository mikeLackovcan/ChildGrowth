import i18n from '../i18n';
import { Alert, Platform } from 'react-native';
export function showMessage(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Questblox', message);
}
export function confirmAction(message: string, action: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) action();
  } else {
    Alert.alert('Questblox', message, [
      { text: i18n.t('action_cancel'), style: 'cancel' },
      { text: i18n.t('action_confirm'), style: 'destructive', onPress: action },
    ]);
  }
}
