# MediRemind - Project Overview Documentation

## 1. Project Title

**MediRemind** - Your Personal Health Companion

---

## 2. Project Overview

MediRemind is a cross-platform mobile application designed to help patients manage their medications, track doses, and connect with healthcare providers. The app supports dual user roles (Doctor and Patient), enabling a complete healthcare management ecosystem where doctors can prescribe medications, manage patients, and schedule appointments, while patients can track their daily medication intake, view prescriptions, and communicate with their doctors.

The application emphasizes a **freemium model** with core features available for free and premium features (unlimited medications, cloud sync, analytics, family care) available through Stripe-powered subscriptions.

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native (Expo SDK 54) |
| **Language** | TypeScript |
| **Navigation** | Expo Router v6 (file-based routing) |
| **UI Components** | React Native core, Expo Linear Gradient, SVG |
| **State Management** | React Context API (AuthContext, ThemeContext) |
| **Local Storage** | AsyncStorage |
| **Backend/Database** | Firebase (Firestore, Auth) via REST API |
| **Authentication** | Firebase Auth (Email/Password, Google Sign-In) |
| **Payments** | Stripe (@stripe/stripe-react-native) |
| **Notifications** | expo-notifications (Push + Local) |
| **Ads** | Google Mobile Ads (Banner + Interstitial) |
| **Build/Deploy** | EAS Build (eas.json), Expo Dev Client |
| **Icons** | Ionicons (@expo/vector-icons) |

---

## 4. Features List

### Core Features
- **Medication Management** - Add, edit, delete, and track medications with dosage, timing, and duration
- **Dose Tracking** - Record taken/missed doses with daily progress visualization
- **Push Notifications** - Scheduled medication reminders and refill alerts
- **Prescription Management** - Doctors create shared prescriptions; patients view and accept them
- **Doctor-Patient Connection** - Search, invite, and connect with healthcare providers
- **Appointment Booking** - Patients book appointments; doctors manage schedules
- **Dark/Light Theme** - Full theme support with automatic system detection
- **Offline Support** - Local data persistence with sync queue for later cloud sync

### Premium Features
- **Unlimited Medications** (Free tier: 5 medication limit)
- **Advanced Analytics** - Adherence rates, health reports
- **Cloud Backup & Sync** - Data synced across devices via Firestore
- **Family Care** - Manage medications for up to 5 family members
- **Data Export** - PDF reports for doctor visits
- **Unlimited History** (Free tier: 30-day limit)
- **Refill Alerts** - Automated supply tracking
- **Ad-Free Experience** (Free tier shows banner + interstitial ads)

### Doctor-Specific Features
- **Doctor Dashboard** - Stats overview, pending requests, recent patients
- **Patient Management** - View connected patients, accept/reject requests
- **Prescription Creation** - Create detailed prescriptions with medications, notes, and diagnosis
- **Invitation System** - Send email invitations to patients not yet registered
- **Appointment Management** - View and confirm patient appointments

---

## 5. User Roles

### Patient
- Registers with personal info (name, email, phone, DOB, gender, blood group, emergency contact)
- Adds and tracks medications
- Connects with doctors via email search
- Books appointments with connected doctors
- Views prescriptions shared by doctors
- Tracks daily dose intake with progress ring

### Doctor
- Registers with medical credentials (license number, specialty, qualifications, clinic info)
- Views dashboard with patient stats
- Accepts/rejects patient connection requests
- Creates and shares prescriptions with patients
- Sends email invitations to patients
- Manages appointment schedule

---

## 6. Full User Flow

### Patient Flow

