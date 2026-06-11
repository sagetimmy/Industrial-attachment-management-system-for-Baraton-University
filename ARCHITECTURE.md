# Industrial Attachment Management System (IAMS) - Architecture Diagram

## System Overview

The Industrial Attachment Management System is a mobile-first platform for managing student industrial attachments at the University of Eastern Africa, Baraton. It connects students, supervisors, host organizations, and administrators in a centralized system.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IAMS - System Architecture                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Mobile App)                          │
│                           React Native + Expo                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST API
                                    │ JWT Authentication
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND (API Server)                          │
│                              Node.js + Express                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Supabase Client
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE (Supabase/PostgreSQL)                   │
│                         Row Level Security (RLS) Enabled                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IAMS (React Native)                            │
└─────────────────────────────────────────────────────────────────────────────┘

App.js (Entry Point)
│
├── NavigationContainer
│   └── RootNavigator (Role-based routing)
│       ├── Auth Stack (Login, Register, Verify, Forgot Password)
│       ├── Student Stack
│       ├── Supervisor Stack
│       ├── Admin Stack
│       └── Host Org Drawer Navigator
│
├── Context Providers
│   ├── AuthProvider (Authentication state, token management)
│   └── ThemeProvider (Theming)
│
├── API Layer
│   └── api/axios.js (HTTP client with retry logic, base URL detection)
│
├── Screens (by role)
│   ├── auth/ (LoginScreen, RegisterScreen, VerifyScreen, ForgotPasswordScreen)
│   ├── student/ (StudentDashboard, ApplyScreen, LogbookScreen, ProfileScreen, etc.)
│   ├── supervisor/ (SupervisorDashboard, MyStudentsScreen, ReviewLogbooksScreen, etc.)
│   ├── admin/ (AdminDashboard, ManageUsersScreen, ManageAttachments, Reports, etc.)
│   ├── hostorg/ (HostDashboard, HostSlots, HostEvaluation, HostApplicants, etc.)
│   └── shared/ (NotificationsScreen, LogbookDetailScreen, PrivacyPolicyScreen)
│
├── Components
│   ├── CustomDrawerContent
│   ├── Spinner
│   └── (Other UI components)
│
├── Hooks
│   └── Custom React hooks
│
├── Utils
│   └── Utility functions
│
└── Constants
    └── App constants
