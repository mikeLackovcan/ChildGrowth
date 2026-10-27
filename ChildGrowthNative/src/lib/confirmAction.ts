import { Alert, Platform } from 'react-native';

export function confirmAction(message: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm(message));
  return new Promise(resolve => Alert.alert('', message, [
    { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
    { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
