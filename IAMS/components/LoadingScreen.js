import { View, Text, StyleSheet } from 'react-native';
import Spinner from './Spinner';

export default function LoadingScreen({
  message = 'Loading...',
  color = '#C87941',
}) {
  return (
    <View style={styles.container}>
      <Spinner size="large" color={color} />
      <Text style={[styles.message, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