```

## Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend (Node.js/Express)                         │
└─────────────────────────────────────────────────────────────────────────────┘

server.js (Entry Point)
│
├── Middleware
│   ├── CORS (Cross-origin resource sharing)
│   ├── express.json() (JSON body parser)
│   ├── /uploads (Static file serving)
│   ├── auth.middleware.js (JWT verification, role authorization)
│   └── rateLimiter.js (Rate limiting)
│
├── Routes (API Endpoints)
│   ├── /api/auth (Authentication)
│   │   ├── POST /register (Create user, send verification email)
│   │   ├── POST /verify (Email verification)
│   │   ├── POST /resend-code (Resend verification code)
│   │   ├── POST /login (Login, issue tokens)
│   │   ├── POST /refresh (Refresh access token)
│   │   ├── POST /logout (Logout)
│   │   ├── POST /forgot-password (Initiate password reset)
│   │   ├── POST /reset-password (Complete password reset)
│   │   └── GET /me (Get current user)
│   │
│   ├── /api/students (Student operations)
│   │   ├── GET /profile (Get student profile)
│   │   ├── GET /organizations (List host organizations)
│   │   ├── POST /apply (Apply for attachment)
│   │   ├── POST /logbook (Submit logbook entry)
│   │   └── (Other student endpoints)
│   │
│   ├── /api/supervisors (Supervisor operations)
│   │   ├── GET /students (List assigned students)
│   │   ├── GET /logbooks (Review student logbooks)
│   │   ├── POST /evaluations (Submit evaluations)
│   │   └── (Other supervisor endpoints)
│   │
│   ├── /api/admin (Admin operations)
│   │   ├── GET /dashboard (Admin dashboard stats)
│   │   ├── GET /users (List all users)
│   │   ├── POST /users (Create user)
│   │   ├── PUT /users/:id (Update user)
│   │   ├── DELETE /users/:id (Delete user)
│   │   ├── GET /attachments (List attachments)
│   │   ├── PUT /attachments/:id/status (Update attachment status)
│   │   ├── POST /assign-supervisor (Assign supervisor to student)
│   │   ├── GET /permissions (Get role permissions)
│   │   ├── PUT /permissions (Update role permissions)
│   │   └── (Other admin endpoints)
│   │
│   ├── /api/host-orgs (Host organization operations)
│   │   ├── GET /profile (Get org profile)
│   │   ├── PUT /profile (Update org profile)
│   │   ├── GET /vacancies (List org vacancies)
│   │   ├── POST /vacancies (Create vacancy)
│   │   ├── PUT /vacancies/:id (Update vacancy)
│   │   ├── DELETE /vacancies/:id (Delete vacancy)
│   │   ├── GET /applicants (List applicants)
│   │   ├── POST /applications/:id/respond (Respond to application)
│   │   └── (Other host org endpoints)
│   │
│   ├── /api/applications (Application operations)
│   │   ├── GET / (List applications)
│   │   ├── POST / (Create application)
│   │   ├── PUT /:id (Update application)
│   │   └── (Other application endpoints)
│   │
│   ├── /api/activities (Activity logging)
│   │   └── (Activity endpoints)
│   │
│   └── /api/notifications (Notifications)
│       ├── GET / (List user notifications)
│       ├── PUT /:id/read (Mark as read)
│       └── (Other notification endpoints)
│
├── Controllers (Business Logic)
│   └── auth.controller.js (Authentication logic)
│
├── Config
│   ├── db.js (Supabase client configuration)
│   ├── mailer.js (Email configuration with Nodemailer)
│   └── notify.js (Notification utilities)
│
└── Utils
    ├── audit.js (Audit logging)
    ├── rolePermissions.js (Role-based access control)
    ├── validators.js (Input validation)
    └── weeklyReminders.js (Scheduled reminders)
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Database (Supabase/PostgreSQL)                      │
└─────────────────────────────────────────────────────────────────────────────┘

Core Tables:
│
├── users (User accounts with authentication)
│   ├── user_id (UUID, PK)
│   ├── email (TEXT, unique)
│   ├── password (TEXT, hashed)
│   ├── role (TEXT: student, supervisor, admin, host_org)
│   ├── verify_code (TEXT, email verification code)
│   ├── verify_code_expires (TIMESTAMPTZ)
│   ├── is_verified (BOOLEAN)
│   └── created_at (TIMESTAMPTZ)
│
├── students (Student profiles)
│   ├── student_id (BIGINT, PK)
│   ├── user_id (UUID, FK → users)
│   ├── reg_number (TEXT)
│   ├── full_name (TEXT)
│   ├── phone (TEXT)
│   ├── department (TEXT)
│   ├── year_of_study (INTEGER)
│   └── created_at (TIMESTAMPTZ)
│
├── supervisors (Supervisor profiles)
│   ├── supervisor_id (BIGINT, PK)
│   ├── user_id (UUID, FK → users)
│   ├── full_name (TEXT)
│   ├── phone (TEXT)
│   ├── department (TEXT)
│   └── created_at (TIMESTAMPTZ)
│
├── host_organizations (Host organization profiles)
│   ├── org_id (BIGINT, PK)
│   ├── user_id (UUID, FK → users)
│   ├── org_name (TEXT)
│   ├── location (TEXT)
│   ├── contact_person (TEXT)
│   ├── phone (TEXT)
│   ├── available_slots (INTEGER)
│   └── created_at (TIMESTAMPTZ)
│
├── applications (Student placement applications)
│   ├── application_id (BIGSERIAL, PK)
│   ├── student_id (BIGINT, FK → students)
│   ├── org_id (BIGINT, FK → host_organizations)
│   ├── start_date (DATE)
│   ├── end_date (DATE)
│   ├── skills (TEXT)
│   ├── supporting_info (TEXT)
│   ├── status (TEXT: pending, accepted, rejected, more_info)
│   ├── response_message (TEXT)
│   ├── created_at (TIMESTAMPTZ)
│   └── responded_at (TIMESTAMPTZ)
│
├── vacancies (Host organization job postings)
│   ├── vacancy_id (BIGINT, PK)
│   ├── org_id (BIGINT, FK → host_organizations)
│   ├── role_title (VARCHAR)
│   ├── department (VARCHAR)
│   ├── available_slots (INTEGER)
│   ├── application_deadline (DATE)
│   ├── description (TEXT)
│   ├── requirements (TEXT[])
│   ├── status (TEXT: open, closed, filled)
│   ├── created_at (TIMESTAMPTZ)
│   └── updated_at (TIMESTAMPTZ)
│
├── attachments (Attachment records)
│   ├── attachment_id (BIGINT, PK)
│   ├── student_id (BIGINT, FK → students)
│   ├── supervisor_id (BIGINT, FK → supervisors)
│   ├── org_id (BIGINT, FK → host_organizations)
│   ├── start_date (DATE)
│   ├── end_date (DATE)
│   ├── status (TEXT: pending, approved, ongoing, completed, rejected)
│   └── created_at (TIMESTAMPTZ)
│
├── logbooks (Student daily logbook entries)
│   ├── logbook_id (BIGINT, PK)
│   ├── student_id (BIGINT, FK → students)
│   ├── attachment_id (BIGINT, FK → attachments)
│   ├── date (DATE)
│   ├── activities (TEXT)
│   ├── hours_worked (INTEGER)
│   ├── supervisor_review (TEXT)
│   ├── supervisor_approval (BOOLEAN)
│   └── created_at (TIMESTAMPTZ)
│
├── notifications (User notifications)
│   ├── notification_id (BIGINT, PK)
│   ├── user_id (UUID, FK → users)
│   ├── message (TEXT)
│   ├── is_read (BOOLEAN)
│   └── created_at (TIMESTAMPTZ)
│
├── audit_logs (System audit trail)
│   ├── id (BIGSERIAL, PK)
│   ├── actor_id (UUID)
│   ├── actor_email (TEXT)
│   ├── actor_role (TEXT)
│   ├── action (TEXT)
│   ├── entity (TEXT)
│   ├── entity_id (TEXT)
│   ├── description (TEXT)
│   ├── metadata (JSONB)
│   ├── ip_address (TEXT)
│   └── created_at (TIMESTAMPTZ)
│
├── role_permissions (Admin-configurable permissions)
│   ├── role (TEXT, PK)
│   ├── permissions (JSONB)
│   └── updated_at (TIMESTAMPTZ)
│
└── refresh_tokens (JWT refresh tokens)
    ├── token_id (BIGSERIAL, PK)
    ├── user_id (UUID, FK → users)
    ├── token (TEXT)
    ├── expires_at (TIMESTAMPTZ)
    └── created_at (TIMESTAMPTZ)
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Authentication Flow                                │
└─────────────────────────────────────────────────────────────────────────────┘

Registration Flow:
1. User submits registration form (email, password, role, profile data)
2. Backend creates user record with unverified status
3. Backend generates 6-digit verification code
4. Backend sends verification email via Nodemailer
5. User enters verification code
6. Backend verifies code and marks user as verified
7. Backend issues JWT access token (15min) and refresh token (7 days)
8. Frontend stores tokens (AsyncStorage/mobile, localStorage/web)

Login Flow:
1. User submits email and password
2. Backend verifies credentials
3. Backend checks if user is verified
4. Backend issues JWT access token and refresh token
5. Frontend stores tokens and redirects to role-specific dashboard

Token Refresh Flow:
1. Access token expires (15min)
2. Frontend sends refresh token to /api/auth/refresh
3. Backend validates refresh token
4. Backend issues new access token
5. Frontend continues with new access token

Protected Routes:
- All API routes (except /api/auth/register, /api/auth/login, etc.) require JWT
- Middleware verifies token and extracts user info
- Role-based authorization checks user role
- Permission-based authorization checks specific permissions
```

