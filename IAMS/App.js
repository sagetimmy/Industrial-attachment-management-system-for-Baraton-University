import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './context/AuthContext';
import { View, Text } from 'react-native';

// Auth screens
import LoginScreen from './app/auth/LoginScreen';
import RegisterScreen from './app/auth/RegisterScreen';
import VerifyScreen from './app/auth/VerifyScreen';

// Student screens
import StudentDashboard from './app/student/StudentDashboard';

// Supervisor screens
import SupervisorDashboard from './app/supervisor/SupervisorDashboard';

// Placeholder for screens not built yet
const PlaceholderScreen = ({ route }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F4' }}>
    <Text style={{ fontSize: 40, marginBottom: 10 }}>🚧</Text>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' }}>{route.name}</Text>
    <Text style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Coming Soon</Text>
  </View>
);

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">

          {/* Auth */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Verify" component={VerifyScreen} />

          {/* Student */}
          <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
          <Stack.Screen name="Apply" component={PlaceholderScreen} />
          <Stack.Screen name="Logbook" component={PlaceholderScreen} />
          <Stack.Screen name="Profile" component={PlaceholderScreen} />
          <Stack.Screen name="Notifications" component={PlaceholderScreen} />

          {/* Supervisor */}
          <Stack.Screen name="SupervisorDashboard" component={SupervisorDashboard} />
          <Stack.Screen name="MyStudents" component={PlaceholderScreen} />
          <Stack.Screen name="ReviewLogbooks" component={PlaceholderScreen} />
          <Stack.Screen name="SiteVisits" component={PlaceholderScreen} />
          <Stack.Screen name="Evaluations" component={PlaceholderScreen} />
          <Stack.Screen name="StudentDetail" component={PlaceholderScreen} />

          {/* Host Org */}
          <Stack.Screen name="HostDashboard" component={PlaceholderScreen} />

          {/* Admin */}
          <Stack.Screen name="AdminDashboard" component={PlaceholderScreen} />

        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}