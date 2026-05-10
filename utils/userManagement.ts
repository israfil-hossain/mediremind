import { getFirestore, initializeFirebase } from "./firebase";
import { ENV } from "../config/env";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ID_TOKEN_KEY = "@firebase_id_token";

export interface UserProfile {
  role: "doctor" | "patient";
  name: string;
  email: string;
  phone: string;
  patientProfile?: {
    dateOfBirth: string;
    gender: "male" | "female" | "other";
    address?: string;
    bloodGroup?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  };
  doctorProfile?: {
    licenseNumber: string;
    specialty: string;
    qualifications: string[];
    clinicName?: string;
    clinicAddress?: string;
    yearsOfExperience?: number;
    isVerified: boolean;
    verificationStatus: "pending" | "approved" | "rejected";
  };
  createdAt: string;
}

// Helper to get ID token from storage
async function getIdToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ID_TOKEN_KEY);
  } catch {
    return null;
  }
}

// Helper to convert object to Firestore document format for REST API
function toFirestoreDocument(data: any): any {
  const fields: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item =>
            typeof item === 'string' ? { stringValue: item } :
            typeof item === 'number' ? { doubleValue: item } :
            typeof item === 'boolean' ? { booleanValue: item } : { stringValue: String(item) }
          )
        }
      };
    } else if (typeof value === 'object') {
      // Nested object
      fields[key] = { mapValue: toFirestoreDocument(value) };
    }
  }
  return { fields };
}

// Helper to convert Firestore document to object
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
      data[key] = fieldValue.arrayValue.values?.map((v: any) =>
        v.stringValue || v.doubleValue || v.integerValue || v.booleanValue
      ) || [];
    } else if (fieldValue.mapValue) {
      data[key] = fromFirestoreDocument(fieldValue.mapValue);
    }
  }
  return data;
}

// Create user profile using REST API
async function createUserProfileRestAPI(
  userId: string,
  profile: UserProfile
): Promise<boolean> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error("Firebase project ID not configured");
    return false;
  }

  const idToken = await getIdToken();
  if (!idToken) {
    console.error("No ID token available");
    return false;
  }

  try {
    const documentPath = `users/${userId}`;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;

    const firestoreDoc = toFirestoreDocument(profile);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firestore REST API error:", response.status, errorText);
      return false;
    }

    console.log("✓ User profile created via REST API:", userId, profile.role);
    return true;
  } catch (error) {
    console.error("Error creating user profile via REST API:", error);
    return false;
  }
}

// Get user profile using REST API
async function getUserProfileRestAPI(userId: string): Promise<UserProfile | null> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error("Firebase project ID not configured");
    return null;
  }

  const idToken = await getIdToken();
  if (!idToken) {
    console.error("No ID token available");
    return null;
  }

  try {
    const documentPath = `users/${userId}`;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      console.error("Firestore REST API error:", response.status, errorText);
      return null;
    }

    const doc = await response.json();
    return fromFirestoreDocument(doc) as UserProfile;
  } catch (error) {
    console.error("Error getting user profile via REST API:", error);
    return null;
  }
}

export async function createUserProfile(
  userId: string,
  profileData: Omit<UserProfile, "createdAt">
): Promise<void> {
  try {
    const profile: UserProfile = {
      ...profileData,
      createdAt: new Date().toISOString(),
    };

    // Try REST API first (works in all environments)
    const restSuccess = await createUserProfileRestAPI(userId, profile);
    if (restSuccess) {
      return;
    }

    // Fallback to native Firestore if available
    await initializeFirebase();
    const firestore = getFirestore();

    if (firestore) {
      await firestore().collection("users").doc(userId).set(profile);
      console.log("✓ User profile created via native SDK:", userId, profile.role);
      return;
    }

    throw new Error("Could not create user profile - no available method");
  } catch (error) {
    console.error("Failed to create user profile:", error);
    throw new Error("Failed to create user profile: " + (error as Error).message);
  }
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    // Try REST API first (works in all environments)
    const restProfile = await getUserProfileRestAPI(userId);
    if (restProfile) {
      return restProfile;
    }

    // Fallback to native Firestore if available
    await initializeFirebase();
    const firestore = getFirestore();

    if (firestore) {
      const docSnap = await firestore().collection("users").doc(userId).get();
      if (docSnap.exists) {
        return docSnap.data() as UserProfile;
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to get user profile:", error);
    throw new Error("Failed to get user profile: " + (error as Error).message);
  }
}
