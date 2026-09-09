# MediRemind — Full Development Plan

## 1. Project Direction

For the first release, **do not implement subscriptions, premium plans, Family Care pricing, RevenueCat, paywalls, or payment processing**.

The priority is:

> **Build a complete, reliable medication-management system first. Monetization comes at the end as an optional layer.**

The architecture should still be designed so subscription/entitlement logic can be added later without rewriting the core system.

---

# 2. Development Strategy

Build MediRemind in these stages:

1. Architecture foundation
2. Authentication and user profiles
3. Patient medication management
4. Medication schedules
5. Dose/reminder engine
6. Offline-first local database
7. Cloud synchronization
8. Calendar and history
9. Refill management
10. Doctor/patient system
11. Prescription system
12. Notifications
13. Reports and analytics
14. Family/caregiver system
15. Medication intelligence
16. Security and production hardening
17. Testing
18. Production release
19. **Optional: subscription/monetization**

The important rule is:

**Do not build the monetization system until the core product is stable.**

---

# 3. PHASE 0 — Architecture Foundation

## Implement

### Project structure

Use a modular architecture:

```text
app/
├── (auth)/
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   └── onboarding.tsx
│
├── (tabs)/
│   ├── index.tsx
│   ├── medications/
│   ├── calendar/
│   ├── history/
│   ├── doctor/
│   ├── family/
│   └── profile/
│
├── medication/
├── prescription/
├── doctor/
├── family/
├── reports/
└── settings/

services/
├── auth/
├── medication/
├── dose/
├── reminder/
├── prescription/
├── doctor/
├── family/
├── notification/
├── reports/
├── analytics/
└── sync/

data/
├── local/
├── firestore/
└── repositories/

hooks/
├── useAuth.ts
├── useMedications.ts
├── useDoseRecords.ts
├── useReminders.ts
├── useFamily.ts
├── useDoctor.ts
├── usePrescription.ts
└── useSync.ts

components/
├── medication/
├── calendar/
├── prescription/
├── doctor/
├── family/
├── common/
└── ui/

utils/
├── date/
├── medication/
├── validation/
└── formatting/
```

## Architecture rules

UI should not directly manipulate Firestore.

Use:

```text
Screen
  ↓
Hook
  ↓
Repository
  ↓
Local DB / Firestore
```

For example:

```text
MedicationScreen
      ↓
useMedications()
      ↓
medicationRepository
      ↓
SQLite + Sync Engine
      ↓
Firestore
```

## Implement

- TypeScript strict typing
- centralized error handling
- centralized date/time utilities
- validation layer
- repository layer
- service layer
- logging
- environment configuration
- Firebase configuration
- navigation structure
- reusable UI components

## Remain

Nothing major should remain from the architecture foundation.

---

# 4. PHASE 1 — Authentication

## Implement

### Authentication

- Email/password
- Google/Apple authentication if desired
- Sign in
- Sign up
- Sign out
- Password reset
- Email verification
- Session persistence

### User model

```text
users/{uid}
```

Example:

