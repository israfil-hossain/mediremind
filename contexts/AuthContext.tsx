import { PaywallModal } from "@/components/PaywallModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  configureGoogleSignIn,
  FirebaseUser,
  getCurrentUser,
  getLastSyncTimestamp,
  initializeFirebase,
  restoreDataFromFirebase,
  signInWithGoogle,
  signOut,
  syncAllDataToFirebase,
} from "../utils/firebase";
import {
  startMedicationMonitoring,
  stopMedicationMonitoring,
} from "../utils/medicationMonitoring";
import {
  getNetworkState,
  startNetworkMonitoring,
  stopNetworkMonitoring
} from "../utils/networkSync";
import { isPremium as checkIsPremium } from "../utils/subscription";
import { getUserProfile, UserProfile } from "../utils/userManagement";

const MEDICATIONS_KEY = "@medications";
const DOSE_HISTORY_KEY = "@dose_history";

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  userRole: "doctor" | "patient" | null;
  isLoading: boolean;
  isOnline: boolean;
  lastSyncTime: string | null;
  showPaywall: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  syncNow: () => Promise<{ success: boolean; error?: string }>;
  restoreFromCloud: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<"doctor" | "patient" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
        setUserRole(profile.role);
      }
    } catch (error) {
      // Error loading user profile
    }
  };

  const refreshUser = async () => {
    try {
      const existingUser = await getCurrentUser();
      setUser(existingUser);

      // Load user profile
      if (existingUser) {
        await loadUserProfile(existingUser.uid);
      }

      // Also update sync time
      const syncTime = await getLastSyncTimestamp();
      setLastSyncTime(syncTime);
    } catch (error) {
      // Error refreshing user
    }
  };

  useEffect(() => {
    let mounted = true;
    let checkNetworkInterval: ReturnType<typeof setInterval>;

    const initialize = async () => {
      try {
        // Initialize Firebase
        await initializeFirebase();

        // Configure Google Sign-In (uses ENV.FIREBASE_WEB_CLIENT_ID)
        // Wrapped in try-catch to prevent errors if package not installed
        try {
          await configureGoogleSignIn();
        } catch (error) {
          console.log("Google Sign-In not available, skipping configuration");
        }

        // Check for existing user
        const existingUser = await getCurrentUser();
        if (mounted) {
          setUser(existingUser);

          // Load user profile
          if (existingUser) {
            await loadUserProfile(existingUser.uid);
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
      if (!firebaseUser) {
        // Sign-in was cancelled or unavailable
        return;
      }
      setUser(firebaseUser);

      // Load user profile
      await loadUserProfile(firebaseUser.uid);

      // Update last sync time
      const syncTime = await getLastSyncTimestamp();
      setLastSyncTime(syncTime);

      // Start medication monitoring
      startMedicationMonitoring();

      // Check if user is premium, show paywall if not
      try {
        const isUserPremium = await checkIsPremium();

        if (!isUserPremium) {
          // Show paywall modal after a short delay to let the user settle in
          setTimeout(() => {
            setShowPaywall(true);
          }, 1500);
        }
      } catch (error: any) {
        console.error("Error checking premium status:", error);
        // Don't block sign-in if premium check fails
      }
    } catch (error) {
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
      setUserProfile(null);
      setUserRole(null);
      setLastSyncTime(null);

      // Navigate to auth screen
      router.replace("/auth");
    } catch (error) {
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
        userProfile,
        userRole,
        isLoading,
        isOnline,
        lastSyncTime,
        showPaywall,
        signIn,
        logOut,
        refreshUser,
        syncNow,
        restoreFromCloud,
      }}
    >
      {children}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={() => setShowPaywall(false)}
      />
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
