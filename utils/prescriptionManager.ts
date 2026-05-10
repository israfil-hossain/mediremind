import { getFirestore, initializeFirebase } from "./firebase";
import { UserProfile } from "./userManagement";
import { ENV } from "../config/env";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ID_TOKEN_KEY = "@firebase_id_token";

// Helper to get ID token from storage
async function getIdToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ID_TOKEN_KEY);
  } catch {
    return null;
  }
}

export interface PrescriptionMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface SharedPrescription {
  id: string;
  createdBy: string; // UID of creator
  createdByRole: "doctor" | "patient";
  patientId: string;
  doctorId?: string;

  // Prescription details
  title: string;
  diagnosis?: string;
  medications: PrescriptionMedication[];
  notes?: string;
  instructions?: string;

  // Patient info
  patientName: string;
  patientAge?: string;
  patientGender?: string;
  patientPhone?: string;

  // Doctor info (if created by doctor)
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPhone?: string;
  doctorLicense?: string;
  clinicName?: string;

  // Approval workflow
  status: "pending" | "approved" | "rejected";
  approvedAt?: any;
  rejectedAt?: any;
  rejectionReason?: string;

  // Sharing
  sharedWith: string[]; // Array of UIDs

  // Timestamps
  createdAt: any;
  updatedAt: any;
}

/**
 * Create a new prescription (from doctor or patient)
 */