```
Launch App
    |
    v
Role Selection (Doctor / Patient)
    |
    v
Sign Up (Email + Profile Details)
    |
    v
Home Screen (Daily Progress Ring + Today's Schedule)
    |
    +---> Add Medication
    |         |
    |         v
    |     Medication Form (Name, Dosage, Times, Duration, Supply)
    |         |
    |         v
    |     Medication Saved + Synced to Cloud
    |
    +---> My Doctor
    |         |
    |         v
    |     Search Doctor by Email
    |         |
    |         v
    |     Connection Request Sent
    |         |
    |         v
    |     View Connected Doctors
    |         |
    |         v
    |     Book Appointment
    |
    +---> History / Family Care
    |         |
    |         v
    |     View Medication History
    |         (Premium: Family member management)
    |
    +---> Calendar (Premium)
    |         |
    |         v
    |     View Monthly Medication Schedule
    |
    +---> Analytics (Premium)
    |         |
    |         v
    |     Adherence Reports & Insights
    |
    +---> Profile
              |
              v
          Edit Profile / Settings / Premium Upgrade
```

### Doctor Flow

```
Launch App
    |
    v
Role Selection (Doctor)
    |
    v
Sign Up (Medical Credentials + Clinic Info)
    |
    v
Doctor Dashboard
    |
    +---> My Patients
    |         |
    |         v
    |     View All Connected Patients
    |         |
    |         v
    |     Accept/Reject Pending Requests
    |
    +---> Prescriptions
    |         |
    |         v
    |     Create New Prescription
    |         |
    |         v
    |     Add Medications, Notes, Diagnosis
    |         |
    |         v
    |     Share with Patient
    |
    +---> Appointments
    |         |
    |         v
    |     View/Confirm Appointments
    |
    +---> Profile
              |
              v
          Edit Profile / Settings
```

### Authentication Flow

```
App Launch
    |
    v
Check Existing User (AsyncStorage)
    |
    +-- User Found ---> Redirect to Home (Tabs)
    |
    +-- No User ---> Auth Screen
                        |
                        v
                    Role Selection
                        |
            +-----------+-----------+
            |                       |
            v                       v
        Patient Signup          Doctor Signup
            |                       |
            v                       v
        Fill Profile Form      Fill Medical Form
            |                       |
            v                       v
        Firebase Auth (REST API)
            |
            v
        Create Firestore Profile
            |
            v
        Check Pending Invitations (Patient only)
            |
            v
        Redirect to Home (Tabs)
```

---

## 7. Screen-wise Breakdown

### Auth Screens
| Screen | Path | Description |
|--------|------|-------------|
| Role Selection | `auth/index.tsx` | Choose between Doctor and Patient registration |
| Login | `auth/login.tsx` | Email/password login with Google Sign-In option and forgot password |
| Patient Signup | `auth/signup/patient.tsx` | Multi-step patient registration with personal + medical info |
| Doctor Signup | `auth/signup/doctor.tsx` | Doctor registration with license, specialty, qualifications |

### Tab Screens (Patient)
| Screen | Path | Description |
|--------|------|-------------|
| Home | `(tabs)/index.tsx` | Daily progress ring, quick actions, today's medication schedule |
| Calendar | `(tabs)/calendar/index.tsx` | Monthly calendar view of medications (Premium only) |
| Analytics | `(tabs)/analytics/index.tsx` | Adherence analytics and health reports (Premium only) |
| My Doctor | `(tabs)/prescriptions/index.tsx` | Search/add doctors, view connections, book appointments |
| History | `(tabs)/history/index.tsx` | Medication history log (Free: 30 days, Premium: unlimited) |
| Profile | `(tabs)/profile/index.tsx` | Edit profile, settings, theme toggle, premium status |

### Tab Screens (Doctor)
| Screen | Path | Description |
|--------|------|-------------|
| Dashboard | `(tabs)/index.tsx` | Stats cards, pending requests, recent patients, quick actions |
| My Patients | `(tabs)/history/index.tsx` | Full patient list with connection management |
| Prescriptions | `(tabs)/prescriptions/index.tsx` | List of created prescriptions with create/delete |
| Profile | `(tabs)/profile/index.tsx` | Edit doctor profile and settings |

