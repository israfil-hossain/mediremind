import AsyncStorage from "@react-native-async-storage/async-storage";
import { canAddMedication, getHistoryLimitDays } from "./subscription";
import {
  addToSyncQueue,
  getCurrentUser,
  isFirebaseReady,
  syncMedicationToFirebase,
  syncDoseHistoryToFirebase,
} from "./firebase";
import { getNetworkState } from "./networkSync";

const MEDICATIONS_KEY = "@medications";
const DOSE_HISTORY_KEY = "@dose_history";
const PRESCRIPTIONS_KEY = "@prescriptions";

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

  if (isOnline && isFirebaseReady()) {
    // Sync directly to Firebase
    try {
      if (type === "medication") {
        await syncMedicationToFirebase(data as Medication, action);
      } else {
        await syncDoseHistoryToFirebase(data as DoseHistory, action);
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
  title: string;
  doctorName?: string;
  prescriptionDate: string;
  notes?: string;
  imageUri?: string;
  medicationNames?: string[];
  createdAt: string;
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
    // TODO: Add Firebase sync support
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
      // TODO: Add Firebase sync support
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
    // TODO: Add Firebase sync support
  } catch (error) {
    console.error("Error deleting prescription:", error);
    throw error;
  }
}
