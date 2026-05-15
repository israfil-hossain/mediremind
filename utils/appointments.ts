import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "../config/env";

const ID_TOKEN_KEY = "@firebase_id_token";

async function getIdToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ID_TOKEN_KEY);
  } catch {
    return null;
  }
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string; // ISO date string
  time: string; // e.g., "10:00"
  reason: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
}

function fromFirestoreDocument(doc: any): any {
  if (!doc.fields) return {};
  const data: any = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    const fieldValue = value as any;
    if (fieldValue.stringValue !== undefined) {
      data[key] = fieldValue.stringValue;
    } else if (fieldValue.doubleValue !== undefined) {
      data[key] = fieldValue.doubleValue;
    } else if (fieldValue.integerValue !== undefined) {
      data[key] = parseInt(fieldValue.integerValue);
    } else if (fieldValue.booleanValue !== undefined) {
      data[key] = fieldValue.booleanValue;
    } else if (fieldValue.arrayValue) {
      data[key] =
        fieldValue.arrayValue.values?.map(
          (v: any) =>
            v.stringValue || v.doubleValue || v.integerValue || v.booleanValue
        ) || [];
    }
  }
  return data;
}

async function runQuery(structuredQuery: any): Promise<any[]> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase project ID not configured");

  const idToken = await getIdToken();
  if (!idToken) throw new Error("Not authenticated");

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ structuredQuery }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Firestore query error:", response.status, errorText);
    throw new Error(`Query failed: ${response.statusText}`);
  }

  const results = await response.json();
  return (results || [])
    .filter((r: any) => r.document)
    .map((r: any) => r.document);
}

// Create an appointment
export async function createAppointment(
  appointment: Omit<Appointment, "id" | "createdAt">
): Promise<string> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase project ID not configured");

  const idToken = await getIdToken();
  if (!idToken) throw new Error("Not authenticated");

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/appointments`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        doctorId: { stringValue: appointment.doctorId },
        patientId: { stringValue: appointment.patientId },
        patientName: { stringValue: appointment.patientName },
        doctorName: { stringValue: appointment.doctorName },
        date: { stringValue: appointment.date },
        time: { stringValue: appointment.time },
        reason: { stringValue: appointment.reason },
        status: { stringValue: appointment.status },
        notes: appointment.notes ? { stringValue: appointment.notes } : { nullValue: null },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error creating appointment:", response.status, errorText);
    throw new Error("Failed to create appointment");
  }

  const result = await response.json();
  return result.name.split("/").pop();
}

// Get appointments for a doctor
export async function getDoctorAppointments(doctorId: string): Promise<Appointment[]> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "appointments" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "doctorId" },
          op: "EQUAL",
          value: { stringValue: doctorId },
        },
      },
      orderBy: [
        { field: { fieldPath: "date" }, direction: "DESCENDING" },
        { field: { fieldPath: "time" }, direction: "DESCENDING" },
      ],
    });

    return documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      const data = fromFirestoreDocument(doc);
      return { ...data, id } as Appointment;
    });
  } catch (error) {
    console.error("Error getting doctor appointments:", error);
    return [];
  }
}

// Get appointments for a patient
export async function getPatientAppointments(patientId: string): Promise<Appointment[]> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "appointments" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "patientId" },
          op: "EQUAL",
          value: { stringValue: patientId },
        },
      },
      orderBy: [
        { field: { fieldPath: "date" }, direction: "DESCENDING" },
        { field: { fieldPath: "time" }, direction: "DESCENDING" },
      ],
    });

    return documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      const data = fromFirestoreDocument(doc);
      return { ...data, id } as Appointment;
    });
  } catch (error) {
    console.error("Error getting patient appointments:", error);
    return [];
  }
}

// Get today's appointments for a doctor
export async function getDoctorTodayAppointments(doctorId: string): Promise<Appointment[]> {
  const today = new Date().toISOString().split("T")[0];
  try {
    const documents = await runQuery({
      from: [{ collectionId: "appointments" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "doctorId" },
                op: "EQUAL",
                value: { stringValue: doctorId },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "date" },
                op: "EQUAL",
                value: { stringValue: today },
              },
            },
          ],
        },
      },
    });

    return documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      const data = fromFirestoreDocument(doc);
      return { ...data, id } as Appointment;
    });
  } catch (error) {
    console.error("Error getting today's appointments:", error);
    return [];
  }
}

// Update appointment status
export async function updateAppointmentStatus(
  appointmentId: string,
  status: Appointment["status"]
): Promise<void> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase project ID not configured");

  const idToken = await getIdToken();
  if (!idToken) throw new Error("Not authenticated");

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/appointments/${appointmentId}?updateMask.fieldPaths=status`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error updating appointment:", response.status, errorText);
    throw new Error("Failed to update appointment");
  }
}

// Delete appointment
export async function deleteAppointment(appointmentId: string): Promise<void> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase project ID not configured");

  const idToken = await getIdToken();
  if (!idToken) throw new Error("Not authenticated");

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/appointments/${appointmentId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error deleting appointment:", response.status, errorText);
    throw new Error("Failed to delete appointment");
  }
}
