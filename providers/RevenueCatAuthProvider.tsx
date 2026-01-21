import { ReactNode, useEffect, useState } from "react";
import { initRevenueCat, logInRevenueCat, logOutRevenueCat } from "../utils/revenuecat";

/**
 * RevenueCat + Firebase Auth bridge.
 * Assumes @react-native-firebase/auth is installed.
 * If Firebase isn't available yet, it will safely no-op and retry once mounted.
 */
export function RevenueCatAuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;

    const setup = async () => {
      try {
        // Lazy import so builds don't fail if firebase isn't installed yet.
        const firebaseAuth = await import("@react-native-firebase/auth");
        const auth = firebaseAuth.default();

        unsub = auth.onAuthStateChanged(async (user) => {
          if (!mounted) return;
          try {
            if (user) {
              await initRevenueCat(user.uid);
              await logInRevenueCat(user.uid);
            } else {
              await initRevenueCat(undefined);
              await logOutRevenueCat();
            }
          } catch (e) {
            console.warn("RevenueCat init/login error", e);
          } finally {
            if (mounted) setInitialized(true);
          }
        });
      } catch (e) {
        console.warn(
          "Firebase Auth not available yet. RevenueCat will be initialized without user ID.",
          e
        );
        await initRevenueCat(undefined);
        if (mounted) setInitialized(true);
      }
    };

    setup();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  // Render children regardless; if not initialized yet, RevenueCat will refresh once ready.
  return <>{children}</>;
}