## User Roles & Permissions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        User Roles & Permissions                             │
└─────────────────────────────────────────────────────────────────────────────┘

STUDENT:
  - View available host organizations and vacancies
  - Apply for industrial attachments
  - Submit daily logbook entries
  - View attachment status
  - Update profile
  - View notifications
  - Provide feedback
  Permissions: editLogbooks, exportReports, selfPlacement

SUPERVISOR:
  - View assigned students
  - Review and approve logbook entries
  - Conduct site visits
  - Submit student evaluations
  - View reports
  - Update profile
  - View notifications
  Permissions: approvePlacements, editLogbooks, exportData

ADMIN:
  - Full system access
  - Manage all users (students, supervisors, host orgs)
  - Assign supervisors to students
  - Approve/reject host organizations
  - Manage attachment statuses
  - Configure role permissions
  - View audit logs
  - Generate reports
  - All permissions by default

HOST ORGANIZATION:
  - Post and manage vacancies
  - View and respond to student applications
  - Evaluate student performance
  - Update organization profile
  - View applicants
  - View notifications
  Permissions: postPlacements, viewAnalytics, editOrgProfile
```

## Key Features by Role

```
STUDENT FEATURES:
├── Dashboard (Overview of attachment status)
├── Apply for Attachments (Browse and apply to host orgs)
├── Logbook (Daily activity logging)
├── Profile (Personal information)
├── Settings (App preferences)
├── Notifications (System alerts)
└── Feedback (Provide feedback on attachment)

