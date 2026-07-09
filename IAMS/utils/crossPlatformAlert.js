import { Alert, Platform } from 'react-native';

/**
 * Drop-in replacement for React Native's Alert.alert that also works on web.
 * RN's Alert has no UI implementation on web (Expo web target) — calling
 * Alert.alert() there silently does nothing, which makes buttons *look*
 * broken when they're actually just failing validation with no visible
 * feedback. This falls back to window.alert / window.confirm on web.
 *
 * Usage is identical to Alert.alert(title, message, buttons):
 *   showAlert('Error', 'Please select an organization');
 *   showAlert('Confirm', 'Apply to X?', [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'Apply', onPress: () => doTheThing() },
 *   ]);
 */
export function showAlert(title, message, buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  // No buttons, or a single button (simple info alert)
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    if (buttons && buttons[0] && typeof buttons[0].onPress === 'function') {
      buttons[0].onPress();
    }
    return;
  }

  // Two-plus buttons (e.g. Cancel / Confirm) — map to window.confirm
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const confirmButton = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

  const confirmed = window.confirm(text);
  if (confirmed) {
    if (typeof confirmButton?.onPress === 'function') confirmButton.onPress();
  } else {
    if (typeof cancelButton?.onPress === 'function') cancelButton.onPress();
  }
}