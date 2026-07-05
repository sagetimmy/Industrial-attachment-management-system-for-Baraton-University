import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity } from 'react-native';
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
import StudentAnnouncementsScreen from './app/student/AnnouncementsScreen';
import StudentSiteVisitsScreen from './app/student/StudentSiteVisitsScreen';

// Supervisor screens
import SupervisorDashboard from './app/supervisor/SupervisorDashboard';
import SupervisorProfileScreen from './app/supervisor/ProfileScreen';
import MyStudentsScreen from './app/supervisor/MyStudentsScreen';
import ReviewLogbooksScreen from './app/supervisor/ReviewLogbooksScreen';
import SiteVisitsScreen from './app/supervisor/SiteVisitsScreen';
import EvaluationsScreen from './app/supervisor/EvaluationsScreen';
import ReportsScreen from './app/supervisor/ReportsScreen';
import SupervisorSettings from './app/supervisor/SupervisorSettings';
import SupervisorAnnouncementsScreen from './app/supervisor/AnnouncementsScreen';
import SupervisorEditProfileScreen from './app/supervisor/SupervisorEditProfile';

// Admin screens
import AdminDashboard from './app/admin/AdminDashboard';
import ManageUsersScreen from './app/admin/ManageUsersScreen';
import StudentsScreen from './app/admin/StudentsScreen';
import SupervisorsScreen from './app/admin/SupervisorsScreen';
import ManageOrgsScreen from './app/admin/ManageOrgsScreen';
import ManageAttachments from './app/admin/ManageAttachmentsScreen';
import AssignSupervisorsScreen from './app/admin/AssignSupervisorsScreen';
import Reports from './app/admin/Reports';
import OrgDetailsScreen from './app/admin/OrgDetailsScreen';
import UserDetailScreen from './app/admin/UserDetail';
import StudentDetailScreen from './app/admin/StudentDetailScreen';
import AdminSettings from './app/admin/AdminSettings';
import AdminProfile from './app/admin/AdminProfile';
import AdminActivities from './app/admin/AdminActivities';
import AddUserScreen from './app/admin/AddUserScreen';
import ManageAdminsScreen from './app/admin/ManageAdminsScreen';
import AddAdminScreen from './app/admin/AddAdminScreen';
import AdminAnnouncementsScreen from './app/admin/AnnouncementsScreen';
import SupervisorDetailScreen from './app/admin/SupervisorDetailScreen';
import ManageSupervisorsScreen from './app/admin/ManageSupervisorsScreen';

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
  <PlaceholderView route={route} />
);

const PlaceholderView = ({ route }) => {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F4', paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 10 }}>🚧</Text>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' }}>{route.name}</Text>
      <Text style={{ fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' }}>
        This screen is not implemented yet.
      </Text>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: 20, backgroundColor: '#1E3A5F', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const FullScreenLoader = () => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <Spinner size="large" color={theme.primary} />
    </View>
  );
};

const UnsupportedRoleScreen = ({ route }) => {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const role = route.params?.role;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, padding: 24 }}>
      <Text style={{ fontSize: 28, marginBottom: 12 }}>⚠️</Text>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.secondary, textAlign: 'center' }}>
        Unsupported account role
      </Text>
      <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
        This account is configured as {role || 'unknown'}, which does not match any available app experience.
      </Text>
      <Text onPress={logout} style={{ marginTop: 20, color: theme.primary, fontWeight: 'bold' }}>
        Sign out
      </Text>
    </View>
  );
};

