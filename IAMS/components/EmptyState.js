import { View, Text, StyleSheet } from 'react-native';

/**
 * Reusable Empty State Component
 * Shows when there's no data to display
 */
export default function EmptyState({
  icon = '📦',
  title = 'No Data',
  message = 'Nothing to show here',
  style = {},
}) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#444444',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});
