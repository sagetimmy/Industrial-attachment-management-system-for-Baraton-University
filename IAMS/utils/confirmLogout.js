import { Alert, Platform } from 'react-native';

export const confirmLogout = (logoutFn) => {
  if (Platform.OS === 'web') {
    if (window.confirm('Are you sure you want to logout?')) {
      logoutFn();
    }
  } else {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logoutFn },
    ]);
  }
};