SUPERVISOR FEATURES:
├── Dashboard (Overview of assigned students)
├── My Students (List and manage assigned students)
├── Review Logbooks (Approve/reject logbook entries)
├── Site Visits (Schedule and log site visits)
├── Evaluations (Submit student evaluations)
├── Reports (View attachment reports)
├── Profile (Personal information)
├── Settings (App preferences)
└── Notifications (System alerts)

ADMIN FEATURES:
├── Dashboard (System overview statistics)
├── Manage Users (CRUD for all user types)
├── Manage Attachments (View and update attachment statuses)
├── Assign Supervisors (Link supervisors to students)
├── Reports (Generate system reports)
├── Activities (View system activity logs)
├── Profile (Personal information)
├── Settings (App preferences)
└── Notifications (System alerts)

HOST ORGANIZATION FEATURES:
├── Dashboard (Overview of vacancies and applicants)
├── Vacancies (Post and manage job postings)
├── Post Vacancy (Create new vacancy)
├── Profile (Organization information)
├── Evaluation (Evaluate student performance)
├── Applicants (View and respond to applications)
└── Settings (App preferences)
```

## Technology Stack

```
FRONTEND:
├── React Native 0.83.6
├── Expo ~55.0.26
├── React Navigation 7.x (Stack, Drawer, Native Stack)
├── Axios 1.16.0 (HTTP client)
├── AsyncStorage (Token storage)
├── React Hook Form 7.75.0 (Form handling)
├── NativeWind 4.1.23 (Tailwind CSS for React Native)
├── React Native Paper 5.12.0 (UI components)
└── React Native Reanimated 4.2.1 (Animations)

BACKEND:
├── Node.js
├── Express 4.18.3
├── Supabase 2.105.4 (Database client)
├── JWT 9.0.2 (Authentication)
├── bcryptjs 2.4.3 (Password hashing)
├── Nodemailer 8.0.7 (Email sending)
├── Multer 1.4.5 (File uploads)
├── CORS 2.8.5 (Cross-origin support)
└── ws 8.20.1 (WebSocket support)

DATABASE:
├── Supabase (PostgreSQL)
├── Row Level Security (RLS)
└── Real-time subscriptions

INFRASTRUCTURE:
├── Environment variables (.env)
├── File uploads (local storage in /uploads)
└── Email service (SMTP via Nodemailer)
```

## Security Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Security Features                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Authentication:
├── JWT access tokens (15min expiration)
├── Refresh tokens (7 day expiration)
├── Password hashing with bcryptjs (salt rounds: 10)
├── Email verification required for new accounts
└── Secure token storage (AsyncStorage/localStorage)

Authorization:
├── Role-based access control (RBAC)
├── Permission-based access control (PBAC)
├── Route protection middleware
├── Row Level Security (RLS) in database
└── Admin-configurable role permissions

API Security:
├── CORS enabled for cross-origin requests
├── Rate limiting (prevent abuse)
├── Input validation
├── SQL injection prevention (Supabase parameterized queries)
└── Audit logging for sensitive operations

Data Protection:
├── Passwords never stored in plain text
├── Sensitive data in environment variables
├── File upload validation (type and size limits)
└── Audit trail for all administrative actions
```

## Data Flow Examples

```
STUDENT APPLYING FOR ATTACHMENT:
1. Student browses host organizations (GET /api/students/organizations)
2. Student submits application (POST /api/applications)
3. Backend validates data and creates application record
4. Backend sends notification to host organization
5. Host organization views application (GET /api/host-orgs/applicants)
6. Host organization responds (POST /api/host-orgs/applications/:id/respond)
7. Backend updates application status
8. Backend sends notification to student
9. Admin reviews and assigns supervisor (POST /api/admin/assign-supervisor)
10. Backend creates attachment record
11. Student receives notification of placement

STUDENT SUBMITTING LOGBOOK:
1. Student creates logbook entry (POST /api/students/logbook)
2. Backend validates and stores logbook entry
3. Supervisor reviews logbook (GET /api/supervisors/logbooks)
4. Supervisor approves/rejects with comments (PUT /api/supervisors/logbooks/:id)
5. Backend updates logbook with supervisor review
6. Student receives notification of review
```

