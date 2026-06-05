import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text } from 'react-native';
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
import StudentSettings from './app/student/StudentSettings';
import NotificationsScreen from './app/shared/NotificationsScreen';
import LogbookDetailScreen from './app/shared/LogbookDetailScreen';
import PrivacyPolicyScreen from './app/shared/PrivacyPolicyScreen';

// Student screens
import StudentDashboard from './app/student/StudentDashboard';
import ApplyScreen from './app/student/ApplyScreen';

// Supervisor screens
import SupervisorDashboard from './app/supervisor/SupervisorDashboard';
import SupervisorProfileScreen from './app/supervisor/ProfileScreen';
import MyStudentsScreen from './app/supervisor/MyStudentsScreen';
import ReviewLogbooksScreen from './app/supervisor/ReviewLogbooksScreen';
import SiteVisitsScreen from './app/supervisor/SiteVisitsScreen';
import EvaluationsScreen from './app/supervisor/EvaluationsScreen';
import ReportsScreen from './app/supervisor/ReportsScreen';
import SupervisorSettings from './app/supervisor/SupervisorSettings';

// Admin screens
import ManageUsersScreen from './app/admin/ManageUsersScreen';
import AssignSupervisorsScreen from './app/admin/AssignSupervisorsScreen';
import AdminDashboard from './app/admin/AdminDashboard';
import ManageAttachments from './app/admin/ManageAttachments';
import Reports from './app/admin/Reports';
import OrgDetailsScreen from './app/admin/OrgDetailsScreen';
import UserDetailScreen from './app/admin/UserDetail';
import AdminSettings from './app/admin/AdminSettings';
import AdminProfile from './app/admin/AdminProfile';
import AdminActivities from './app/admin/AdminActivities';
// Host Org screens
import HostDashboard from './app/hostorg/HostDashboard';
import HostProfile from './app/hostorg/HostProfile';
import HostSlots from './app/hostorg/HostSlots';
import HostEvaluation from './app/hostorg/HostEvaluation';
import HostApplicants from './app/hostorg/HostApplicants';
import PostVacancyScreen from './app/hostorg/PostVacancyScreen';
import HostSettings from './app/hostorg/HostSettings';

// Custom drawer
import CustomDrawerContent from './components/CustomDrawerContent';
import Spinner from './components/Spinner';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

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
      <Spinner size="large" color={theme.primary} />
    </View>
  );
};

// ── Host Org Drawer Navigator ─────────
function HostOrgDrawerNavigator({ route }) {
  const { logout } = useAuth();
  const orgData = route.params?.orgData;

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          org={orgData}
          onLogout={logout}
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <Drawer.Screen
        name="HostDashboard"
        component={HostDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Drawer.Screen
        name="HostSlots"
        component={HostSlots}
        options={{ title: 'Vacancies' }}
      />
      <Drawer.Screen
        name="PostVacancy"
        component={PostVacancyScreen}
        options={{ title: 'Post Vacancy' }}
      />
      <Drawer.Screen
        name="HostProfile"
        component={HostProfile}
        options={{ title: 'Profile' }}
      />
      <Drawer.Screen
        name="HostSettings"
        component={HostSettings}
        options={{ title: 'Settings' }}
      />
      <Drawer.Screen
        name="HostEvaluation"
        component={HostEvaluation}
        options={{ title: 'Evaluation' }}
      />
      <Drawer.Screen
        name="HostApplicants"
        component={HostApplicants}
        options={{ title: 'Applicants' }}
      />
    </Drawer.Navigator>
  );
}

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
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
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
        <Stack.Screen name="LogbookDetail" component={LogbookDetailScreen} />
        <Stack.Screen name="Stats" component={PlaceholderScreen} />
        <Stack.Screen name="Reports" component={PlaceholderScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="StudentSettings" component={StudentSettings} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'supervisor') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SupervisorDashboard" component={SupervisorDashboard} />
        <Stack.Screen name="Profile" component={SupervisorProfileScreen} />
        <Stack.Screen name="MyStudents" component={MyStudentsScreen} />
        <Stack.Screen name="ReviewLogbooks" component={ReviewLogbooksScreen} />
        <Stack.Screen name="LogbookDetail" component={LogbookDetailScreen} />
        <Stack.Screen name="SiteVisits" component={SiteVisitsScreen} />
        <Stack.Screen name="Evaluations" component={EvaluationsScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="StudentDetail" component={PlaceholderScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="SupervisorSettings" component={SupervisorSettings} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'host_org') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="HostOrgDrawer"
          component={HostOrgDrawerNavigator}
          initialParams={{ orgData: user }}
        />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
      <Stack.Screen name="ManageAttachments" component={ManageAttachments} />
      <Stack.Screen name="AssignSupervisor" component={AssignSupervisorsScreen} />
      <Stack.Screen name="AssignSupervisors" component={AssignSupervisorsScreen} />
      <Stack.Screen name="ManageSupervisors" component={PlaceholderScreen} />
      <Stack.Screen name="ManageOrgs" component={PlaceholderScreen} />
      <Stack.Screen name="AdminProfile" component={AdminProfile} />
      <Stack.Screen name="Settings" component={AdminSettings} />
      <Stack.Screen name="AdminActivities" component={AdminActivities} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} />
      <Stack.Screen name="Reports" component={Reports} />
      <Stack.Screen name="OrgDetails" component={OrgDetailsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