```ts
User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Implement

- Auth state listener
- Protected routes
- Auth loading screen
- Onboarding
- Account settings

## Remain

Optional social login providers if not needed for initial release.

---

# 5. PHASE 2 — Medication Profiles

Separate the **account** from the **person whose medication is being managed**.

This is important because later the same account can manage:

- Self
- Mother
- Father
- Spouse
- Child
- Other family member

## Implement

```text
profiles/{profileId}
```

```ts
MedicationProfile {
  id: string;
  ownerId: string;
  name: string;
  dateOfBirth?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Features

- Create profile
- Edit profile
- Delete profile
- Select active profile
- Profile switcher

## Remain

Family sharing permissions are handled later.

---

# 6. PHASE 3 — Medication Management

This is the core of MediRemind.

## Implement

Medication CRUD:

- Add medication
- Edit medication
- Delete medication
- Archive medication
- Activate medication
- Pause medication
- Search medications
- Filter medications
- Medication details

## Medication model

```ts
Medication {
  id: string;
  profileId: string;

  name: string;
  genericName?: string;

  dosage?: number;
  dosageUnit?: string;

  form?: string;

  instructions?: string;

  startDate: string;
  endDate?: string;

  status: "active" | "paused" | "completed" | "archived";

  refill?: {
    quantity?: number;
    remaining?: number;
    refillThreshold?: number;
  };

  notes?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## UI

Medication list:

```text
Medication
────────────────────
Paracetamol
500 mg

8:00 AM
After meal

Next dose: 8:00 PM
```

## Implement

- medication search
- medication sorting
- active/completed filtering
- medication detail page
- edit page
- delete confirmation

## Remain

- Drug interaction intelligence
- external medication database
- advanced templates
- bulk import

These come later.

---

# 7. PHASE 4 — Medication Schedule Engine

A medication is not the same thing as its schedule.

Create:

```text
medicationSchedules/{scheduleId}
```

## Schedule types

Implement:

### Specific time

```text
8:00 AM
2:00 PM
8:00 PM
```

### Interval

```text
Every 6 hours
Every 8 hours
Every 12 hours
```

### Meal based

```text
Before meal
With meal
After meal
```

### Days

```text
Every day
Monday
Tuesday
...
```

### Date range

```text
Start date
End date
```

## Schedule model

```ts
MedicationSchedule {
  id: string;
  medicationId: string;

  type:
    | "specific_time"
    | "interval"
    | "with_meal"
    | "before_meal"
    | "after_meal";

  times?: string[];
  intervalMinutes?: number;

  daysOfWeek?: number[];

  startDate: string;
  endDate?: string;

  enabled: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Implement

- schedule creation
- schedule editing
- schedule validation
- multiple schedules per medication
- schedule conflict detection
- timezone-safe date handling

## Remain

Smart scheduling can be added later.

---

# 8. PHASE 5 — Dose Engine

This is one of the most important parts of the application.

Do not calculate adherence directly from notifications.

Create actual dose records.

```text
doseRecords/{doseId}
```

## Dose statuses

```text
pending
taken
missed
skipped
snoozed
```

## Dose model

```ts
DoseRecord {
  id: string;

  profileId: string;
  medicationId: string;
  scheduleId: string;

  scheduledAt: Timestamp;

  status:
    | "pending"
    | "taken"
    | "missed"
    | "skipped"
    | "snoozed";

  takenAt?: Timestamp;
  snoozedUntil?: Timestamp;

  note?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Implement

- Generate today's doses
- Generate future doses
- Mark taken
- Mark skipped
- Mark missed
- Snooze
- Undo
- Dose history
- Daily progress

## Example

```text
Today's Progress

████████░░ 80%

4 / 5 doses completed
```

## Remain

Advanced adherence algorithms can come later.

---

# 9. PHASE 6 — Offline-First Database

This should be implemented before depending heavily on Firestore.

## Implement

Use Expo SQLite for core medication data.

Local tables:

```text
profiles
medications
medication_schedules
dose_records
refills
sync_queue
sync_metadata
```

## Architecture

```text
UI
 ↓
Repository
 ↓
SQLite
 ↓
Sync Queue
 ↓
Firestore
```

The app should work when:

```text
Internet = OFF
```

The user must still be able to:

- View medications
- Add medications
- Edit medications
- View schedules
- Take doses
- Snooze doses
- View today's schedule
- View local history

## Sync engine

Implement:

```text
Local change
     ↓
sync_queue
     ↓
Internet available
     ↓
Firestore upload
     ↓
Server changes
     ↓
Local database update
```

## Implement

- retry
- conflict handling
- sync status
- failed sync queue
- last synced timestamp
- background synchronization where supported

## Remain

Advanced multi-device conflict resolution can be improved after the first release.

---

# 10. PHASE 7 — Today Dashboard

## Implement

Main screen:

```text
Good morning

Today's medications

08:00
Paracetamol
500 mg
[Take]

12:00
Vitamin D
1 tablet
[Take]

20:00
Paracetamol
500 mg
[Take]
```

## Add

- today's progress
- next medication
- missed medication warning
- upcoming doses
- quick take action
- quick snooze
- profile selector
- medication count

## Remain

Personalized AI recommendations.

---

# 11. PHASE 8 — Calendar

## Implement

Calendar view:

```text
September 2026

Mon Tue Wed Thu Fri Sat Sun
```

Selecting a date shows:

- scheduled medications
- taken doses
- missed doses
- skipped doses
- adherence percentage

## Implement

- daily view
- monthly view
- date navigation
- adherence indicators
- historical dose lookup

## Remain

Advanced calendar intelligence.

---

# 12. PHASE 9 — History

## Implement

History screen:

```text
September 9

✓ Paracetamol
✓ Vitamin D
✗ Antibiotic
— Calcium skipped
```

## Filters

- date
- medication
- status

## Implement

- daily history
- weekly history
- monthly history
- medication-specific history

## Remain

Advanced analytics and trend reports.

---

# 13. PHASE 10 — Reminder / Notification Engine

Separate local reminders from server notifications.

## Local notifications

Use local notifications for:

- medication reminders
- snooze
- repeat reminders
- schedule changes

These must work offline.

## Implement

- schedule notification
- cancel notification
- reschedule notification
- notification IDs
- notification recovery after app restart
- timezone handling

## Reminder flow

```text
Medication Schedule
        ↓
Dose Generator
        ↓
Notification Scheduler
        ↓
Local Notification
        ↓
User Action
        ↓
Dose Record
```

## Remain

- custom notification sounds
- advanced smart reminders
- intelligent reminder optimization

---

# 14. PHASE 11 — Refill Management

## Implement

Track:

```text
Initial quantity
Remaining quantity
Refill threshold
```

Example:

```text
Paracetamol

Remaining: 8 tablets

⚠ Low supply
```

## Implement

- refill quantity
- remaining quantity
- automatic decrement after taken dose
- refill record
- refill history
- low-stock warning

## Remain

- pharmacy integrations
- automatic pharmacy ordering
- advanced refill prediction

---

# 15. PHASE 12 — Notes

## Implement

Notes for:

- medication
- dose
- profile

Example:

```text
Medication Note

Take after food because it causes
stomach discomfort when taken empty.
```

## Remain

Rich medical journal functionality.

---

# 16. PHASE 13 — Doctor / Patient System

Your existing doctor/patient functionality should be integrated into the new architecture rather than rebuilt separately.

## Implement

### Doctor

- doctor dashboard
- patient list
- patient requests
- accept/reject requests
- patient details
- prescriptions
- doctor profile

### Patient

- doctor list
- connect doctor
- invite doctor
- doctor details
- prescriptions

## Firestore

```text
connections/{connectionId}
```

Example:

```ts
Connection {
  id: string;

  doctorId: string;
  patientId: string;

  status: "pending" | "accepted" | "rejected";

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Implement

- real-time connection updates
- connection security
- revoke connection
- doctor/patient permissions

## Remain

- advanced care team
- multiple caregiver roles
- organization/hospital accounts

---

# 17. PHASE 14 — Prescription System

## Implement

Doctors can create prescriptions.

Prescription should contain:

```text
Prescription
├── Doctor
├── Patient
├── Date
├── Diagnosis
├── Instructions
└── Medications
```

## Features

- create prescription
- view prescription
- prescription details
- prescription history
- prescription status
- medication instructions
- share prescription
- WhatsApp sharing
- copy prescription text

## Prescription versioning

Implement:

```text
prescriptionVersions/{versionId}
```

Track:

- created
- edited
- changed by
- changes
- timestamp

## Remain

- electronic signature
- advanced prescription verification
- pharmacy integration
- government/regulated e-prescription integration

---

# 18. PHASE 15 — Prescription → Medication

This is an important workflow.

Doctor creates:

```text
Prescription
     ↓
Patient receives
     ↓
Patient reviews
     ↓
Add medications
     ↓
Medication schedule created
     ↓
Reminder created
```

## Implement

- prescription medication parsing
- patient confirmation
- add to medication list
- schedule setup
- duplicate medication detection

## Remain

Fully automatic prescription OCR/import.

---

# 19. PHASE 16 — Family / Caregiver System

Build this after the individual medication system is stable.

## Implement

Families:

```text
families/{familyId}
```

Family members:

```text
familyMembers/{memberId}
```

Caregiver permissions:

```text
caregiverPermissions/{permissionId}
```

## Permissions

```text
view medications
edit medications
view history
receive alerts
view reports
```

## Implement

- create family
- invite member
- accept invitation
- profile sharing
- caregiver permissions
- switch profiles
- caregiver medication view

## Remain

Advanced Family Care features:

- escalation chains
- messaging
- advanced caregiver dashboard
- emergency workflows
- multi-level caregiver rules

---

# 20. PHASE 17 — Adherence Analytics

## Implement

Basic analytics:

```text
Adherence
92%

Taken
46

Missed
3

Skipped
1
```

## Metrics

- adherence percentage
- taken doses
- missed doses
- skipped doses
- medication-specific adherence
- daily adherence
- weekly adherence
- monthly adherence

## Implement

Charts:

- daily adherence
- weekly trend
- medication comparison
- missed-dose frequency

## Remain

Advanced analytics:

- effectiveness tracking
- side-effect correlation
- predictive adherence
- AI recommendations

---

# 21. PHASE 18 — Reports

## Implement

Generate reports:

- medication list
- medication schedule
- dose history
- adherence report
- prescription history

## PDF

Create PDF export.

Example:

```text
MediRemind
Medication Report

Patient:
John Doe

Medication
Dosage
Schedule
Status

Adherence
92%
```

## Remain

- automated doctor report delivery
- scheduled reports
- advanced clinical reports

---

# 22. PHASE 19 — Security

This is mandatory before production.

## Implement

### Firestore security rules

Users should only access data they are authorized to access.

### Doctor access

Doctor should only access connected patients.

### Caregiver access

Caregiver should only access profiles granted to them.

### Prescription access

Prescription must validate:

```text
doctor ↔ patient
```

### Audit logs

Track important actions:

```text
prescription_created
prescription_updated
medication_created
medication_updated
connection_created
connection_removed
```

## Implement

- Firestore rules
- role validation
- server-side validation
- audit logs
- secure Firebase configuration
- no trusted client-only permissions
- input validation
- rate limiting where applicable

## Important

Do not claim medical/privacy compliance simply because security rules exist.

Before production, review applicable privacy and healthcare requirements for the target countries.

---

# 23. PHASE 20 — Analytics / Product Events

Implement product analytics without putting sensitive medical information into analytics events.

Useful events:

```text
app_opened
onboarding_completed

medication_created
medication_updated
medication_deleted

reminder_created
dose_taken
dose_missed
dose_skipped
dose_snoozed

prescription_created
prescription_received

doctor_connected

family_created
family_member_added

report_generated
```

Avoid sending unnecessary:

- medication names
- diagnosis
- prescription contents
- sensitive medical information

---

# 24. PHASE 21 — Testing

## Unit tests

Test:

- medication validation
- schedule generation
- dose generation
- adherence calculations
- refill calculations
- date calculations

## Integration tests

Test:

```text
Medication
→ Schedule
→ Dose
→ Reminder
→ Taken
→ History
```

Also:

```text
Doctor
→ Prescription
→ Patient
→ Medication
```

## Offline tests

Test:

```text
Create medication offline
        ↓
Restart app
        ↓
Data still exists
        ↓
Internet returns
        ↓
Data syncs
```

## Security tests

Test:

- unauthorized patient access
- unauthorized doctor access
- unauthorized caregiver access
- prescription access
- deleted account access

## E2E tests

Important flows:

1. Sign up
2. Create profile
3. Add medication
4. Create schedule
5. Receive reminder
6. Take dose
7. View history
8. Work offline
9. Sync online
10. Doctor connection
11. Prescription creation
12. Prescription received

---

# 25. PHASE 22 — Production Readiness

## Implement

- crash reporting
- error logging
- performance monitoring
- loading states
- empty states
- retry states
- offline indicators
- sync status
- migration strategy
- database versioning
- Firestore indexes
- backup strategy
- account deletion
- data export
- privacy policy
- terms of service
- support/contact system

## App Store preparation

### Android

- Play Store configuration
- signing
- release build
- privacy declarations
- screenshots
- store listing

### iOS

- App Store configuration
- signing
- TestFlight
- privacy declarations
- screenshots
- store listing

---

# 26. What Should Be Implemented Before First Release

The following should be considered the **core V1**.

## Must implement

### Account

- Authentication
- User profile
- Onboarding

### Medication

- Medication CRUD
- Medication profiles
- Medication schedules
- Dose records

### Reminder

- Local notifications
- Snooze
- Taken
- Missed
- Skipped

### Offline

- SQLite
- Offline medication management
- Offline dose management
- Sync engine

### Dashboard

- Today's medications
- Next dose
- Daily progress

### Calendar

- Daily schedule
- Historical schedule
- Adherence indicators

### History

- Dose history
- Medication history
- Filters

### Refill

- Remaining quantity
- Refill tracking
- Low supply warning

### Doctor

- Doctor/patient connection
- Doctor dashboard
- Patient list

### Prescription

- Create prescription
- Receive prescription
- Prescription history
- Add prescription medications

### Security

- Firestore rules
- Role/permission checks
- Audit logs

### Testing

- Unit tests
- Integration tests
- E2E tests
- Offline tests

---

# 27. What Can Remain After V1

These features should NOT block the first stable release.

## Advanced medication intelligence

- drug interaction checker
- medication database
- AI medication assistant
- side-effect analysis
- effectiveness tracking

## Advanced family care

- caregiver escalation
- emergency contacts
- caregiver messaging
- advanced caregiver dashboards

## Advanced reporting

- scheduled reports
- automated doctor reports
- advanced clinical reports

## Advanced reminders

- custom sounds
- smart scheduling
- intelligent reminder optimization
- advanced quiet-hour logic

## Import

- bulk medication import
- OCR prescription scanning
- automatic prescription extraction

## Integrations

- pharmacy integrations
- wearable integrations
- health platform integrations
- hospital integrations

---

# 28. Subscription / Monetization — OPTIONAL FINAL PHASE

**Do not implement this now.**

Keep it completely separate from the core medication architecture.

When the product is stable, add:

## Subscription system

```text
Free
Premium
Family
```

## Possible premium features

- unlimited medications
- cloud backup/sync
- advanced reminders
- advanced history
- PDF reports
- refill alerts
- adherence analytics
- family care
- advanced medication intelligence

## Future implementation

Use:

```text
App
 ↓
RevenueCat
 ↓
Apple / Google
 ↓
Webhook
 ↓
Backend
 ↓
Subscription state
```

Do not build the core application around subscription checks.

Instead, later introduce:

```ts
Entitlements {
  unlimitedMedications: boolean;
  advancedReminders: boolean;
  pdfExport: boolean;
  familyCare: boolean;
  analytics: boolean;
}
```

The core system should work independently of this layer.

---

# 29. Features Specifically Removed From Current Scope

These are intentionally postponed:

```text
❌ Subscription
❌ Premium plan
❌ Family Care pricing
❌ RevenueCat
❌ Paywall
❌ Trial
❌ Lifetime plan
❌ Payment processing
❌ Subscription analytics
❌ Premium feature limits
```

They can all be added later.

---

# 30. Recommended Build Order

Do not build features randomly.

Follow this order:

```text
1. Architecture
       ↓
2. Authentication
       ↓
3. Profile
       ↓
4. Medication CRUD
       ↓
5. Medication Schedule
       ↓
6. Dose Engine
       ↓
7. SQLite
       ↓
8. Sync Engine
       ↓
9. Notifications
       ↓
10. Today Dashboard
       ↓
11. Calendar
       ↓
12. History
       ↓
13. Refill
       ↓
14. Doctor/Patient
       ↓
15. Prescription
       ↓
16. Prescription → Medication
       ↓
17. Family/Caregiver
       ↓
18. Analytics
       ↓
19. Reports/PDF
       ↓
20. Security hardening
       ↓
21. Testing
       ↓
22. Production release
       ↓
23. Subscription (OPTIONAL)
```

---

# 31. Final Product Architecture

The final system should look like:

```text
                         MediRemind
                             │
                ┌────────────┴────────────┐
                │                         │
             Account                  Profiles
                │                         │
                │              ┌──────────┼──────────┐
                │              │          │          │
                │             Self      Mother     Father
                │
                └──────────────────────────────────────┐
                                                       │
                                                Medication
                                                       │
                                                Schedule
                                                       │
                                                  Dose Engine
                                                       │
                         ┌─────────────────────────────┼───────────────────┐
                         │                             │                   │
                    Notifications                  History             Refill
                         │                             │                   │
                         └─────────────────────────────┼───────────────────┘
                                                       │
                                                  Analytics
                                                       │
                                                  Reports
                                                       │
                         ┌─────────────────────────────┴───────────────────┐
                         │                                                 │
                     Doctor                                           Caregiver
                         │                                                 │
                   Prescription                                      Family Access
                         │
                    Patient
```

---

# 32. Data Architecture

Use:

```text
Firebase Auth
     │
     └── User
          │
          └── Profiles
               │
               ├── Medications
               │     └── Schedules
               │
               ├── Dose Records
               │
               ├── Refills
               │
               └── Notes

Doctor
   │
   └── Connections
          │
          └── Patient
                │
                └── Prescriptions
```

Local:

```text
SQLite
 ├── profiles
 ├── medications
 ├── medication_schedules
 ├── dose_records
 ├── refills
 ├── notes
 ├── sync_queue
 └── sync_metadata
```

Cloud:

```text
Firestore
 ├── users
 ├── profiles
 ├── medications
 ├── medicationSchedules
 ├── doseRecords
 ├── refills
 ├── connections
 ├── prescriptions
 ├── prescriptionVersions
 ├── families
 ├── familyMembers
 ├── caregiverPermissions
 ├── auditLogs
 └── devices
```

---

# 33. Definition of Done for Core System

Before considering MediRemind's core system complete:

- [ ] User can create an account
- [ ] User can create a medication profile
- [ ] User can add medication
- [ ] User can create schedules
- [ ] App generates doses
- [ ] App schedules local reminders
- [ ] User can take a dose
- [ ] User can snooze a dose
- [ ] User can skip a dose
- [ ] Missed doses are recorded
- [ ] Today's progress works
- [ ] Calendar works
- [ ] History works
- [ ] Refill tracking works
- [ ] App works offline
- [ ] Data survives app restart
- [ ] Offline changes sync
- [ ] Doctor can connect to patient
- [ ] Doctor can create prescription
- [ ] Patient can receive prescription
- [ ] Prescription can create medication
- [ ] Family profiles work
- [ ] Caregiver permissions work
- [ ] Basic analytics work
- [ ] PDF report works
- [ ] Firestore security rules are tested
- [ ] Critical E2E flows pass
- [ ] Crash/error monitoring works
- [ ] Account deletion works
- [ ] Data export works

Only after these are stable should monetization be considered.

---

# 34. The Main Principle

The product should be built as:

```text
CORE MEDICAL MANAGEMENT SYSTEM
              ↓
       OFFLINE-FIRST
              ↓
       CLOUD SYNC
              ↓
     DOCTOR/PATIENT
              ↓
        FAMILY CARE
              ↓
      REPORTS/ANALYTICS
              ↓
        PRODUCTION
              ↓
    ┌─────────────────┐
    │ OPTIONAL LAYER  │
    │  SUBSCRIPTION   │
    └─────────────────┘
```

**Subscription is not part of the core system.**

Build MediRemind so a user can use the complete core workflow first. Monetization can then be introduced without changing the medication, dose, reminder, prescription, doctor, or synchronization architecture.