## Environment Configuration

```
Required Environment Variables (.env):

BACKEND:
├── PORT (Server port, default: 5000)
├── HOST (Server host, default: 0.0.0.0)
├── SUPABASE_URL (Supabase project URL)
├── SUPABASE_SERVICE_ROLE_KEY (Supabase service role key)
├── JWT_SECRET (Secret for JWT signing)
├── EMAIL_USER (SMTP email username)
├── EMAIL_PASS (SMTP email password)
└── EMAIL_FROM (From email address)

FRONTEND:
└── EXPO_PUBLIC_API_URL (Backend API URL, e.g., http://192.168.1.10:5000/api)
```

## File Upload Handling

```
File Upload Flow:
1. User selects file via document picker
2. Frontend sends file via multipart/form-data
3. Multer middleware processes upload
4. File saved to /uploads directory with timestamp
5. File path stored in database
6. File accessible via /uploads static route

Supported File Types:
├── PDF (.pdf)
├── Word documents (.doc, .docx)
├── Images (.jpg, .jpeg, .png)

File Size Limit: 5MB
```

## Notification System

```
Notification Types:
├── Application status updates
├── Attachment status changes
├── Logbook review notifications
├── Supervisor assignments
├── System announcements
└── Password reset confirmations

Notification Delivery:
├── In-app notifications (stored in database)
├── Email notifications (via Nodemailer)
└── Future: Push notifications (can be added)

Notification Flow:
1. Event triggers notification
2. Backend creates notification record
3. Backend sends email if applicable
4. Frontend polls or receives real-time updates
5. User views notification in-app
6. User marks notification as read
```

## Audit Logging

```
Audited Actions:
├── User creation/deletion
├── Attachment status changes
├── Supervisor assignments
├── Permission changes
├── Role modifications
└── Other administrative actions

Audit Log Entry:
├── Actor (who performed the action)
├── Action (what was done)
├── Entity (what was affected)
├── Description (human-readable description)
├── Metadata (additional context)
├── IP Address (where the action originated)
└── Timestamp (when the action occurred)
```

## Development Workflow

```
FRONTEND DEVELOPMENT:
1. cd IAMS
2. npm install
3. Configure EXPO_PUBLIC_API_URL in .env
4. npm start (starts Expo dev server)
5. Scan QR code with Expo Go app (mobile) or open browser (web)

BACKEND DEVELOPMENT:
1. cd backend
2. npm install
3. Configure environment variables in .env
4. Run migrations in Supabase SQL editor
5. npm run dev (starts server with nodemon)
   OR npm start (starts server in production)

TESTING API:
- Use Postman, curl, or frontend app
- Base URL: http://localhost:5000/api
- Include Authorization header for protected routes
```

## Deployment Considerations

```
PRODUCTION DEPLOYMENT:

Backend:
├── Use process manager (PM2)
├── Set NODE_ENV=production
├── Use environment-specific .env file
├── Enable HTTPS
├── Configure CORS for production domain
├── Use production database (Supabase production)
├── Set up backup strategy
└── Monitor logs and performance

Frontend:
├── Build production bundle (expo build:android/ios)
├── Or deploy as web app (expo build:web)
├── Configure production API URL
├── Enable app signing
└── Submit to app stores (Google Play, Apple App Store)

Database:
├── Use Supabase production project
├── Enable RLS policies
├── Configure backup schedules
├── Monitor database performance
└── Regular security audits
```

## Future Enhancements

```
Potential Improvements:
├── Push notifications (Expo Notifications)
├── Real-time chat between students and supervisors
├── Video call integration for site visits
├── Advanced reporting and analytics
├── Document templates for logbooks
├── Offline mode support
├── Biometric authentication
├── Multi-language support
├── Integration with university SIS
└── Mobile app store deployment
```

---

**Architecture Diagram Generated:** June 11, 2026
**System:** Industrial Attachment Management System (IAMS)
**Institution:** University of Eastern Africa, Baraton
