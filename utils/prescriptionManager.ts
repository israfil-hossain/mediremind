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
      try {
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
      } catch (nativeError) {
        console.log("Native Firestore query failed, falling back to REST API:", nativeError);
        // Fall through to REST API fallback
      }
    }

    // REST API fallback: fetch all prescriptions and filter client-side
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.log("Firebase project ID not configured, returning empty list");
      return [];
    }

    const idToken = await getIdToken();
    if (!idToken) {
      console.log("Not authenticated, returning empty prescriptions list");
      return [];
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      console.error("REST API error fetching prescriptions:", response.status);
      return [];
    }

    const data = await response.json();
    if (!data.documents) return [];

    const fieldFilter = role === "doctor" ? "doctorId" : "patientId";
    const prescriptions: SharedPrescription[] = [];

    for (const doc of data.documents) {
      const fields = doc.fields || {};
      const fieldValue = fields[fieldFilter]?.stringValue;

      if (fieldValue === userId) {
        const prescription: any = {
          id: doc.name.split("/").pop(),
          createdBy: fields.createdBy?.stringValue || "",
          createdByRole: fields.createdByRole?.stringValue || "doctor",
          patientId: fields.patientId?.stringValue || "",
          title: fields.title?.stringValue || "",
          status: fields.status?.stringValue || "pending",
          sharedWith: fields.sharedWith?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
          createdAt: fields.createdAt?.timestampValue || null,
          updatedAt: fields.updatedAt?.timestampValue || null,
        };

        if (fields.doctorId) prescription.doctorId = fields.doctorId.stringValue;
        if (fields.diagnosis) prescription.diagnosis = fields.diagnosis.stringValue;
        if (fields.notes) prescription.notes = fields.notes.stringValue;
        if (fields.instructions) prescription.instructions = fields.instructions.stringValue;
        if (fields.patientName) prescription.patientName = fields.patientName.stringValue;
        if (fields.patientAge) prescription.patientAge = fields.patientAge.stringValue;
        if (fields.patientGender) prescription.patientGender = fields.patientGender.stringValue;
        if (fields.patientPhone) prescription.patientPhone = fields.patientPhone.stringValue;
        if (fields.doctorName) prescription.doctorName = fields.doctorName.stringValue;
        if (fields.doctorSpecialty) prescription.doctorSpecialty = fields.doctorSpecialty.stringValue;
        if (fields.doctorPhone) prescription.doctorPhone = fields.doctorPhone.stringValue;
        if (fields.doctorLicense) prescription.doctorLicense = fields.doctorLicense.stringValue;
        if (fields.clinicName) prescription.clinicName = fields.clinicName.stringValue;

        if (fields.medications?.arrayValue?.values) {
          prescription.medications = fields.medications.arrayValue.values.map((medVal: any) => {
            const medFields = medVal.mapValue?.fields || {};
            return {
              name: medFields.name?.stringValue || "",
              dosage: medFields.dosage?.stringValue,
              frequency: medFields.frequency?.stringValue,
              duration: medFields.duration?.stringValue,
              instructions: medFields.instructions?.stringValue,
            };
          });
        } else {
          prescription.medications = [];
        }

        prescriptions.push(prescription as SharedPrescription);
      }
    }

    // Sort by createdAt descending
    prescriptions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return prescriptions;
  } catch (error) {
    console.error("Error getting prescriptions:", error);
    return [];
  }
}

/**
 * Parse a Firestore REST API document into a SharedPrescription
 */
