import AsyncStorage from "@react-native-async-storage/async-storage";
import { Medication, DoseHistory } from "./storage";
import { ENV } from "../config/env";

const SYNC_QUEUE_KEY = "@sync_queue";
const LAST_SYNC_KEY = "@last_sync_timestamp";
const USER_KEY = "@firebase_user";

export interface SyncQueueItem {
  id: string;
  type: "medication" | "dose_history";
  action: "add" | "update" | "delete";
  data: Medication | DoseHistory | { id: string };
  timestamp: string;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

let firebaseAuth: any = null;
let firestore: any = null;
let isFirebaseInitialized = false;
let firebaseAvailable = true; // Track if Firebase native modules are available

export async function initializeFirebase(): Promise<boolean> {
  if (isFirebaseInitialized) return true;
  if (!firebaseAvailable) return false;

  try {
    // Try to import native Firebase modules
    const firebaseApp = await import("@react-native-firebase/app");
    const firebaseAuthModule = await import("@react-native-firebase/auth");
    const firestoreModule = await import("@react-native-firebase/firestore");

    // Check if the native module is available (not running in Expo Go)
    const app = firebaseApp.default as any;
    if (!app || typeof app !== "function") {
      console.warn(
        "Firebase native module not available. Are you running in Expo Go? " +
          "Firebase requires a development build. Run: npx expo run:android or npx expo run:ios"
      );
      firebaseAvailable = false;
      return false;
    }

    // Try to get the default app
    try {
      const defaultApp = (app as () => any)();
      if (!defaultApp) {
        throw new Error("No default Firebase app");
      }
    } catch (e) {
      console.warn(
        "Firebase app not configured. Make sure google-services.json (Android) " +
          "and GoogleService-Info.plist (iOS) are in your project root."
      );
      firebaseAvailable = false;
      return false;
    }

    // Get the default instances
    firebaseAuth = firebaseAuthModule.default;
    firestore = firestoreModule.default;

    // Enable Firestore offline persistence
    try {
      await firestore().settings({
        persistence: true,
        cacheSizeBytes: firestoreModule.default.CACHE_SIZE_UNLIMITED,
      });
    } catch (e) {
      // Settings might already be set
      console.log("Firestore settings already configured");
    }

    isFirebaseInitialized = true;
    console.log("Firebase initialized successfully");
    return true;
  } catch (error: any) {
    // Check if it's a "module not found" type error (Expo Go)
    if (
      error.message?.includes("cannot find") ||
      error.message?.includes("undefined") ||
      error.message?.includes("null")
    ) {
      console.warn(
        "Firebase native modules not available. " +
          "You need to create a development build to use Firebase features.\n" +
          "Run: npx expo prebuild && npx expo run:android"
      );
      firebaseAvailable = false;
    } else {
      console.error("Firebase initialization failed:", error);
    }
    return false;
  }
}

export function getFirebaseAuth() {
  return firebaseAuth;
}

export function getFirestore() {
  return firestore;
}

export function isFirebaseReady(): boolean {
  return isFirebaseInitialized && firebaseAuth !== null && firestore !== null;
}

export function isFirebaseAvailable(): boolean {
  return firebaseAvailable;
}

// Get current Firebase user
export async function getCurrentUser(): Promise<FirebaseUser | null> {
  try {
    const stored = await AsyncStorage.getItem(USER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch {
    return null;
  }
}

// Email/Password Authentication (Works in Expo Go!)
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const apiKey = ENV.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API Key not configured");
  }

  try {
    // Sign up using Firebase REST API
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const response = await fetch(signUpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Sign up failed");
    }

    // Update display name
    const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`;
    await fetch(updateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken: data.idToken,
        displayName,
        returnSecureToken: true,
      }),
    });

    const user: FirebaseUser = {
      uid: data.localId,
      email: data.email,
      displayName,
      photoURL: null,
    };

    await setCurrentUser(user);
    return user;
  } catch (error: any) {
    console.error("Sign up error:", error);
    throw new Error(error.message || "Failed to sign up");
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const apiKey = ENV.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API Key not configured");
  }

  try {
    // Sign in using Firebase REST API
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const response = await fetch(signInUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Sign in failed");
    }

    const user: FirebaseUser = {
      uid: data.localId,
      email: data.email,
      displayName: data.displayName || null,
      photoURL: data.photoUrl || null,
    };

    await setCurrentUser(user);
    return user;
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw new Error(error.message || "Failed to sign in");
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const apiKey = ENV.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API Key not configured");
  }

  try {
    const resetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
    const response = await fetch(resetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestType: "PASSWORD_RESET",
        email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to send reset email");
    }
  } catch (error: any) {
    console.error("Password reset error:", error);
    throw new Error(error.message || "Failed to send password reset email");
  }
}

// Change password (requires current session)
export async function changePassword(
  newPassword: string,
  idToken: string
): Promise<void> {
  const apiKey = ENV.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API Key not configured");
  }

  try {
    const changeUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`;
    const response = await fetch(changeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken,
        password: newPassword,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to change password");
    }
  } catch (error: any) {
    console.error("Change password error:", error);
    throw new Error(error.message || "Failed to change password");
  }
}

// Store user locally
export async function setCurrentUser(
  user: FirebaseUser | null
): Promise<void> {
  try {
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.error("Error storing user:", error);
  }
}

// Sign in with Google
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  // Check if Firebase is available
  if (!firebaseAvailable) {
    throw new Error(
      "Firebase not available. Please create a development build to use Google Sign-In.\n\n" +
        "Run: npx expo prebuild && npx expo run:android"
    );
  }

