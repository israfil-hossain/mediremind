import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "../config/env";
import { UserProfile } from "./userManagement";

const ID_TOKEN_KEY = "@firebase_id_token";

async function getIdToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ID_TOKEN_KEY);
  } catch {
    return null;
  }
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
    } else if (fieldValue.mapValue) {
      data[key] = fromFirestoreDocument(fieldValue.mapValue);
    } else if (fieldValue.timestampValue !== undefined) {
      data[key] = fieldValue.timestampValue;
    }
  }
  return data;
}

export interface PatientConnection {
  id: string;
  doctorId: string;
  patientId: string;
  status: "pending" | "accepted" | "rejected";
  initiatedBy: "doctor" | "patient";
  createdAt: any;
  patientProfile?: UserProfile;
}

export interface PatientInvitation {
  id: string;
  doctorId: string;
  patientEmail: string;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt?: string;
}

async function runQuery(structuredQuery: any): Promise<any[]> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Firebase project ID not configured");
  }

  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error("Not authenticated");
  }

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

export async function searchPatientsByEmail(
  email: string
): Promise<(UserProfile & { id: string })[]> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "users" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "email" },
                op: "EQUAL",
                value: { stringValue: email.toLowerCase().trim() },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "role" },
                op: "EQUAL",
                value: { stringValue: "patient" },
              },
            },
          ],
        },
      },
      limit: 10,
    });

    return documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      return { ...fromFirestoreDocument(doc), id } as UserProfile & {
        id: string;
      };
    });
  } catch (error) {
    console.error("Error searching patients by email:", error);
    return [];
  }
}

export async function searchPatientsByPhone(
  phone: string
): Promise<(UserProfile & { id: string })[]> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "users" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "phone" },
                op: "EQUAL",
                value: { stringValue: phone.trim() },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "role" },
                op: "EQUAL",
                value: { stringValue: "patient" },
              },
            },
          ],
        },
      },
      limit: 10,
    });

    return documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      return { ...fromFirestoreDocument(doc), id } as UserProfile & {
        id: string;
      };
    });
  } catch (error) {
    console.error("Error searching patients by phone:", error);
    return [];
  }
}

export async function searchPatientsByName(
  name: string
): Promise<(UserProfile & { id: string })[]> {
  try {
    const query = name.trim();
    // Firestore prefix search using unicode range trick
    const documents = await runQuery({
      from: [{ collectionId: "users" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "name" },
                op: "GREATER_THAN_OR_EQUAL",
                value: { stringValue: query },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "name" },
                op: "LESS_THAN",
                value: { stringValue: query + "\uf8ff" },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "role" },
                op: "EQUAL",
                value: { stringValue: "patient" },
              },
            },
          ],
        },
      },
      limit: 20,
    });

    return documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      return { ...fromFirestoreDocument(doc), id } as UserProfile & {
        id: string;
      };
    });
  } catch (error) {
    console.error("Error searching patients by name:", error);
    return [];
  }
}

export async function searchPatients(
  query: string
): Promise<{ patients: (UserProfile & { id: string })[]; searchTypes: string[] }> {
  const trimmed = query.trim();
  if (!trimmed) return { patients: [], searchTypes: [] };

  const results: (UserProfile & { id: string })[] = [];
  const searchTypes: string[] = [];
  const seenIds = new Set<string>();

  // Try email search (if looks like email)
  if (trimmed.includes("@")) {
    searchTypes.push("email");
    const emailResults = await searchPatientsByEmail(trimmed);
    for (const p of emailResults) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        results.push(p);
      }
    }
  }

  // Try phone search (if mostly digits after removing common separators)
  const digitsOnly = trimmed.replace(/[\s\-\+\(\)]/g, "");
  if (/^\d+$/.test(digitsOnly) && digitsOnly.length >= 7) {
    searchTypes.push("phone");
    const phoneResults = await searchPatientsByPhone(trimmed);
    for (const p of phoneResults) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        results.push(p);
      }
    }
  }

  // Try name search (always, as fallback or primary if no specific format)
  if (results.length === 0 || !trimmed.includes("@")) {
    searchTypes.push("name");
    const nameResults = await searchPatientsByName(trimmed);
    for (const p of nameResults) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        results.push(p);
      }
    }
  }

  return { patients: results, searchTypes };
}