### Other Screens
| Screen | Path | Description |
|--------|------|-------------|
| Add Medication | `medications/add.tsx` | Form to add/edit a medication with timing, supply, reminders |
| Prescription Detail | `(tabs)/prescriptions/[id].tsx` | View full prescription details |
| Pending Prescriptions | `(tabs)/prescriptions/pending.tsx` | View prescriptions shared by doctors |
| Create Prescription | `(tabs)/prescriptions/create.tsx` | Doctor form to create new prescription |
| Refills | `refills/index.tsx` | Medication refill tracking and alerts |
| Premium | `premium.tsx` | Subscription plans (Monthly/Yearly/Lifetime) with Stripe |
| Settings | `settings/index.tsx` | App settings, account management |
| Family Settings | `settings/family.tsx` | Family care member management |
| Doctor Detail | `doctor/[id].tsx` | View doctor profile and details |
| Patient Detail | `patient/[id].tsx` | Doctor view of patient profile |
| History View | `history/view.tsx` | Detailed medication history log |
| Appointments | `appointments/index.tsx` | Appointment management screen |

---

## 8. Core Functionalities

### Medication Management
Medications are stored locally in AsyncStorage and synced to Firestore via REST API. Each medication includes name, dosage, scheduled times, duration, color coding, refill tracking, and reminder preferences. The system enforces a **5-medication limit** for free users, prompting upgrade when approaching the limit.

**Key file:** `utils/storage.ts` - CRUD operations for medications with automatic cloud sync via `syncOrQueue()`.

### Dose Tracking & Progress
The home screen displays a circular animated progress ring showing daily completion percentage. Doses are recorded with timestamps, and the supply count is automatically decremented when a dose is marked as taken.

**Key file:** `app/(tabs)/index.tsx:81-140` - `CircularProgress` component with SVG animation.

### Cloud Sync (Offline-First)
The app uses an offline-first architecture. All data changes are stored locally first, then synced to Firestore when online. If offline, changes are queued in AsyncStorage and synced when connectivity is restored.

**Key files:** `utils/firebase.ts` - REST API-based Firestore operations; `utils/offlineSync.ts` - Sync queue management.

### Doctor-Patient Connections
Doctors can search patients by email, phone, or name via Firestore queries. Connection requests require doctor approval. Invitations can be sent to unregistered patients, who are auto-connected upon signup.

**Key file:** `utils/connections.ts` - Connection/invitation CRUD with Firestore REST API.

### Prescription Sharing
Doctors create structured prescriptions with diagnosis, medications (name, dosage, frequency, duration, instructions), notes, and vitals. Prescriptions are stored in Firestore and shared with connected patients who can view and accept them.

**Key file:** `utils/prescriptionManager.ts` - Shared prescription management.

### Subscription & Monetization
Three-tier pricing via Stripe: Monthly ($9.99), Yearly (20% discount), Lifetime ($299). Free tier limits: 5 medications, 30-day history, ads displayed. Premium unlocks all features. Stripe webhook handling in Cloud Functions validates payments.

**Key files:** `utils/subscription.ts` - Feature gating; `utils/stripe.ts` - Stripe integration; `providers/StripeProvider.tsx` - Stripe context.

### Notifications
Push notifications via expo-notifications for medication reminders and refill alerts. Notifications are scheduled per medication time and repeat daily. Local notification channels configured for Android.

**Key file:** `utils/notifications.ts` - Notification scheduling and management.

### Ad Integration
Google Mobile Ads displayed for free users: banner ads on home screen, interstitial ads on navigation. Premium users see no ads.

**Key files:** `components/AdBanner.tsx`, `components/AdInterstitial.tsx` - Ad display components.

---

## 9. System/Data Flow

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   React Native    |<--->|   AsyncStorage    |     |   Firestore       |
|   (UI Layer)      |     |   (Local Cache)   |     |   (Cloud DB)      |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        |                         |                         |
        v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   Context API     |     |   Sync Queue      |     |   REST API        |
