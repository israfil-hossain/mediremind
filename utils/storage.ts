import AsyncStorage from "@react-native-async-storage/async-storage";
import { canAddMedication, getHistoryLimitDays } from "./subscription";
import {
  addToSyncQueue,
  getCurrentUser,
  isFirebaseReady,
  syncMedicationToFirebase,
  syncDoseHistoryToFirebase,
  syncPrescriptionToFirebase,
} from "./firebase";
import { getNetworkState } from "./networkSync";

const MEDICATIONS_KEY = "@medications";
const DOSE_HISTORY_KEY = "@dose_history";
const PRESCRIPTIONS_KEY = "@prescriptions";
const USER_PROFILE_KEY = "@user_profile";

// Helper to add item to sync queue or sync directly if online
async function syncOrQueue(
  type: "medication" | "dose_history",
  action: "add" | "update" | "delete",
  data: Medication | DoseHistory | { id: string }
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return; // Not logged in, no sync needed

  const networkState = await getNetworkState();
  const isOnline =
    networkState.isConnected && networkState.isInternetReachable === true;

  if (isOnline) {
    // Sync directly to Firebase using REST API (works in Expo Go)
    try {
      if (type === "medication") {
        const success = await syncMedicationToFirebase(data as Medication, action);
        if (!success) throw new Error("Sync failed");
      } else {
        const success = await syncDoseHistoryToFirebase(data as DoseHistory, action);
        if (!success) throw new Error("Sync failed");
      }
    } catch (error) {
      // If direct sync fails, add to queue
      console.warn("Direct sync failed, adding to queue:", error);
      await addToSyncQueue({
        id: Math.random().toString(36).slice(2, 11),
        type,
        action,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    // Offline - add to sync queue for later
    await addToSyncQueue({
      id: Math.random().toString(36).slice(2, 11),
      type,
      action,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}

// Helper to sync prescriptions
async function syncOrQueuePrescription(
  type: "prescription",
  action: "add" | "update" | "delete",
  data: Prescription | { id: string }
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return; // Not logged in, no sync needed

  const networkState = await getNetworkState();
  const isOnline =
    networkState.isConnected && networkState.isInternetReachable === true;

  if (isOnline) {
    // Sync directly to Firebase using REST API (works in Expo Go)
    try {
      const success = await syncPrescriptionToFirebase(data as Prescription, action);
      if (!success) throw new Error("Sync failed");
    } catch (error) {
      // If direct sync fails, add to queue
      console.warn("Direct sync failed, adding to queue:", error);
      await addToSyncQueue({
        id: Math.random().toString(36).slice(2, 11),
        type,
        action,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    // Offline - add to sync queue for later
    await addToSyncQueue({
      id: Math.random().toString(36).slice(2, 11),
      type,
      action,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  startDate: string;
  duration: string;
  color: string;
  reminderEnabled: boolean;
  currentSupply: number;
  totalSupply: number;
  refillAt: number;
  refillReminder: boolean;
  lastRefillDate?: string;
}

export interface DoseHistory {
  id: string;
  medicationId: string;
  timestamp: string;
  taken: boolean;
}

export interface Prescription {
  id: string;
  title: string; // Diagnosis or prescription name
  prescriptionDate: string;

  // Patient Information (auto-filled from profile)
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  patientWeight?: string; // in kg
  patientBP?: string; // Blood Pressure
  patientPulse?: string; // Pulse rate
  patientTemperature?: string; // Temperature
  patientAddress?: string;
  patientPhone?: string;
  patientDiagnosis?: string; // Patient's known diagnosis

  // Doctor Information
  doctorName?: string;
  doctorSpecialty?: string; // e.g., "Cardiologist", "General Physician"
  doctorPhone?: string;
  doctorEmail?: string;
  doctorAddress?: string;
  doctorWebsite?: string;

  // Hospital Information
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;

  // Medical Information
  symptoms?: string; // Patient symptoms
  diagnosis?: string; // Doctor's diagnosis for this visit
  notes?: string; // Doctor's notes/instructions

  // Medications with dosage
  medications?: PrescriptionMedication[];

  // Vitals/Additional info
  chiefComplaint?: string; // Main reason for visit
  nextVisitDate?: string; // Follow-up date

  // Additional
  imageUri?: string; // Prescription image/photo
  createdAt: string;
}

export interface PrescriptionMedication {
  name: string;
  dosage?: string;
  frequency?: string; // e.g., "Twice daily", "3 times a day"
  duration?: string; // e.g., "7 days", "2 weeks"
  instructions?: string; // e.g., "Take after meals"
}

export interface UserProfile {
  name?: string;
  age?: string;
  address?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  dateOfBirth?: string;
  gender?: string;
}

export async function getMedications(): Promise<Medication[]> {
  try {
    const data = await AsyncStorage.getItem(MEDICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting medications:", error);
    return [];
  }
}

export async function addMedication(medication: Medication): Promise<void> {
  try {
    const medications = await getMedications();
    const canAdd = await canAddMedication(medications.length);
    if (!canAdd) {
      throw new Error("MEDICATION_LIMIT_REACHED");
    }
    medications.push(medication);
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));

    // Sync to Firebase
    await syncOrQueue("medication", "add", medication);
  } catch (error) {
    console.error("Error adding medication:", error);
    throw error;
  }
}

export async function updateMedication(
  updatedMedication: Medication
): Promise<void> {
  try {
    const medications = await getMedications();
    const index = medications.findIndex(
      (med) => med.id === updatedMedication.id
    );
    if (index !== -1) {
      medications[index] = updatedMedication;
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));

      // Sync to Firebase
      await syncOrQueue("medication", "update", updatedMedication);
    }
  } catch (error) {
    console.error("Error updating medication:", error);
    throw error;
  }
}

export async function deleteMedication(id: string): Promise<void> {
  try {
    const medications = await getMedications();
    const updatedMedications = medications.filter((med) => med.id !== id);
    await AsyncStorage.setItem(
      MEDICATIONS_KEY,
      JSON.stringify(updatedMedications)
    );

    // Sync deletion to Firebase
    await syncOrQueue("medication", "delete", { id });
  } catch (error) {
    console.error("Error deleting medication:", error);
    throw error;
  }
}

export async function getDoseHistory(): Promise<DoseHistory[]> {
  try {
    const data = await AsyncStorage.getItem(DOSE_HISTORY_KEY);
    const allHistory: DoseHistory[] = data ? JSON.parse(data) : [];
    
    // Apply free tier history limit
    const limitDays = await getHistoryLimitDays();
    if (limitDays === Infinity) {
      return allHistory;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limitDays);
    
    return allHistory.filter(
      (dose) => new Date(dose.timestamp) >= cutoffDate
    );
  } catch (error) {
    console.error("Error getting dose history:", error);
    return [];
  }
}

export async function getTodaysDoses(): Promise<DoseHistory[]> {
  try {
    const history = await getDoseHistory();
    const today = new Date().toDateString();
    return history.filter(
      (dose) => new Date(dose.timestamp).toDateString() === today
    );
  } catch (error) {
    console.error("Error getting today's doses:", error);
    return [];
  }
}

export async function recordDose(
  medicationId: string,
  taken: boolean,
  timestamp: string
): Promise<void> {
  try {
    const history = await getDoseHistory();
    const newDose: DoseHistory = {
      id: Math.random().toString(36).slice(2, 11),
      medicationId,
      timestamp,
      taken,
    };

    history.push(newDose);
    await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(history));

    // Sync dose to Firebase
    await syncOrQueue("dose_history", "add", newDose);

    // Update medication supply if taken
    if (taken) {
      const medications = await getMedications();
      const medication = medications.find((med) => med.id === medicationId);
      if (medication && medication.currentSupply > 0) {
        medication.currentSupply -= 1;
        await updateMedication(medication);
      }
    }
  } catch (error) {
    console.error("Error recording dose:", error);
    throw error;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([MEDICATIONS_KEY, DOSE_HISTORY_KEY, PRESCRIPTIONS_KEY]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

// ============ PRESCRIPTION OPERATIONS ============

export async function getPrescriptions(): Promise<Prescription[]> {
  try {
    const data = await AsyncStorage.getItem(PRESCRIPTIONS_KEY);
    const prescriptions: Prescription[] = data ? JSON.parse(data) : [];
    // Sort by prescription date, newest first
    return prescriptions.sort(
      (a, b) =>
        new Date(b.prescriptionDate).getTime() -
        new Date(a.prescriptionDate).getTime()
    );
  } catch (error) {
    console.error("Error getting prescriptions:", error);
    return [];
  }
}

export async function getPrescriptionById(
  id: string
): Promise<Prescription | null> {
  try {
    const prescriptions = await getPrescriptions();
    return prescriptions.find((p) => p.id === id) || null;
  } catch (error) {
    console.error("Error getting prescription:", error);
    return null;
  }
}

export async function addPrescription(
  prescription: Prescription
): Promise<void> {
  try {
    const prescriptions = await getPrescriptions();
    prescriptions.push(prescription);
    await AsyncStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(prescriptions));

    // Sync to Firebase
    await syncOrQueuePrescription("prescription", "add", prescription);
  } catch (error) {
    console.error("Error adding prescription:", error);
    throw error;
  }
}

export async function updatePrescription(
  updatedPrescription: Prescription
): Promise<void> {
  try {
    const prescriptions = await getPrescriptions();
    const index = prescriptions.findIndex((p) => p.id === updatedPrescription.id);
    if (index !== -1) {
      prescriptions[index] = updatedPrescription;
      await AsyncStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(prescriptions));

      // Sync to Firebase
      await syncOrQueuePrescription("prescription", "update", updatedPrescription);
    }
  } catch (error) {
    console.error("Error updating prescription:", error);
    throw error;
  }
}

export async function deletePrescription(id: string): Promise<void> {
  try {
    const prescriptions = await getPrescriptions();
    const updatedPrescriptions = prescriptions.filter((p) => p.id !== id);
    await AsyncStorage.setItem(
      PRESCRIPTIONS_KEY,
      JSON.stringify(updatedPrescriptions)
    );

    // Sync deletion to Firebase
    await syncOrQueuePrescription("prescription", "delete", { id });
  } catch (error) {
    console.error("Error deleting prescription:", error);
    throw error;
  }
}

// ============ USER PROFILE OPERATIONS ============

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error getting user profile:", error);
    return {};
  }
}

export async function updateUserProfile(
  profile: UserProfile
): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));

    // Also sync to Firestore (sync as user profile document)
    const user = await getCurrentUser();
    if (user) {
      const projectId = ENV.FIREBASE_PROJECT_ID;
      if (projectId) {
        let idToken = await getIdToken();
        if (!idToken) {
          // Try to refresh if no token
          try {
            const { refreshIdToken } = await import("./firebase");
            idToken = await refreshIdToken();
          } catch (e) {
            console.warn("Could not refresh ID token");
          }
        }

        if (idToken) {
          try {
            const documentPath = `users/${user.uid}/profile/info`;
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;

            // Convert profile to Firestore format
            const fields: any = {};
            if (profile.name) fields.name = { stringValue: profile.name };
            if (profile.age) fields.age = { stringValue: profile.age };
            if (profile.address) fields.address = { stringValue: profile.address };
            if (profile.phone) fields.phone = { stringValue: profile.phone };
            if (profile.email) fields.email = { stringValue: profile.email };
            if (profile.bloodGroup) fields.bloodGroup = { stringValue: profile.bloodGroup };
            if (profile.allergies) fields.allergies = { stringValue: profile.allergies };
            if (profile.chronicConditions) fields.chronicConditions = { stringValue: profile.chronicConditions };
            if (profile.emergencyContact) fields.emergencyContact = { stringValue: profile.emergencyContact };
            if (profile.emergencyPhone) fields.emergencyPhone = { stringValue: profile.emergencyPhone };
            if (profile.dateOfBirth) fields.dateOfBirth = { stringValue: profile.dateOfBirth };
            if (profile.gender) fields.gender = { stringValue: profile.gender };

            const response = await fetch(url, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`,
              },
              body: JSON.stringify({ fields }),
            });

            if (response.ok) {
              console.log("✓ User profile synced to Firestore");
            }
          } catch (error) {
            console.warn("Failed to sync profile to Firestore:", error);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}