export async function createPrescription(
  prescription: Omit<SharedPrescription, "id" | "createdAt" | "updatedAt" | "status">
): Promise<string> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (!firestore) {
      throw new Error("Firestore not available. Please check your connection.");
    }

    // Set status based on who created it
    // Doctor-created prescriptions need patient approval
    // Patient-created prescriptions are automatically approved
    const status = prescription.createdByRole === "doctor" ? "pending" : "approved";

    const docRef = await firestore().collection("prescriptions").add({
      ...prescription,
      status,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Send notification to shared users
    for (const userId of prescription.sharedWith) {
      await firestore().collection("notifications").add({
        userId,
        type: prescription.createdByRole === "doctor" ? "prescription_pending_approval" : "prescription_shared",
        title: prescription.createdByRole === "doctor" ? "New Prescription Pending Approval" : "New Prescription Shared",
        message:
          prescription.createdByRole === "doctor"
            ? `Dr. ${prescription.doctorName || "Your doctor"} sent you a prescription. Please review and approve.`
            : `${prescription.patientName} shared a prescription with you`,
        data: {
          prescriptionId: docRef.id,
          fromUserId: prescription.createdBy,
        },
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating prescription:", error);
    throw new Error("Failed to create prescription");
  }
}

/**
 * Get prescriptions for a user (as doctor or patient)
 */
export async function getUserPrescriptions(
  userId: string,
  role: "doctor" | "patient"
): Promise<SharedPrescription[]> {
  try {
    // Try to initialize Firebase first
    await initializeFirebase();
    const firestore = getFirestore();

    if (firestore) {
      // Use native Firestore if available
      let query;

      if (role === "doctor") {
        query = firestore()
          .collection("prescriptions")
          .where("doctorId", "==", userId)
          .orderBy("createdAt", "desc");
      } else {
        query = firestore()
          .collection("prescriptions")
          .where("patientId", "==", userId)
          .orderBy("createdAt", "desc");
      }

      const snapshot = await query.get();
      const prescriptions: SharedPrescription[] = [];

      snapshot.forEach((doc: any) => {
        prescriptions.push({
          id: doc.id,
          ...doc.data(),
        } as SharedPrescription);
      });

      return prescriptions;
    }

    // Fallback: Return empty array if Firestore not available
    // In production, you'd want to use REST API here too
    console.log("Firestore not available, returning empty prescriptions list");
    return [];
  } catch (error) {
    console.error("Error getting prescriptions:", error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Get a specific prescription by ID
 */
export async function getPrescriptionById(
  prescriptionId: string
): Promise<SharedPrescription | null> {
  const firestore = getFirestore();
  if (!firestore) {
    throw new Error("Firestore not initialized");
  }

  try {
    const doc = await firestore()
      .collection("prescriptions")
      .doc(prescriptionId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as SharedPrescription;
  } catch (error) {
    console.error("Error getting prescription:", error);
    throw new Error("Failed to get prescription");
  }
}

/**
 * Update a prescription
 */
export async function updatePrescription(
  prescriptionId: string,
  updates: Partial<SharedPrescription>
): Promise<void> {
  const firestore = getFirestore();
  if (!firestore) {
    throw new Error("Firestore not initialized");
  }

  try {
    await firestore()
      .collection("prescriptions")
      .doc(prescriptionId)
      .update({
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("Error updating prescription:", error);
    throw new Error("Failed to update prescription");
  }
}

/**
 * Delete a prescription
 */
export async function deletePrescription(prescriptionId: string): Promise<void> {
  const firestore = getFirestore();
  if (!firestore) {
    throw new Error("Firestore not initialized");
  }

  try {
    await firestore().collection("prescriptions").doc(prescriptionId).delete();
  } catch (error) {
    console.error("Error deleting prescription:", error);
    throw new Error("Failed to delete prescription");
  }
}

/**
 * Get pending prescriptions for a patient
 */
export async function getPendingPrescriptions(
  patientId: string
): Promise<SharedPrescription[]> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (!firestore) {
      console.log("Firestore not available, returning empty list");
      return [];
    }

    const snapshot = await firestore()
      .collection("prescriptions")
      .where("patientId", "==", patientId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();

    const prescriptions: SharedPrescription[] = [];
    snapshot.forEach((doc: any) => {
      prescriptions.push({
        id: doc.id,
        ...doc.data(),
      } as SharedPrescription);
    });

    return prescriptions;
  } catch (error) {
    console.error("Error getting pending prescriptions:", error);
    return [];
  }
}

/**
 * Approve a prescription (by patient)
 */
export async function approvePrescription(
  prescriptionId: string,
  patientId: string
): Promise<void> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (!firestore) {
      throw new Error("Firestore not available");
    }

    // Get the prescription first
    const prescriptionDoc = await firestore()
      .collection("prescriptions")
      .doc(prescriptionId)
      .get();

    if (!prescriptionDoc.exists) {
      throw new Error("Prescription not found");
    }

    const prescription = prescriptionDoc.data() as SharedPrescription;

    // Update prescription status
    await firestore()
      .collection("prescriptions")
      .doc(prescriptionId)
      .update({
        status: "approved",
        approvedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Notify the doctor
    if (prescription.doctorId) {
      await firestore().collection("notifications").add({
        userId: prescription.doctorId,
        type: "prescription_approved",
        title: "Prescription Approved",
        message: `${prescription.patientName} has approved your prescription: ${prescription.title}`,
        data: {
          prescriptionId,
          patientId,
        },
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    }

    // Auto-create medications from approved prescription
    await createMedicationsFromPrescription(prescription);
  } catch (error) {
    console.error("Error approving prescription:", error);
    throw new Error("Failed to approve prescription");
  }
}

/**
 * Reject a prescription (by patient)
 */
export async function rejectPrescription(
  prescriptionId: string,
  patientId: string,
  reason?: string
): Promise<void> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (!firestore) {
      throw new Error("Firestore not available");
    }

    // Get the prescription first
    const prescriptionDoc = await firestore()
      .collection("prescriptions")
      .doc(prescriptionId)
      .get();

    if (!prescriptionDoc.exists) {
      throw new Error("Prescription not found");
    }

    const prescription = prescriptionDoc.data() as SharedPrescription;

    // Update prescription status
    await firestore()
      .collection("prescriptions")
      .doc(prescriptionId)
      .update({
        status: "rejected",
        rejectedAt: firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason || "",
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Notify the doctor
    if (prescription.doctorId) {
      await firestore().collection("notifications").add({
        userId: prescription.doctorId,
        type: "prescription_rejected",
        title: "Prescription Rejected",
        message: `${prescription.patientName} has rejected your prescription: ${prescription.title}`,
        data: {
          prescriptionId,
          patientId,
          reason: reason || "",
        },
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error rejecting prescription:", error);
    throw new Error("Failed to reject prescription");
  }
}

/**
 * Create medications from an approved prescription
 */
async function createMedicationsFromPrescription(
  prescription: SharedPrescription
): Promise<void> {
  try {
    // Import storage functions dynamically to avoid circular dependencies
    const { addMedication } = await import("./storage");

    // Create a medication for each medication in the prescription
    for (const med of prescription.medications) {
      // Parse frequency to determine times per day
      const frequency = med.frequency?.toLowerCase() || "";
      let timesPerDay = 1;
      let reminderTimes: string[] = ["09:00"];

      if (frequency.includes("3") || frequency.includes("thrice") || frequency.includes("ter")) {
        timesPerDay = 3;
        reminderTimes = ["08:00", "13:00", "20:00"];
      } else if (frequency.includes("2") || frequency.includes("twice") || frequency.includes("bid")) {
        timesPerDay = 2;
        reminderTimes = ["09:00", "21:00"];
      } else if (frequency.includes("4") || frequency.includes("qid")) {
        timesPerDay = 4;
        reminderTimes = ["08:00", "13:00", "18:00", "22:00"];
      } else if (frequency.includes("1") || frequency.includes("once") || frequency.includes("daily")) {
        timesPerDay = 1;
        reminderTimes = ["09:00"];
      }

      // Parse duration to calculate stock and end date
      const duration = med.duration?.toLowerCase() || "";
      let daysSupply = 7; // Default to 7 days

      if (duration.includes("7") || duration.includes("week")) {
        daysSupply = 7;
      } else if (duration.includes("14") || duration.includes("2 week")) {
        daysSupply = 14;
      } else if (duration.includes("30") || duration.includes("month")) {
        daysSupply = 30;
      } else if (duration.includes("7") || duration.includes("week")) {
        daysSupply = 7;
      }

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysSupply);

      // Calculate total stock needed
      const totalStock = timesPerDay * daysSupply;

      await addMedication({
        name: med.name,
        dosage: med.dosage || "As prescribed",
        frequency: med.frequency || "Once daily",
        timesPerDay,
        reminderTimes,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        stock: totalStock,
        instructions: med.instructions || prescription.instructions || "",
        notes: `From prescription: ${prescription.title}`,
        prescriptionRef: prescription.id,
      });
    }

    console.log(`✓ Created ${prescription.medications.length} medications from prescription`);
  } catch (error) {
    console.error("Error creating medications from prescription:", error);
    throw new Error("Failed to create medications from prescription");
  }
}

/**
 * Share prescription with additional users
 */
export async function sharePrescription(
  prescriptionId: string,
  userIds: string[]
): Promise<void> {
  const firestore = getFirestore();
  if (!firestore) {
    throw new Error("Firestore not initialized");
  }

  try {
    const prescriptionDoc = await firestore()
      .collection("prescriptions")
      .doc(prescriptionId)
      .get();

    if (!prescriptionDoc.exists) {
      throw new Error("Prescription not found");
    }

    const prescription = prescriptionDoc.data() as SharedPrescription;
    const newSharedWith = [...new Set([...prescription.sharedWith, ...userIds])];

    await firestore().collection("prescriptions").doc(prescriptionId).update({
      sharedWith: newSharedWith,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Send notifications to newly shared users
    for (const userId of userIds) {
      if (!prescription.sharedWith.includes(userId)) {
        await firestore().collection("notifications").add({
          userId,
          type: "prescription_shared",
          title: "Prescription Shared",
          message:
            prescription.createdByRole === "doctor"
              ? `Dr. ${prescription.doctorName} shared a prescription with you`
              : `${prescription.patientName} shared a prescription with you`,
          data: {
            prescriptionId,
            fromUserId: prescription.createdBy,
          },
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error("Error sharing prescription:", error);
    throw new Error("Failed to share prescription");
  }
}

/**
 * Format prescription for WhatsApp sharing
 */
export function formatPrescriptionForWhatsApp(
  prescription: SharedPrescription
): string {
  let message = "📋 *PRESCRIPTION*\n\n";

  // Doctor info
  if (prescription.doctorName) {
    message += `👨‍⚕️ *Doctor:* Dr. ${prescription.doctorName}\n`;
    if (prescription.doctorSpecialty) {
      message += `*Specialty:* ${prescription.doctorSpecialty}\n`;
    }
    if (prescription.clinicName) {
      message += `*Clinic:* ${prescription.clinicName}\n`;
    }
    message += "\n";
  }

  // Patient info
  message += `👤 *Patient:* ${prescription.patientName}\n`;
  if (prescription.patientAge) {
    message += `*Age:* ${prescription.patientAge}\n`;
  }
  if (prescription.patientGender) {
    message += `*Gender:* ${prescription.patientGender}\n`;
  }
  message += "\n";

  // Diagnosis
  if (prescription.diagnosis) {
    message += `🔍 *Diagnosis:* ${prescription.diagnosis}\n\n`;
  }

  // Medications
  message += "💊 *MEDICATIONS:*\n\n";
  prescription.medications.forEach((med, index) => {
    message += `${index + 1}. *${med.name}*\n`;
    if (med.dosage) message += `   Dosage: ${med.dosage}\n`;
    if (med.frequency) message += `   Frequency: ${med.frequency}\n`;
    if (med.duration) message += `   Duration: ${med.duration}\n`;
    if (med.instructions) message += `   Instructions: ${med.instructions}\n`;
    message += "\n";
  });

  // Additional instructions
  if (prescription.instructions || prescription.notes) {
    message += "📝 *INSTRUCTIONS:*\n";
    message += `${prescription.instructions || prescription.notes}\n\n`;
  }

  // Footer
  const date = prescription.createdAt?.toDate
    ? prescription.createdAt.toDate().toLocaleDateString()
    : new Date().toLocaleDateString();
  message += `📅 *Date:* ${date}\n`;
  message += "\n_Shared via MediRemind App_";

  return message;
}

/**
 * Get connected doctors for a patient
 */
export async function getConnectedDoctors(
  patientId: string
): Promise<UserProfile[]> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (!firestore) {
      console.log("Firestore not available, returning empty doctors list");
      return [];
    }

    const snapshot = await firestore()
      .collection("connections")
      .where("patientId", "==", patientId)
      .where("status", "==", "accepted")
      .get();

    const doctors: UserProfile[] = [];

    for (const doc of snapshot.docs) {
      const connection = doc.data();
      const doctorDoc = await firestore()
        .collection("users")
        .doc(connection.doctorId)
        .get();

      if (doctorDoc.exists) {
        doctors.push(doctorDoc.data() as UserProfile);
      }
    }

    return doctors;
  } catch (error) {
    console.error("Error getting connected doctors:", error);
    return [];
  }
}

/**
 * Get connected patients for a doctor
 */
export async function getConnectedPatients(
  doctorId: string
): Promise<UserProfile[]> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (!firestore) {
      console.log("Firestore not available, returning empty patients list");
      return [];
    }

    const snapshot = await firestore()
      .collection("connections")
      .where("doctorId", "==", doctorId)
      .where("status", "==", "accepted")
      .get();

    const patients: UserProfile[] = [];

    for (const doc of snapshot.docs) {
      const connection = doc.data();
      const patientDoc = await firestore()
        .collection("users")
        .doc(connection.patientId)
        .get();

      if (patientDoc.exists) {
        patients.push(patientDoc.data() as UserProfile);
      }
    }

    return patients;
  } catch (error) {
    console.error("Error getting connected patients:", error);
    return [];
  }
}
