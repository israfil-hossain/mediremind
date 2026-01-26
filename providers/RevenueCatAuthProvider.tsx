import { ReactNode, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { initRevenueCat, logInRevenueCat, logOutRevenueCat } from "../utils/revenuecat";
import { getCurrentUser } from "../utils/firebase";

/**
 * RevenueCat + Authentication bridge.
 * Syncs RevenueCat user ID with our authentication system.
 */
export function RevenueCatAuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncRevenueCatWithAuth = async () => {
      if (!mounted) return;

      try {
        const user = await getCurrentUser();

        if (user?.uid) {
          console.log("Initializing RevenueCat with user:", user.uid);
          await initRevenueCat(user.uid);
          await logInRevenueCat(user.uid);
        } else {
          console.log("Initializing RevenueCat without user (anonymous)");
          await initRevenueCat(undefined);
          await logOutRevenueCat();
        }
      } catch (e) {
        console.warn("RevenueCat sync error:", e);
        // Initialize anyway without user ID
        try {
          await initRevenueCat(undefined);
        } catch (initError) {
          console.error("RevenueCat initialization failed:", initError);
        }
      } finally {
        if (mounted) setInitialized(true);
      }
    };

    // Initial sync
    syncRevenueCatWithAuth();

    // Re-sync when app becomes active (in case user logged in/out)
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && mounted) {
          syncRevenueCatWithAuth();
        }
      }
    );

    return () => {
      mounted = false;
      appStateSubscription.remove();
    };
  }, []);

  // Render children regardless; if not initialized yet, RevenueCat will refresh once ready.
  return <>{children}</>;
}
