# Doctor-Patient Feature Implementation Plan

## Overview
This document outlines the plan to implement a comprehensive doctor-patient system in the medicine reminder app, including role-based authentication, doctor-patient connections, and prescription sharing.

---

## 1. Authentication & Role Management

### 1.1 User Role Selection
- **Signup Flow:**
  - Add role selection screen after initial signup
  - Two options: "Doctor" or "Patient"
  - Store role in user profile in Firestore

- **User Profile Schema:**
  ```typescript
  interface UserProfile {
    uid: string;
    email: string;
    role: 'doctor' | 'patient';
    displayName: string;
    createdAt: Timestamp;
    // Doctor-specific fields
    specialty?: string;
    licenseNumber?: string;
    // Patient-specific fields
    dateOfBirth?: string;
  }
  ```

### 1.2 Authentication Enforcement
- **Protected Routes:**
  - All app screens require authentication
  - Redirect to signin page if not authenticated
  - Check authentication state in AuthContext

- **Logout Flow:**
  - Clear user session
  - Redirect to signin page
  - Clear any cached data

---

## 2. Role-Based Dashboards

### 2.1 Doctor Dashboard
- **Features:**
  - List of connected patients
  - Recent prescriptions created
  - Pending patient connection requests
  - Quick actions: Add Patient, Create Prescription

- **Navigation:**
  - Home (Dashboard)
  - My Patients
  - Prescriptions
  - Profile

### 2.2 Patient Portal
- **Updated Navigation:**
  - Home
  - Medications
  - **My Doctor** (replaces Prescription)
  - History
  - Profile

- **My Doctor Screen:**
  - List of connected doctors
  - Add Doctor button
  - Doctor details (name, specialty, contact)
  - Pending invitations

---

## 3. Doctor-Patient Connection System

### 3.1 Patient Adding Doctor

#### Scenario A: Doctor Exists in System
1. Patient searches for doctor by email/name
2. System finds existing doctor account
3. Connection request sent to doctor
4. Doctor receives notification
5. Doctor accepts/rejects request
6. Upon acceptance, doctor appears in patient's "My Doctor" list

#### Scenario B: Doctor Not in System
1. Patient enters doctor's email
2. System checks - doctor not found
3. Patient can send invitation email
4. Doctor receives email with signup link
5. Doctor signs up and accepts connection
6. Connection established

