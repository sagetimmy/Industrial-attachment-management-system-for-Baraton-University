import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Text } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';


// Auth screens
import LoginScreen from './app/auth/LoginScreen';
import RegisterScreen from './app/auth/RegisterScreen';
import VerifyScreen from './app/auth/VerifyScreen';
import ForgotPasswordScreen from './app/auth/ForgotPasswordScreen';
import LogbookScreen from './app/student/LogbookScreen';
import FeedbackScreen from './app/student/FeedbackScreen';
import ProfileScreen from './app/student/ProfileScreen';

// Student screens
import StudentDashboard from './app/student/StudentDashboard';
import ApplyScreen from './app/student/ApplyScreen';

// Supervisor screens
import SupervisorDashboard from './app/supervisor/SupervisorDashboard';

// Admin screens
import ManageUsersScreen from './app/admin/ManageUsersScreen';
import AssignSupervisorsScreen from './app/admin/AssignSupervisorsScreen';
import AdminDashboard from './app/admin/AdminDashboard';
import ManageAttachments from './app/admin/ManageAttachments';
import Reports from './app/admin/Reports';
import OrgDetailsScreen from './app/admin/OrgDetailsScreen';

// Host Org screens
import HostDashboard from './app/hostorg/HostDashboard';
import HostProfile from './app/hostorg/HostProfile';
import HostSlots from './app/hostorg/HostSlots';
import HostEvaluation from './app/hostorg/HostEvaluation';

const Stack = createNativeStackNavigator();

const PlaceholderScreen = ({ route }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F4' }}>
    <Text style={{ fontSize: 40, marginBottom: 10 }}>🚧</Text>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' }}>{route.name}</Text>
    <Text style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Coming Soon</Text>
  </View>
);

const FullScreenLoader = () => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
};

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Verify" component={VerifyScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'student') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
        <Stack.Screen name="Apply" component={ApplyScreen} />
        <Stack.Screen name="Logbook" component={LogbookScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Notifications" component={PlaceholderScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'supervisor') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SupervisorDashboard" component={SupervisorDashboard} />
        <Stack.Screen name="MyStudents" component={PlaceholderScreen} />
        <Stack.Screen name="ReviewLogbooks" component={PlaceholderScreen} />
        <Stack.Screen name="SiteVisits" component={PlaceholderScreen} />
        <Stack.Screen name="Evaluations" component={PlaceholderScreen} />
        <Stack.Screen name="StudentDetail" component={PlaceholderScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'host_org') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HostDashboard" component={HostDashboard} />
        <Stack.Screen name="HostProfile" component={HostProfile} />
        <Stack.Screen name="HostSlots" component={HostSlots} />
        <Stack.Screen name="HostEvaluation" component={HostEvaluation} />
        <Stack.Screen name="Notifications" component={PlaceholderScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
      <Stack.Screen name="ManageAttachments" component={ManageAttachments} />
      <Stack.Screen name="AssignSupervisors" component={AssignSupervisorsScreen} />
      <Stack.Screen name="Reports" component={Reports} />
      <Stack.Screen name="OrgDetails" component={OrgDetailsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