|   (Auth, Theme)   |     |   (Offline)       |     |   (Firebase)      |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   Expo Router     |     |   Network Check   |     |   Stripe SDK      |
|   (Navigation)    |     |   (Connectivity)  |     |   (Payments)      |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
```

### Data Flow for Adding a Medication:
1. User fills medication form on `medications/add.tsx`
2. `addMedication()` called in `utils/storage.ts`
3. Medication saved to AsyncStorage locally
4. `syncOrQueue()` checks network state
5. If online: `syncMedicationToFirebase()` sends to Firestore via REST API
6. If offline: Item added to sync queue for later
7. UI updates immediately (optimistic update)

### Data Flow for Doctor-Patient Connection:
1. Patient searches doctor by email in `My Doctor` screen
2. Firestore query finds matching doctor profile
3. Connection document created in `connections` collection
4. Notification created for doctor
5. Doctor sees pending request on Dashboard
6. Doctor accepts/rejects via `updateConnectionStatus()`
7. Patient notified of status change

---

## 10. Key Design Decisions

1. **REST API over Native SDK** - Firebase Firestore is accessed via REST API instead of native SDK, enabling the app to work in Expo Go during development while supporting full functionality in production builds.

2. **Offline-First Architecture** - All critical data (medications, doses, prescriptions) is stored locally first with AsyncStorage, ensuring the app works without internet. Cloud sync is handled asynchronously.

3. **Role-Based Navigation** - Single codebase with role-based tab layouts. Doctors see a different set of tabs (Dashboard, My Patients, Prescriptions, Profile) compared to patients (Home, Calendar, Analytics, My Doctor, History, Profile).

4. **Freemium with Feature Gating** - Premium features are gated at the utility level (e.g., `isPremium()`, `canAddMedication()`), allowing clean separation between free and paid functionality.

5. **Dual Sync Strategy** - Data syncs to Firestore via REST API first; native Firestore SDK is used as fallback. This provides maximum compatibility across development and production environments.

6. **Context-Based State Management** - React Context (AuthContext, ThemeContext) provides global state without external dependencies, keeping the bundle size minimal.

---

## 11. Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Firebase native modules unavailable in Expo Go | Implemented REST API fallback for all Firestore operations; graceful degradation when native modules unavailable |
| Offline data consistency | Offline-first architecture with sync queue; optimistic UI updates |
| Role-based UI in single navigation tree | Conditional tab rendering based on `userRole` in `_layout.tsx`; hidden tabs via `href: null` |
| Medication limit enforcement | `canAddMedication()` check before adding; upgrade prompt when approaching limit |
| Token expiration during sync | Automatic token refresh via `refreshIdToken()`; retry logic on 401 responses |
| Cross-device data sync | Firestore cloud sync with conflict resolution via merge strategy |
| Ad integration without breaking UX | Premium modal components; ad-free experience for paying users |

---

## 12. Future Improvements

- **Medication Scanning** - OCR/camera integration to scan medication labels
- **Telehealth Integration** - In-app video consultations between doctors and patients
- **Drug Interaction Checker** - Cross-reference medications for potential interactions
- **Wearable Integration** - Apple Watch / Wear OS companion app for quick dose logging
- **Multi-Language Support** - Localization for global accessibility
- **Advanced Analytics Dashboard** - Charts, trends, and exportable health reports
- **Pharmacy Integration** - Direct refill ordering through partner pharmacies
- **Insurance Integration** - Coverage verification and claim submission
- **Caregiver Alerts** - Real-time notifications to family members for missed doses
- **AI-Powered Insights** - Medication adherence predictions and health recommendations

---

## 13. Conclusion

MediRemind is a comprehensive medication management platform that bridges the gap between patients and healthcare providers. With its dual-role system, offline-first architecture, and freemium model, it provides a scalable foundation for personal and family health management. The app's emphasis on connectivity (doctor-patient relationships, prescription sharing, appointment booking) transforms it from a simple reminder tool into a complete healthcare coordination platform.

The technical implementation demonstrates modern React Native practices with Expo, leveraging REST API fallbacks for maximum compatibility, Context-based state management for simplicity, and a robust sync strategy for data reliability across devices and network conditions.

---

*Generated from codebase analysis - MediRemind v1.0.0*