export async function checkExistingConnection(
  doctorId: string,
  patientId: string
): Promise<boolean> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "connections" }],
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
                field: { fieldPath: "patientId" },
                op: "EQUAL",
                value: { stringValue: patientId },
              },
            },
          ],
        },
      },
      limit: 1,
    });

    return documents.length > 0;
  } catch (error) {
    console.error("Error checking existing connection:", error);
    return false;
  }
}

export async function getDoctorConnections(
  doctorId: string
): Promise<PatientConnection[]> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "connections" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "doctorId" },
          op: "EQUAL",
          value: { stringValue: doctorId },
        },
      },
    });

    const connections: PatientConnection[] = [];
    for (const doc of documents) {
      const id = doc.name.split("/").pop();
      const data = fromFirestoreDocument(doc);
      connections.push({
        id,
        doctorId: data.doctorId,
        patientId: data.patientId,
        status: data.status,
        initiatedBy: data.initiatedBy,
        createdAt: data.createdAt,
      });
    }

    // Sort: pending first, then by date descending
    connections.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return connections;
  } catch (error) {
    console.error("Error getting doctor connections:", error);
    return [];
  }
}

export async function getPatientConnections(
  patientId: string
): Promise<PatientConnection[]> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "connections" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "patientId" },
          op: "EQUAL",
          value: { stringValue: patientId },
        },
      },
    });

    const connections: PatientConnection[] = [];
    for (const doc of documents) {
      const id = doc.name.split("/").pop();
      const data = fromFirestoreDocument(doc);
      connections.push({
        id,
        doctorId: data.doctorId,
        patientId: data.patientId,
        status: data.status,
        initiatedBy: data.initiatedBy,
        createdAt: data.createdAt,
      });
    }

    // Sort: pending first, then by date descending
    connections.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return connections;
  } catch (error) {
    console.error("Error getting patient connections:", error);
    return [];
  }
}

export async function createConnection(
  doctorId: string,
  patientId: string
): Promise<string | null> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Firebase project ID not configured");
  }

  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error("Not authenticated");
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/connections`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          doctorId: { stringValue: doctorId },
          patientId: { stringValue: patientId },
          status: { stringValue: "pending" },
          initiatedBy: { stringValue: "doctor" },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error creating connection:", response.status, errorText);
      throw new Error("Failed to create connection");
    }

    const result = await response.json();
    return result.name.split("/").pop();
  } catch (error) {
    console.error("Error creating connection:", error);
    throw error;
  }
}

export async function createInvitation(
  doctorId: string,
  patientEmail: string
): Promise<string | null> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Firebase project ID not configured");
  }

  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error("Not authenticated");
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/invitations`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          doctorId: { stringValue: doctorId },
          patientEmail: { stringValue: patientEmail.toLowerCase().trim() },
          status: { stringValue: "pending" },
          createdAt: { timestampValue: new Date().toISOString() },
          expiresAt: { timestampValue: expiresAt.toISOString() },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error creating invitation:", response.status, errorText);
      throw new Error("Failed to create invitation");
    }

    const result = await response.json();
    return result.name.split("/").pop();
  } catch (error) {
    console.error("Error creating invitation:", error);
    throw error;
  }
}

async function expireInvitation(invitationId: string): Promise<void> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) return;
  const idToken = await getIdToken();
  if (!idToken) return;

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/invitations/${invitationId}?updateMask.fieldPaths=status`;
    await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: "expired" },
        },
      }),
    });
  } catch (error) {
    console.error("Error expiring invitation:", error);
  }
}

function isInvitationExpired(invitation: PatientInvitation): boolean {
  if (!invitation.expiresAt) return false;
  return new Date(invitation.expiresAt) < new Date();
}

export async function getDoctorInvitations(
  doctorId: string
): Promise<PatientInvitation[]> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "invitations" }],
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
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "pending" },
              },
            },
          ],
        },
      },
    });

    const invitations: PatientInvitation[] = documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      const data = fromFirestoreDocument(doc);
      return {
        id,
        doctorId: data.doctorId,
        patientEmail: data.patientEmail,
        status: data.status,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      };
    });

    // Filter out expired invitations and mark them as expired in Firestore
    const validInvitations: PatientInvitation[] = [];
    for (const invitation of invitations) {
      if (isInvitationExpired(invitation)) {
        expireInvitation(invitation.id); // fire-and-forget cleanup
      } else {
        validInvitations.push(invitation);
      }
    }

    return validInvitations;
  } catch (error) {
    console.error("Error getting doctor invitations:", error);
    return [];
  }
}

export async function updateConnectionStatus(
  connectionId: string,
  status: string
): Promise<void> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Firebase project ID not configured");
  }

  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error("Not authenticated");
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/connections/${connectionId}?updateMask.fieldPaths=status`;

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
      console.error("Error updating connection:", response.status, errorText);
      throw new Error("Failed to update connection");
    }
  } catch (error) {
    console.error("Error updating connection status:", error);
    throw error;
  }
}