function parsePrescriptionFromREST(doc: any): SharedPrescription {
  const fields = doc.fields || {};
  const prescription: any = {
    id: doc.name.split("/").pop(),
    createdBy: fields.createdBy?.stringValue || "",
    createdByRole: fields.createdByRole?.stringValue || "doctor",
    patientId: fields.patientId?.stringValue || "",
    title: fields.title?.stringValue || "",
    status: fields.status?.stringValue || "pending",
    sharedWith: fields.sharedWith?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
    createdAt: fields.createdAt?.timestampValue || null,
    updatedAt: fields.updatedAt?.timestampValue || null,
  };

  if (fields.doctorId) prescription.doctorId = fields.doctorId.stringValue;
  if (fields.diagnosis) prescription.diagnosis = fields.diagnosis.stringValue;
  if (fields.notes) prescription.notes = fields.notes.stringValue;
  if (fields.instructions) prescription.instructions = fields.instructions.stringValue;
  if (fields.patientName) prescription.patientName = fields.patientName.stringValue;
  if (fields.patientAge) prescription.patientAge = fields.patientAge.stringValue;
  if (fields.patientGender) prescription.patientGender = fields.patientGender.stringValue;
  if (fields.patientPhone) prescription.patientPhone = fields.patientPhone.stringValue;
  if (fields.doctorName) prescription.doctorName = fields.doctorName.stringValue;
  if (fields.doctorSpecialty) prescription.doctorSpecialty = fields.doctorSpecialty.stringValue;
  if (fields.doctorPhone) prescription.doctorPhone = fields.doctorPhone.stringValue;
  if (fields.doctorLicense) prescription.doctorLicense = fields.doctorLicense.stringValue;
  if (fields.clinicName) prescription.clinicName = fields.clinicName.stringValue;

  if (fields.medications?.arrayValue?.values) {
    prescription.medications = fields.medications.arrayValue.values.map((medVal: any) => {
      const medFields = medVal.mapValue?.fields || {};
      return {
        name: medFields.name?.stringValue || "",
        dosage: medFields.dosage?.stringValue,
        frequency: medFields.frequency?.stringValue,
        duration: medFields.duration?.stringValue,
        instructions: medFields.instructions?.stringValue,
      };
    });
  } else {
    prescription.medications = [];
  }

  return prescription as SharedPrescription;
}

/**
 * Build REST API PATCH fields from partial prescription updates
 */