  const initialized = await initializeFirebase();
  if (!initialized) {
    throw new Error(
      "Firebase not initialized. Make sure you have:\n" +
        "1. google-services.json in project root (Android)\n" +
        "2. GoogleService-Info.plist in project root (iOS)\n" +
        "3. Created a development build (not Expo Go)"
    );
  }

  try {
    const { GoogleSignin } = await import(
      "@react-native-google-signin/google-signin"
    );

    if (!GoogleSignin || typeof GoogleSignin.signIn !== "function") {
      throw new Error(
        "Google Sign-In not available. Create a development build first."
      );
    }

    // Check if play services available (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Get the user id token
    const signInResult = await GoogleSignin.signIn();

    const idToken = signInResult?.data?.idToken;
    if (!idToken) {
      throw new Error("No ID token received from Google Sign-In");
    }

    // Create a Google credential with the token
    const auth = firebaseAuth();
    const googleCredential = firebaseAuth.GoogleAuthProvider.credential(idToken);

    // Sign in with the credential
    const userCredential = await auth.signInWithCredential(googleCredential);

    const user = userCredential.user;
    const firebaseUser: FirebaseUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };

    await setCurrentUser(firebaseUser);

    // Sync data after login
    await syncAllDataToFirebase();

    return firebaseUser;
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

// Sign out
export async function signOut(): Promise<void> {
  try {
    if (isFirebaseReady()) {
      await firebaseAuth().signOut();
    }

    try {
      const { GoogleSignin } = await import(
        "@react-native-google-signin/google-signin"
      );
      if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
        await GoogleSignin.revokeAccess().catch(() => {});
        await GoogleSignin.signOut().catch(() => {});
      }
    } catch {
      // Google Sign-In not available
    }

    await setCurrentUser(null);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

// Configure Google Sign-In
export async function configureGoogleSignIn(
  webClientId?: string
): Promise<void> {
  if (!firebaseAvailable) {
    console.warn(
      "Skipping Google Sign-In configuration - Firebase not available in Expo Go"
    );
    return;
  }

  try {
    const googleSignInModule = await import(
      "@react-native-google-signin/google-signin"
    );
    const GoogleSignin = googleSignInModule.GoogleSignin;

    if (!GoogleSignin || typeof GoogleSignin.configure !== "function") {
      console.warn(
        "Google Sign-In native module not available. " +
          "Create a development build to use this feature."
      );
      firebaseAvailable = false;
      return;
    }

    const clientId = webClientId || ENV.FIREBASE_WEB_CLIENT_ID;
    if (!clientId) {
      console.warn(
        "No Firebase Web Client ID configured. " +
          "Set EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID in your .env file."
      );
      return;
    }

    GoogleSignin.configure({
      webClientId: clientId,
      offlineAccess: true,
    });

    console.log("Google Sign-In configured successfully");
  } catch (error: any) {
    if (
      error.message?.includes("undefined") ||
      error.message?.includes("null") ||
      error.message?.includes("cannot read")
    ) {
      console.warn(
        "Google Sign-In not available in Expo Go. Create a development build."
      );
      firebaseAvailable = false;
    } else {
      console.error("Google Sign-In configuration error:", error);
    }
  }
}

// ============ SYNC QUEUE MANAGEMENT ============

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  try {
    const queue = await getSyncQueue();
    queue.push(item);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error adding to sync queue:", error);
  }
}

export async function clearSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  } catch (error) {
    console.error("Error clearing sync queue:", error);
  }
}

export async function removeFromSyncQueue(itemId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const filtered = queue.filter((item) => item.id !== itemId);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing from sync queue:", error);
  }
}

