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
    const status = prescription.createdByRole === "doctor" ? "pending" : "approved";
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Firebase project ID not configured");

    const idToken = await getIdToken();
    if (!idToken) throw new Error("Not authenticated");

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions`;

    // Build Firestore document fields
    const fields: any = {
      createdBy: { stringValue: prescription.createdBy },
      createdByRole: { stringValue: prescription.createdByRole },
      patientId: { stringValue: prescription.patientId },
      title: { stringValue: prescription.title },
      status: { stringValue: status },
      sharedWith: { arrayValue: { values: prescription.sharedWith.map((s) => ({ stringValue: s })) } },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    };

    if (prescription.doctorId) fields.doctorId = { stringValue: prescription.doctorId };
    if (prescription.diagnosis) fields.diagnosis = { stringValue: prescription.diagnosis };
    if (prescription.notes) fields.notes = { stringValue: prescription.notes };
    if (prescription.instructions) fields.instructions = { stringValue: prescription.instructions };
    if (prescription.patientName) fields.patientName = { stringValue: prescription.patientName };
    if (prescription.patientAge) fields.patientAge = { stringValue: prescription.patientAge };
    if (prescription.patientGender) fields.patientGender = { stringValue: prescription.patientGender };
    if (prescription.patientPhone) fields.patientPhone = { stringValue: prescription.patientPhone };
    if (prescription.doctorName) fields.doctorName = { stringValue: prescription.doctorName };
    if (prescription.doctorSpecialty) fields.doctorSpecialty = { stringValue: prescription.doctorSpecialty };
    if (prescription.doctorPhone) fields.doctorPhone = { stringValue: prescription.doctorPhone };
    if (prescription.doctorLicense) fields.doctorLicense = { stringValue: prescription.doctorLicense };
    if (prescription.clinicName) fields.clinicName = { stringValue: prescription.clinicName };

    // Medications array
    if (prescription.medications?.length > 0) {
      fields.medications = {
        arrayValue: {
          values: prescription.medications.map((med) => ({
            mapValue: {
              fields: {
                name: { stringValue: med.name },
                ...(med.dosage && { dosage: { stringValue: med.dosage } }),
                ...(med.frequency && { frequency: { stringValue: med.frequency } }),
                ...(med.duration && { duration: { stringValue: med.duration } }),
                ...(med.instructions && { instructions: { stringValue: med.instructions } }),
              },
            },
          })),
        },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error creating prescription:", response.status, errorText);
      throw new Error("Failed to create prescription");
    }

    const result = await response.json();
    const prescriptionId = result.name.split("/").pop();

    // Send notification to patient
    const notificationUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notifications`;
    const notifyUserId = prescription.createdByRole === "doctor" ? prescription.patientId : prescription.doctorId;
    if (notifyUserId) {
      await fetch(notificationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            userId: { stringValue: notifyUserId },
            type: { stringValue: prescription.createdByRole === "doctor" ? "prescription_pending_approval" : "prescription_shared" },
            title: { stringValue: prescription.createdByRole === "doctor" ? "New Prescription Pending Approval" : "New Prescription Shared" },
            message: {
              stringValue:
                prescription.createdByRole === "doctor"
                  ? `Dr. ${prescription.doctorName || "Your doctor"} sent you a prescription. Please review and approve.`
                  : `${prescription.patientName} shared a prescription with you`,
            },
            data: {
              mapValue: {
                fields: {
                  prescriptionId: { stringValue: prescriptionId },
                  fromUserId: { stringValue: prescription.createdBy },
                },
              },
            },
            read: { booleanValue: false },
            createdAt: { timestampValue: new Date().toISOString() },
          },
        }),
      });
    }

    return prescriptionId;
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
 * Maps to the Medication interface and schedules reminders
 */
async function createMedicationsFromPrescription(
  prescription: SharedPrescription
): Promise<void> {
  try {
    const { addMedication } = await import("./storage");
    const { updateMedicationReminders } = await import("./notifications");

    const colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899"];

    for (let i = 0; i < prescription.medications.length; i++) {
      const med = prescription.medications[i];

      // Parse frequency to determine reminder times
      const frequency = med.frequency?.toLowerCase() || "";
      let times: string[] = ["09:00"];

      if (frequency.includes("3") || frequency.includes("thrice") || frequency.includes("ter")) {
        times = ["08:00", "14:00", "20:00"];
      } else if (frequency.includes("2") || frequency.includes("twice") || frequency.includes("bid")) {
        times = ["09:00", "21:00"];
      } else if (frequency.includes("4") || frequency.includes("qid")) {
        times = ["08:00", "12:00", "16:00", "20:00"];
      } else if (frequency.includes("morning") || frequency.includes("am")) {
        times = ["08:00"];
      } else if (frequency.includes("night") || frequency.includes("bedtime") || frequency.includes("pm")) {
        times = ["21:00"];
      } else {
        times = ["09:00"];
      }

      // Parse duration
      const durationStr = med.duration || "7 days";
      const durationMatch = durationStr.match(/(\d+)/);
      const daysSupply = durationMatch ? parseInt(durationMatch[1]) : 7;

      // Calculate total supply
      const totalSupply = times.length * daysSupply;
      const refillAt = Math.max(3, Math.floor(totalSupply * 0.2));

      const medication = {
        id: Math.random().toString(36).slice(2, 11),
        name: med.name,
        dosage: med.dosage || "As prescribed",
        times,
        startDate: new Date().toISOString().split("T")[0],
        duration: durationStr,
        color: colors[i % colors.length],
        reminderEnabled: true,
        currentSupply: totalSupply,
        totalSupply,
        refillAt,
        refillReminder: true,
      };

      await addMedication(medication);
      await updateMedicationReminders(medication);
    }

    console.log(`✓ Created ${prescription.medications.length} medications with reminders from prescription`);
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
 * Get connected doctors for a patient (uses REST API for Expo Go compatibility)
 */
export type ConnectedUserProfile = UserProfile & { id: string };

export async function getConnectedDoctors(
  patientId: string
): Promise<ConnectedUserProfile[]> {
  try {
    const { getPatientConnections } = await import("./connections");
    const connections = await getPatientConnections(patientId);

    const doctors: ConnectedUserProfile[] = [];
    for (const conn of connections) {
      if (conn.status === "accepted" && conn.doctorId) {
        const { getUserProfile } = await import("./userManagement");
        const profile = await getUserProfile(conn.doctorId);
        if (profile) {
          doctors.push({ ...profile, id: conn.doctorId });
        }
      }
    }
    return doctors;
  } catch (error) {
    console.error("Error getting connected doctors:", error);
    return [];
  }
}

/**
 * Get connected patients for a doctor (uses REST API for Expo Go compatibility)
 */
export async function getConnectedPatients(
  doctorId: string
): Promise<ConnectedUserProfile[]> {
  try {
    const { getDoctorConnections } = await import("./connections");
    const connections = await getDoctorConnections(doctorId);

    const patients: ConnectedUserProfile[] = [];
    for (const conn of connections) {
      if (conn.status === "accepted" && conn.patientId) {
        const { getUserProfile } = await import("./userManagement");
        const profile = await getUserProfile(conn.patientId);
        if (profile) {
          patients.push({ ...profile, id: conn.patientId });
        }
      }
    }
    return patients;
  } catch (error) {
    console.error("Error getting connected patients:", error);
    return [];
  }
}