export async function createNotification(notification: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read?: boolean;
}): Promise<void> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Firebase project ID not configured");
  }

  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error("Not authenticated");
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notifications`;

    const fields: any = {
      userId: { stringValue: notification.userId },
      type: { stringValue: notification.type },
      title: { stringValue: notification.title },
      message: { stringValue: notification.message },
      read: { booleanValue: notification.read ?? false },
      createdAt: { timestampValue: new Date().toISOString() },
    };

    if (notification.data) {
      fields.data = { mapValue: { fields: {} } };
      for (const [key, value] of Object.entries(notification.data)) {
        fields.data.mapValue.fields[key] = { stringValue: String(value) };
      }
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
      console.error("Error creating notification:", response.status, errorText);
      throw new Error("Failed to create notification");
    }
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// Check for pending invitations when a patient signs up
export async function checkPendingInvitations(
  patientEmail: string
): Promise<PatientInvitation[]> {
  try {
    const documents = await runQuery({
      from: [{ collectionId: "invitations" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "patientEmail" },
                op: "EQUAL",
                value: { stringValue: patientEmail.toLowerCase().trim() },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "pending" },
              },
            },
          ],
        },
      },
    });

    const invitations: PatientInvitation[] = documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      const data = fromFirestoreDocument(doc);
      return {
        id,
        doctorId: data.doctorId,
        patientEmail: data.patientEmail,
        status: data.status,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      };
    });

    // Filter out expired invitations and mark them as expired in Firestore
    const validInvitations: PatientInvitation[] = [];
    for (const invitation of invitations) {
      if (isInvitationExpired(invitation)) {
        expireInvitation(invitation.id); // fire-and-forget cleanup
      } else {
        validInvitations.push(invitation);
      }
    }

    return validInvitations;
  } catch (error) {
    console.error("Error checking pending invitations:", error);
    return [];
  }
}

// Accept invitation and create connection
export async function acceptInvitation(
  invitationId: string,
  patientId: string,
  patientEmail: string
): Promise<void> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Firebase project ID not configured");
  }

  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error("Not authenticated");
  }

  try {
    // Get invitation to find doctorId
    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/invitations/${invitationId}`;
    const getResponse = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!getResponse.ok) {
      console.warn("Could not fetch invitation:", invitationId);
      return;
    }

    const invitationDoc = await getResponse.json();
    const invitationData = fromFirestoreDocument(invitationDoc);
    const doctorId = invitationData.doctorId;

    if (!doctorId) {
      console.warn("Invitation missing doctorId:", invitationId);
      return;
    }

    // Update invitation status
    const invitationUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/invitations/${invitationId}?updateMask.fieldPaths=status`;
    await fetch(invitationUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: "accepted" },
        },
      }),
    });

    // Create connection (auto-accepted since doctor invited)
    const connectionUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/connections`;
    await fetch(connectionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          doctorId: { stringValue: doctorId },
          patientId: { stringValue: patientId },
          status: { stringValue: "accepted" },
          initiatedBy: { stringValue: "doctor" },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    // Notify doctor
    await createNotification({
      userId: doctorId,
      type: "connection_accepted",
      title: "Patient Connected",
      message: `${patientEmail} has accepted your invitation and is now connected to you.`,
      data: { patientId },
    });

    console.log("✓ Invitation accepted and connection created:", invitationId);
  } catch (error) {
    console.error("Error accepting invitation:", error);
    throw error;
  }
}