**Firestore Schema:**
```typescript
interface DoctorPatientConnection {
  id: string;
  doctorId: string;
  patientId: string;
  status: 'pending' | 'accepted' | 'rejected';
  initiatedBy: 'doctor' | 'patient';
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
}

interface DoctorInvitation {
  id: string;
  invitedBy: string; // patient UID
  doctorEmail: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

### 3.2 Doctor Adding Patient

1. Doctor searches for patient by email/name
2. Connection request sent to patient
3. Patient receives notification
4. Patient accepts invitation
5. Connection established
6. Doctor appears in patient's "My Doctor" list

---

## 4. Notification System

### 4.1 Notification Types
- Doctor connection request
- Patient connection request
- Invitation acceptance
- New prescription shared
- Prescription update

### 4.2 Implementation
- Use Firebase Cloud Messaging (FCM) for push notifications
- In-app notification center
- Email notifications for critical actions

**Firestore Schema:**
```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'connection_request' | 'connection_accepted' | 'prescription_shared';
  title: string;
  message: string;
  data: {
    connectionId?: string;
    prescriptionId?: string;
    fromUserId?: string;
  };
  read: boolean;
  createdAt: Timestamp;
}
```

---

## 5. Prescription Management

### 5.1 Patient-Created Prescriptions

**Features:**
- Create prescription form
- List of medications
- Dosage and schedule
- Notes/symptoms
- Share with connected doctor
- Share via WhatsApp

**Sharing Flow:**
- Select doctor from "My Doctor" list
- Prescription stored in shared collection
- Doctor receives notification
- Doctor can view in their dashboard

### 5.2 Doctor-Created Prescriptions

**Features:**
- Create prescription for specific patient
- Professional prescription template
- Medication details, dosage, duration
- Instructions and warnings
- Digital signature/credentials
- Share with patient

**Sharing Flow:**
- Doctor selects patient
- Creates prescription
- Prescription saved and shared
- Patient receives notification
- Appears in patient's prescription list

**Firestore Schema:**
```typescript
interface Prescription {
  id: string;
  createdBy: string; // UID of creator
  createdByRole: 'doctor' | 'patient';
  patientId: string;
  doctorId?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  notes: string;
  diagnosis?: string;
  sharedWith: string[]; // Array of UIDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5.3 WhatsApp Sharing
- Generate prescription as formatted text or PDF
- Use React Native's Share API or deep linking
- Include prescription details in shareable format

---

## 6. Database Structure

### Firestore Collections:

```
users/
  {uid}/
    - email
    - role
    - displayName
    - specialty (doctors only)
    - licenseNumber (doctors only)

connections/
  {connectionId}/
    - doctorId
    - patientId
    - status
    - initiatedBy
    - createdAt
    - acceptedAt

invitations/
  {invitationId}/
    - invitedBy
    - doctorEmail
    - status
    - createdAt
    - expiresAt

prescriptions/
  {prescriptionId}/
    - createdBy
    - createdByRole
    - patientId
    - doctorId
    - medications[]
    - notes
    - diagnosis
    - sharedWith[]
    - createdAt

notifications/
  {notificationId}/
    - userId
    - type
    - title
    - message
    - data{}
    - read
    - createdAt
```

---

## 7. Implementation Steps

### Phase 1: Authentication & Roles (Week 1)
1. Update signup flow with role selection
2. Create/update user profile schema in Firestore
3. Implement protected routes
4. Add logout redirect functionality
5. Update AuthContext for role management

### Phase 2: Dashboards (Week 2)
1. Create Doctor Dashboard layout
2. Create Patient Portal updates
3. Replace Prescription tab with My Doctor
4. Implement My Doctor screen UI
5. Create navigation structure for both roles

### Phase 3: Connection System (Week 2-3)
1. Implement doctor search functionality
2. Create connection request system
3. Implement invitation system for non-existing doctors
4. Build acceptance/rejection flow
5. Set up Firestore collections and security rules

### Phase 4: Notifications (Week 3)
1. Set up Firebase Cloud Messaging
2. Create notification center UI
3. Implement notification handlers
4. Add email notifications
5. Test notification delivery

### Phase 5: Prescriptions (Week 4)
1. Create prescription form for patients
2. Create prescription form for doctors
3. Implement prescription storage
4. Add sharing with doctor functionality
5. Add sharing with patient functionality
6. Implement WhatsApp sharing
7. Create prescription viewing screens

### Phase 6: Testing & Refinement (Week 5)
1. End-to-end testing of doctor workflow
2. End-to-end testing of patient workflow
3. Test all notification scenarios
4. Test prescription sharing
5. Fix bugs and refine UI/UX
6. Performance optimization

---

## 8. Security Considerations

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Connections
    match /connections/{connectionId} {
      allow read: if request.auth != null &&
        (resource.data.doctorId == request.auth.uid ||
         resource.data.patientId == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (resource.data.doctorId == request.auth.uid ||
         resource.data.patientId == request.auth.uid);
    }

    // Prescriptions
    match /prescriptions/{prescriptionId} {
      allow read: if request.auth != null &&
        (resource.data.createdBy == request.auth.uid ||
         resource.data.patientId == request.auth.uid ||
         resource.data.doctorId == request.auth.uid ||
         request.auth.uid in resource.data.sharedWith);
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        resource.data.createdBy == request.auth.uid;
    }

    // Notifications
    match /notifications/{notificationId} {
      allow read, update: if request.auth != null &&
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 9. UI/UX Considerations

- Clear visual distinction between Doctor and Patient interfaces
- Intuitive connection request flow
- Easy-to-use prescription creation forms
- Professional appearance for doctor-created prescriptions
- Quick access to frequently used features
- Responsive design for various screen sizes

---

## 10. Future Enhancements

- Video consultation integration
- Appointment scheduling
- Medical records storage
- Lab results sharing
- Medication interaction warnings
- Prescription refill requests
- Doctor ratings and reviews
- Multi-language support
- Analytics dashboard for doctors

---

## Technical Stack

- **Frontend:** React Native + Expo
- **Backend:** Firebase (Firestore, Authentication, Cloud Messaging)
- **State Management:** React Context API
- **Navigation:** React Navigation
- **Styling:** React Native StyleSheet / Tailwind CSS
- **Notifications:** Firebase Cloud Messaging
- **Sharing:** React Native Share API

---

**Document Version:** 1.0
**Last Updated:** February 8, 2026
**Author:** Development Team
