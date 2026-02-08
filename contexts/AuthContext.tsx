import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  FirebaseUser,
  getCurrentUser,
  signInWithGoogle,
  signOut,
  initializeFirebase,
  configureGoogleSignIn,
  restoreDataFromFirebase,
  syncAllDataToFirebase,
  getLastSyncTimestamp,
} from "../utils/firebase";
import {
  startNetworkMonitoring,
  stopNetworkMonitoring,
  getNetworkState,
  NetworkState,
} from "../utils/networkSync";
import {
  startMedicationMonitoring,
  stopMedicationMonitoring,
} from "../utils/medicationMonitoring";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MEDICATIONS_KEY = "@medications";
const DOSE_HISTORY_KEY = "@dose_history";

interface AuthContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  isOnline: boolean;
  lastSyncTime: string | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  syncNow: () => Promise<{ success: boolean; error?: string }>;
  restoreFromCloud: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const existingUser = await getCurrentUser();
      setUser(existingUser);

      // Also update sync time
      const syncTime = await getLastSyncTimestamp();
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let checkNetworkInterval: NodeJS.Timeout;

    const initialize = async () => {
      try {
        // Initialize Firebase
        await initializeFirebase();

        // Configure Google Sign-In (uses ENV.FIREBASE_WEB_CLIENT_ID)
        await configureGoogleSignIn();

        // Check for existing user
        const existingUser = await getCurrentUser();
        if (mounted) {
          setUser(existingUser);

          // Start medication monitoring if user is logged in
          if (existingUser) {
            startMedicationMonitoring();
          }
        }

        // Check network state
        const networkState = await getNetworkState();
        if (mounted) {
          setIsOnline(
            networkState.isConnected &&
              networkState.isInternetReachable === true
          );
        }

        // Get last sync time
        const syncTime = await getLastSyncTimestamp();
        if (mounted) {
          setLastSyncTime(syncTime);
        }

        // Start network monitoring
        startNetworkMonitoring();

        // Monitor network state changes
        checkNetworkInterval = setInterval(async () => {
          if (!mounted) return;
          const state = await getNetworkState();
          setIsOnline(state.isConnected && state.isInternetReachable === true);
        }, 10000);
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Listen for app state changes (when app becomes active, check user)
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && mounted) {
          refreshUser();
        }
      }
    );

    return () => {
      mounted = false;
      stopNetworkMonitoring();
      stopMedicationMonitoring();
      if (checkNetworkInterval) {
        clearInterval(checkNetworkInterval);
      }
      appStateSubscription.remove();
    };
  }, []);

  const signIn = async () => {
    setIsLoading(true);
    try {
      const firebaseUser = await signInWithGoogle();
      setUser(firebaseUser);

      // Update last sync time
      const syncTime = await getLastSyncTimestamp();
      setLastSyncTime(syncTime);

      // Start medication monitoring
      startMedicationMonitoring();
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logOut = async () => {
    setIsLoading(true);
    try {
      // Stop medication monitoring before signing out
      stopMedicationMonitoring();

      await signOut();
      setUser(null);
      setLastSyncTime(null);
    } catch (error) {
      console.error("Log out error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const syncNow = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Not logged in" };
    }

    if (!isOnline) {
      return { success: false, error: "No internet connection" };
    }

    try {
      await syncAllDataToFirebase();
      const syncTime = await getLastSyncTimestamp();
      setLastSyncTime(syncTime);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Sync failed" };
    }
  };

  const restoreFromCloud = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!user) {
      return { success: false, error: "Not logged in" };
    }

    if (!isOnline) {
      return { success: false, error: "No internet connection" };
    }

    try {
      const { medications, doseHistory } = await restoreDataFromFirebase();

      // Save to local storage
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
      await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(doseHistory));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Restore failed" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isOnline,
        lastSyncTime,
        signIn,
        logOut,
        refreshUser,
        syncNow,
        restoreFromCloud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