// ============ FIREBASE SYNC OPERATIONS ============

// Sync a single medication to Firebase
export async function syncMedicationToFirebase(
  medication: Medication,
  action: "add" | "update" | "delete"
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !isFirebaseReady()) return false;

  try {
    const medicationsRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("medications");

    switch (action) {
      case "add":
      case "update":
        await medicationsRef.doc(medication.id).set(medication, { merge: true });
        break;
      case "delete":
        await medicationsRef.doc(medication.id).delete();
        break;
    }
    return true;
  } catch (error) {
    console.error("Error syncing medication to Firebase:", error);
    return false;
  }
}

// Sync a single dose history to Firebase
export async function syncDoseHistoryToFirebase(
  dose: DoseHistory,
  action: "add" | "update" | "delete"
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !isFirebaseReady()) return false;

  try {
    const doseHistoryRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("dose_history");

    switch (action) {
      case "add":
      case "update":
        await doseHistoryRef.doc(dose.id).set(dose, { merge: true });
        break;
      case "delete":
        await doseHistoryRef.doc(dose.id).delete();
        break;
    }
    return true;
  } catch (error) {
    console.error("Error syncing dose history to Firebase:", error);
    return false;
  }
}

// Process pending sync queue
export async function processSyncQueue(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !isFirebaseReady()) return;

  const queue = await getSyncQueue();
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} items in sync queue...`);

  for (const item of queue) {
    let success = false;

    try {
      if (item.type === "medication") {
        if (item.action === "delete") {
          success = await syncMedicationToFirebase(
            { id: (item.data as { id: string }).id } as Medication,
            "delete"
          );
        } else {
          success = await syncMedicationToFirebase(
            item.data as Medication,
            item.action
          );
        }
      } else if (item.type === "dose_history") {
        if (item.action === "delete") {
          success = await syncDoseHistoryToFirebase(
            { id: (item.data as { id: string }).id } as DoseHistory,
            "delete"
          );
        } else {
          success = await syncDoseHistoryToFirebase(
            item.data as DoseHistory,
            item.action
          );
        }
      }

      if (success) {
        await removeFromSyncQueue(item.id);
      }
    } catch (error) {
      console.error("Error processing sync queue item:", error);
    }
  }

  // Update last sync timestamp
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

// Sync all local data to Firebase (full backup)
export async function syncAllDataToFirebase(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !isFirebaseReady()) return;

  try {
    const { getMedications, getDoseHistory } = await import("./storage");

    const medications = await getMedications();
    const doseHistory = await getDoseHistory();

    // Batch write medications
    const medicationsRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("medications");

    const batch = firestore().batch();

    for (const med of medications) {
      batch.set(medicationsRef.doc(med.id), med, { merge: true });
    }

    await batch.commit();

    // Batch write dose history (in chunks of 500 due to Firestore limits)
    const doseHistoryRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("dose_history");

    const chunkSize = 500;
    for (let i = 0; i < doseHistory.length; i += chunkSize) {
      const chunk = doseHistory.slice(i, i + chunkSize);
      const historyBatch = firestore().batch();

      for (const dose of chunk) {
        historyBatch.set(doseHistoryRef.doc(dose.id), dose, { merge: true });
      }

      await historyBatch.commit();
    }

    // Update last sync timestamp
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    console.log("Full sync to Firebase completed");
  } catch (error) {
    console.error("Error syncing all data to Firebase:", error);
    throw error;
  }
}

// Restore data from Firebase to local storage
export async function restoreDataFromFirebase(): Promise<{
  medications: Medication[];
  doseHistory: DoseHistory[];
}> {
  const user = await getCurrentUser();
  if (!user || !isFirebaseReady()) {
    return { medications: [], doseHistory: [] };
  }

  try {
    // Fetch medications
    const medicationsSnapshot = await firestore()
      .collection("users")
      .doc(user.uid)
      .collection("medications")
      .get();

    const medications: Medication[] = [];
    medicationsSnapshot.forEach((doc: any) => {
      medications.push(doc.data() as Medication);
    });

    // Fetch dose history
    const doseHistorySnapshot = await firestore()
      .collection("users")
      .doc(user.uid)
      .collection("dose_history")
      .get();

    const doseHistory: DoseHistory[] = [];
    doseHistorySnapshot.forEach((doc: any) => {
      doseHistory.push(doc.data() as DoseHistory);
    });

    return { medications, doseHistory };
  } catch (error) {
    console.error("Error restoring data from Firebase:", error);
    throw error;
  }
}

// Get last sync timestamp
export async function getLastSyncTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}
