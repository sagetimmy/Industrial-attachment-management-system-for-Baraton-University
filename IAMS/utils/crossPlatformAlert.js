import { Alert, Platform } from 'react-native';
export function showAlert(title, message, buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    if (buttons && buttons[0] && typeof buttons[0].onPress === 'function') {
      buttons[0].onPress();
    }
    return;
  }
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const confirmButton = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

  const confirmed = window.confirm(text);
  if (confirmed) {
    if (typeof confirmButton?.onPress === 'function') confirmButton.onPress();
  } else {
    if (typeof cancelButton?.onPress === 'function') cancelButton.onPress();
  }
}