// ── Host Org Drawer Navigator ─────────────────────────────────────────────────
function HostOrgDrawerNavigator({ route }) {
  const { logout } = useAuth();
  const orgData = route.params?.orgData;

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent {...props} org={orgData} onLogout={logout} />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <Drawer.Screen name="HostDashboard"  component={HostDashboard}      options={{ title: 'Dashboard'    }} />
      <Drawer.Screen name="HostSlots"      component={HostSlots}          options={{ title: 'Vacancies'    }} />
      <Drawer.Screen name="PostVacancy"    component={PostVacancyScreen}  options={{ title: 'Post Vacancy' }} />
      <Drawer.Screen name="HostProfile"    component={HostProfile}        options={{ title: 'Profile'      }} />
      <Drawer.Screen name="HostSettings"   component={HostSettings}       options={{ title: 'Settings'     }} />
      <Drawer.Screen name="HostEvaluation" component={HostEvaluation}     options={{ title: 'Evaluation'   }} />
      <Drawer.Screen name="HostApplicants" component={HostApplicants}     options={{ title: 'Applicants'   }} />
    </Drawer.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login"          component={LoginScreen}          />
        <Stack.Screen name="Register"       component={RegisterScreen}       />
        <Stack.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen}  />
        <Stack.Screen name="Verify"         component={VerifyScreen}         />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'student') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="StudentDashboard" component={StudentDashboard}           />
        <Stack.Screen name="Apply"            component={ApplyScreen}                />
        <Stack.Screen name="Logbook"          component={LogbookScreen}              />
        <Stack.Screen name="SiteVisits"       component={StudentSiteVisitsScreen}           />
        <Stack.Screen name="LogbookDetail"    component={LogbookDetailScreen}        />
        <Stack.Screen name="Stats"            component={PlaceholderScreen}          />
        <Stack.Screen name="Reports"          component={PlaceholderScreen}          />
        <Stack.Screen name="Profile"          component={ProfileScreen}              />
        <Stack.Screen name="StudentSettings"  component={StudentSettings}            />
        <Stack.Screen name="Notifications"    component={NotificationsScreen}        />
        <Stack.Screen name="Feedback"         component={FeedbackScreen}             />
        <Stack.Screen name="PrivacyPolicy"    component={PrivacyPolicyScreen}        />
        <Stack.Screen name="Announcements"    component={StudentAnnouncementsScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'supervisor') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SupervisorDashboard" component={SupervisorDashboard}         />
        <Stack.Screen name="Profile"             component={SupervisorProfileScreen}      />
        <Stack.Screen name="SupervisorEditProfile" component={SupervisorEditProfileScreen} />
        <Stack.Screen name="MyStudents"          component={MyStudentsScreen}             />
        <Stack.Screen name="ReviewLogbooks"      component={ReviewLogbooksScreen}         />
        <Stack.Screen name="LogbookDetail"       component={LogbookDetailScreen}          />
        <Stack.Screen name="SiteVisits"          component={SiteVisitsScreen}             />
        <Stack.Screen name="Evaluations"         component={EvaluationsScreen}            />
        <Stack.Screen name="Reports"             component={ReportsScreen}                />
        <Stack.Screen name="StudentDetail"       component={PlaceholderScreen}            />
        <Stack.Screen name="Notifications"       component={NotificationsScreen}          />
        <Stack.Screen name="SupervisorSettings"  component={SupervisorSettings}           />
        <Stack.Screen name="PrivacyPolicy"       component={PrivacyPolicyScreen}          />
        <Stack.Screen name="Announcements"       component={SupervisorAnnouncementsScreen} />
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

  if (user.role === 'admin') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Core */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />

        {/* User management */}
        <Stack.Screen name="ManageUsers"  component={ManageUsersScreen} />
        <Stack.Screen name="Students"     component={StudentsScreen}    />
        <Stack.Screen name="Supervisors"  component={SupervisorsScreen} />
        <Stack.Screen name="ManageOrgs"   component={ManageOrgsScreen}  />

        {/* Add screens — role-specific */}
        <Stack.Screen name="AddUser"       component={AddUserScreen} />
        <Stack.Screen name="AddStudent"    component={AddUserScreen} initialParams={{ defaultRole: 'student'    }} />
        <Stack.Screen name="AddSupervisor" component={AddUserScreen} initialParams={{ defaultRole: 'supervisor' }} />
        <Stack.Screen name="AddOrg"        component={AddUserScreen} initialParams={{ defaultRole: 'host_org'   }} />
        <Stack.Screen name="AddAdmin"      component={AddAdminScreen} />

        {/* Attachments & assignments */}
        <Stack.Screen name="ManageAttachments" component={ManageAttachments}       />
        <Stack.Screen name="AssignSupervisor"  component={AssignSupervisorsScreen} />
        <Stack.Screen name="AssignSupervisors" component={AssignSupervisorsScreen} />

        {/* Detail screens */}
        <Stack.Screen name="UserDetail"       component={UserDetailScreen}  />
        <Stack.Screen name="OrgDetails"       component={OrgDetailsScreen}  />
        <Stack.Screen name="OrgDetail"        component={OrgDetailsScreen}  />
        <Stack.Screen name="OrgVacancies"     component={PlaceholderScreen} />
        <Stack.Screen name="StudentDetail"    component={StudentDetailScreen} />
        <Stack.Screen name="SupervisorDetail" component={SupervisorDetailScreen} />
        <Stack.Screen name="AssignStudent"    component={PlaceholderScreen} />
        <Stack.Screen name="ManageSupervisors" component={ManageSupervisorsScreen} />

        {/* Other admin */}
        <Stack.Screen name="Reports"              component={Reports}                   />
        <Stack.Screen name="AdminProfile"         component={AdminProfile}              />
        <Stack.Screen name="Settings"             component={AdminSettings}             />
        <Stack.Screen name="AdminActivities"      component={AdminActivities}           />
        <Stack.Screen name="ManageAdmins"         component={ManageAdminsScreen}        />
        <Stack.Screen name="Notifications"        component={NotificationsScreen}       />
        <Stack.Screen name="AdminAnnouncements"   component={AdminAnnouncementsScreen}  />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UnsupportedRole" component={UnsupportedRoleScreen} initialParams={{ role: user.role }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}