function buildRestPatchFields(updates: Partial<SharedPrescription>): Record<string, any> {
  const fields: Record<string, any> = {};

  if (updates.title !== undefined) fields.title = { stringValue: updates.title };
  if (updates.diagnosis !== undefined) fields.diagnosis = { stringValue: updates.diagnosis };
  if (updates.notes !== undefined) fields.notes = { stringValue: updates.notes };
  if (updates.instructions !== undefined) fields.instructions = { stringValue: updates.instructions };
  if (updates.status !== undefined) fields.status = { stringValue: updates.status };
  if (updates.patientName !== undefined) fields.patientName = { stringValue: updates.patientName };
  if (updates.doctorName !== undefined) fields.doctorName = { stringValue: updates.doctorName };
  if (updates.rejectionReason !== undefined) fields.rejectionReason = { stringValue: updates.rejectionReason };

  if (updates.medications !== undefined) {
    fields.medications = {
      arrayValue: {
        values: (updates.medications || []).map((med) => ({
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

  return fields;
}

/**
 * Get a specific prescription by ID
 */
export async function getPrescriptionById(
  prescriptionId: string
): Promise<SharedPrescription | null> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (firestore) {
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
      } catch (nativeError) {
        console.log("Native Firestore getPrescriptionById failed, falling back to REST API:", nativeError);
      }
    }

    // REST API fallback
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) return null;

    const idToken = await getIdToken();
    if (!idToken) return null;

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions/${prescriptionId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) {
      console.error("REST API error fetching prescription:", response.status);
      return null;
    }

    const doc = await response.json();
    return parsePrescriptionFromREST(doc);
  } catch (error) {
    console.error("Error getting prescription:", error);
    return null;
  }
}

/**
 * Update a prescription
 */
export async function updatePrescription(
  prescriptionId: string,
  updates: Partial<SharedPrescription>
): Promise<void> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (firestore) {
      try {
        await firestore()
          .collection("prescriptions")
          .doc(prescriptionId)
          .update({
            ...updates,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        return;
      } catch (nativeError) {
        console.log("Native Firestore updatePrescription failed, falling back to REST API:", nativeError);
      }
    }

    // REST API fallback
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Firebase project ID not configured");

    const idToken = await getIdToken();
    if (!idToken) throw new Error("Not authenticated");

    const patchFieldNames = Object.keys({ ...buildRestPatchFields(updates), updatedAt: true });
    const updateMask = patchFieldNames.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions/${prescriptionId}?${updateMask}`;
    const patchFields = {
      fields: {
        ...buildRestPatchFields(updates),
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    };

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(patchFields),
    });

    if (!response.ok) {
      throw new Error("Failed to update prescription via REST API");
    }
  } catch (error) {
    console.error("Error updating prescription:", error);
    throw new Error("Failed to update prescription");
  }
}

/**
 * Delete a prescription
 */
export async function deletePrescription(prescriptionId: string): Promise<void> {
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (firestore) {
      try {
        await firestore().collection("prescriptions").doc(prescriptionId).delete();
        return;
      } catch (nativeError) {
        console.log("Native Firestore deletePrescription failed, falling back to REST API:", nativeError);
      }
    }

    // REST API fallback
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Firebase project ID not configured");

    const idToken = await getIdToken();
    if (!idToken) throw new Error("Not authenticated");

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions/${prescriptionId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to delete prescription via REST API");
    }
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

    if (firestore) {
      try {
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
      } catch (nativeError) {
        console.log("Native Firestore query failed for pending prescriptions, falling back to REST API:", nativeError);
        // Fall through to REST API fallback
      }
    }

    // REST API fallback: fetch all prescriptions and filter client-side
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.log("Firebase project ID not configured, returning empty list");
      return [];
    }

    const idToken = await getIdToken();
    if (!idToken) {
      console.log("Not authenticated, returning empty pending prescriptions list");
      return [];
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      console.error("REST API error fetching pending prescriptions:", response.status);
      return [];
    }

    const data = await response.json();
    if (!data.documents) return [];

    const prescriptions: SharedPrescription[] = [];

    for (const doc of data.documents) {
      const fields = doc.fields || {};
      const docPatientId = fields.patientId?.stringValue;
      const docStatus = fields.status?.stringValue;

      if (docPatientId === patientId && docStatus === "pending") {
        const prescription: any = {
          id: doc.name.split("/").pop(),
          createdBy: fields.createdBy?.stringValue || "",
          createdByRole: fields.createdByRole?.stringValue || "doctor",
          patientId: fields.patientId?.stringValue || "",
          title: fields.title?.stringValue || "",
          status: fields.status?.stringValue || "pending",
          sharedWith: fields.sharedWith?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
          createdAt: fields.createdAt?.timestampValue || null,
          updatedAt: fields.updatedAt?.timestampValue || null,
        };

        if (fields.doctorId) prescription.doctorId = fields.doctorId.stringValue;
        if (fields.diagnosis) prescription.diagnosis = fields.diagnosis.stringValue;
        if (fields.notes) prescription.notes = fields.notes.stringValue;
        if (fields.instructions) prescription.instructions = fields.instructions.stringValue;
        if (fields.patientName) prescription.patientName = fields.patientName.stringValue;
        if (fields.patientAge) prescription.patientAge = fields.patientAge.stringValue;
        if (fields.patientGender) prescription.patientGender = fields.patientGender.stringValue;
        if (fields.patientPhone) prescription.patientPhone = fields.patientPhone.stringValue;
        if (fields.doctorName) prescription.doctorName = fields.doctorName.stringValue;
        if (fields.doctorSpecialty) prescription.doctorSpecialty = fields.doctorSpecialty.stringValue;
        if (fields.doctorPhone) prescription.doctorPhone = fields.doctorPhone.stringValue;
        if (fields.doctorLicense) prescription.doctorLicense = fields.doctorLicense.stringValue;
        if (fields.clinicName) prescription.clinicName = fields.clinicName.stringValue;

        if (fields.medications?.arrayValue?.values) {
          prescription.medications = fields.medications.arrayValue.values.map((medVal: any) => {
            const medFields = medVal.mapValue?.fields || {};
            return {
              name: medFields.name?.stringValue || "",
              dosage: medFields.dosage?.stringValue,
              frequency: medFields.frequency?.stringValue,
              duration: medFields.duration?.stringValue,
              instructions: medFields.instructions?.stringValue,
            };
          });
        } else {
          prescription.medications = [];
        }

        prescriptions.push(prescription as SharedPrescription);
      }
    }

    // Sort by createdAt descending
    prescriptions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
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

    if (firestore) {
      try {
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
        return;
      } catch (nativeError) {
        console.log("Native Firestore approvePrescription failed, falling back to REST API:", nativeError);
      }
    }

    // REST API fallback
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Firebase project ID not configured");

    const idToken = await getIdToken();
    if (!idToken) throw new Error("Not authenticated");

    // Get the prescription first via REST
    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions/${prescriptionId}`;
    const getResponse = await fetch(getUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!getResponse.ok) {
      throw new Error("Prescription not found");
    }

    const prescriptionDoc = await getResponse.json();
    const prescription = parsePrescriptionFromREST(prescriptionDoc);

    // Update prescription status via REST PATCH
    const approvePatchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions/${prescriptionId}?updateMask.fieldPaths=status&updateMask.fieldPaths=approvedAt&updateMask.fieldPaths=updatedAt`;
    const patchResponse = await fetch(approvePatchUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: "approved" },
          approvedAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!patchResponse.ok) {
      throw new Error("Failed to approve prescription via REST API");
    }

    // Notify the doctor via REST
    if (prescription.doctorId) {
      const notifUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notifications`;
      await fetch(notifUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            userId: { stringValue: prescription.doctorId },
            type: { stringValue: "prescription_approved" },
            title: { stringValue: "Prescription Approved" },
            message: { stringValue: `${prescription.patientName} has approved your prescription: ${prescription.title}` },
            data: {
              mapValue: {
                fields: {
                  prescriptionId: { stringValue: prescriptionId },
                  patientId: { stringValue: patientId },
                },
              },
            },
            read: { booleanValue: false },
            createdAt: { timestampValue: new Date().toISOString() },
          },
        }),
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

    if (firestore) {
      try {
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
        return;
      } catch (nativeError) {
        console.log("Native Firestore rejectPrescription failed, falling back to REST API:", nativeError);
      }
    }

    // REST API fallback
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Firebase project ID not configured");

    const idToken = await getIdToken();
    if (!idToken) throw new Error("Not authenticated");

    // Get the prescription first via REST
    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions/${prescriptionId}`;
    const getResponse = await fetch(getUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!getResponse.ok) {
      throw new Error("Prescription not found");
    }

    const prescriptionDoc = await getResponse.json();
    const prescription = parsePrescriptionFromREST(prescriptionDoc);

    // Update prescription status via REST PATCH
    const rejectPatchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions/${prescriptionId}?updateMask.fieldPaths=status&updateMask.fieldPaths=rejectedAt&updateMask.fieldPaths=rejectionReason&updateMask.fieldPaths=updatedAt`;
    const patchResponse = await fetch(rejectPatchUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: "rejected" },
          rejectedAt: { timestampValue: new Date().toISOString() },
          rejectionReason: { stringValue: reason || "" },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!patchResponse.ok) {
      throw new Error("Failed to reject prescription via REST API");
    }

    // Notify the doctor via REST
    if (prescription.doctorId) {
      const notifUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notifications`;
      await fetch(notifUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            userId: { stringValue: prescription.doctorId },
            type: { stringValue: "prescription_rejected" },
            title: { stringValue: "Prescription Rejected" },
            message: { stringValue: `${prescription.patientName} has rejected your prescription: ${prescription.title}` },
            data: {
              mapValue: {
                fields: {
                  prescriptionId: { stringValue: prescriptionId },
                  patientId: { stringValue: patientId },
                  reason: { stringValue: reason || "" },
                },
              },
            },
            read: { booleanValue: false },
            createdAt: { timestampValue: new Date().toISOString() },
          },
        }),
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
  try {
    await initializeFirebase();
    const firestore = getFirestore();

    if (firestore) {
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
        return;
      } catch (nativeError) {
        console.log("Native Firestore sharePrescription failed, falling back to REST API:", nativeError);
      }
    }

    // REST API fallback
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Firebase project ID not configured");

    const idToken = await getIdToken();
    if (!idToken) throw new Error("Not authenticated");

    // Get the prescription first
    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prescriptions/${prescriptionId}`;
    const getResponse = await fetch(getUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!getResponse.ok) {
      throw new Error("Prescription not found");
    }

    const prescriptionDoc = await getResponse.json();
    const prescription = parsePrescriptionFromREST(prescriptionDoc);
    const newSharedWith = [...new Set([...prescription.sharedWith, ...userIds])];

    // Update sharedWith
    const sharePatchUrl = `${getUrl}?updateMask.fieldPaths=sharedWith&updateMask.fieldPaths=updatedAt`;
    const patchResponse = await fetch(sharePatchUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          sharedWith: { arrayValue: { values: newSharedWith.map((s) => ({ stringValue: s })) } },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!patchResponse.ok) {
      throw new Error("Failed to update share list via REST API");
    }

    // Send notifications
    const notifUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notifications`;
    for (const userId of userIds) {
      if (!prescription.sharedWith.includes(userId)) {
        await fetch(notifUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            fields: {
              userId: { stringValue: userId },
              type: { stringValue: "prescription_shared" },
              title: { stringValue: "Prescription Shared" },
              message: {
                stringValue:
                  prescription.createdByRole === "doctor"
                    ? `Dr. ${prescription.doctorName} shared a prescription with you`
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
