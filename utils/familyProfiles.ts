import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser } from "./firebase";
import { getNetworkState } from "./networkSync";
import { ENV } from "../config/env";

// Import getIdToken for authentication
async function getIdToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem("@firebase_id_token");
  } catch {
    return null;
  }
}

const FAMILY_PROFILES_KEY = "@family_profiles";
const ACTIVE_PROFILE_KEY = "@active_profile";

export interface FamilyProfile {
  id: string;
  name: string;
  relationship: string; // "Self", "Spouse", "Parent", "Child", "Other"
  email?: string; // Email for missed medication notifications
  dateOfBirth?: string;
  photoUri?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all family profiles
export async function getFamilyProfiles(): Promise<FamilyProfile[]> {
  try {
    const data = await AsyncStorage.getItem(FAMILY_PROFILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting family profiles:", error);
    return [];
  }
}

// Get a single family profile by ID
export async function getFamilyProfile(
  id: string
): Promise<FamilyProfile | null> {
  try {
    const profiles = await getFamilyProfiles();
    return profiles.find((p) => p.id === id) || null;
  } catch (error) {
    console.error("Error getting family profile:", error);
    return null;
  }
}

// Add a new family profile
export async function addFamilyProfile(
  profile: Omit<FamilyProfile, "createdAt" | "updatedAt">
): Promise<FamilyProfile> {
  try {
    const profiles = await getFamilyProfiles();
    const now = new Date().toISOString();
    const newProfile: FamilyProfile = {
      ...profile,
      createdAt: now,
      updatedAt: now,
    };
    profiles.push(newProfile);
    await AsyncStorage.setItem(FAMILY_PROFILES_KEY, JSON.stringify(profiles));

    // Sync to Firebase
    await syncFamilyProfileToFirebase(newProfile, "add");

    return newProfile;
  } catch (error) {
    console.error("Error adding family profile:", error);
    throw error;
  }
}

// Update a family profile
export async function updateFamilyProfile(
  updatedProfile: FamilyProfile
): Promise<void> {
  try {
    const profiles = await getFamilyProfiles();
    const index = profiles.findIndex((p) => p.id === updatedProfile.id);
    if (index !== -1) {
      profiles[index] = {
        ...updatedProfile,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        FAMILY_PROFILES_KEY,
        JSON.stringify(profiles)
      );

      // Sync to Firebase
      await syncFamilyProfileToFirebase(profiles[index], "update");
    }
  } catch (error) {
    console.error("Error updating family profile:", error);
    throw error;
  }
}

// Delete a family profile
export async function deleteFamilyProfile(id: string): Promise<void> {
  try {
    const profiles = await getFamilyProfiles();
    const updatedProfiles = profiles.filter((p) => p.id !== id);
    await AsyncStorage.setItem(
      FAMILY_PROFILES_KEY,
      JSON.stringify(updatedProfiles)
    );

    // Sync deletion to Firebase
    await syncFamilyProfileToFirebase({ id } as any, "delete");

    // If this was the active profile, clear it
    const activeProfileId = await getActiveProfileId();
    if (activeProfileId === id) {
      await clearActiveProfile();
    }
  } catch (error) {
    console.error("Error deleting family profile:", error);
    throw error;
  }
}

// Get the currently active profile ID
export async function getActiveProfileId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch (error) {
    console.error("Error getting active profile:", error);
    return null;
  }
}

// Set the active profile
export async function setActiveProfile(profileId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } catch (error) {
    console.error("Error setting active profile:", error);
    throw error;
  }
}

// Clear the active profile (use main user profile)
export async function clearActiveProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  } catch (error) {
    console.error("Error clearing active profile:", error);
  }
}

// Sync family profile to Firebase using REST API
async function syncFamilyProfileToFirebase(
  profile: FamilyProfile,
  action: "add" | "update" | "delete"
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) {
    console.log("No user found for family profile sync");
    return false;
  }

  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error("Firebase project ID not configured");
    return false;
  }

  const networkState = await getNetworkState();
  const isOnline =
    networkState.isConnected && networkState.isInternetReachable === true;

  if (!isOnline) {
    console.log("Offline - family profile sync will happen later");
    return false;
  }

  const idToken = await getIdToken();
  if (!idToken) {
    console.error("No ID token available for authentication");
    return false;
  }

  try {
    const documentPath = `users/${user.uid}/family_profiles/${profile.id}`;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    };

    if (action === "delete") {
      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Firestore DELETE error:", response.status, errorText);
        return false;
      }
      console.log("✓ Family profile deleted from Firestore:", profile.id);
      return true;
    } else {
      // add or update
      const firestoreDoc = toFirestoreDocument(profile);
      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(firestoreDoc),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Firestore PATCH error:", response.status, errorText);
        return false;
      }
      console.log("✓ Family profile saved to Firestore:", profile.name);
      return true;
    }
  } catch (error) {
    console.error("Error syncing family profile via REST API:", error);
    return false;
  }
}

// Helper to convert object to Firestore document format
function toFirestoreDocument(data: any): any {
  const fields: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      fields[key] = { doubleValue: value };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((item) =>
            typeof item === "string"
              ? { stringValue: item }
              : { doubleValue: item }
          ),
        },
      };
    }
  }
  return { fields };
}

// Initialize default "Self" profile if none exist
export async function initializeDefaultProfile(): Promise<void> {
  try {
    const profiles = await getFamilyProfiles();
    if (profiles.length === 0) {
      const user = await getCurrentUser();
      const defaultProfile: Omit<FamilyProfile, "createdAt" | "updatedAt"> = {
        id: "self",
        name: user?.displayName || "Me",
        relationship: "Self",
        notes: "Your personal medication profile",
      };
      await addFamilyProfile(defaultProfile);
      await setActiveProfile("self");
    }
  } catch (error) {
    console.error("Error initializing default profile:", error);
  }
}
