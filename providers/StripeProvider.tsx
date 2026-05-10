import { ReactNode, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { StripeProvider as StripeSDKProvider } from "@stripe/stripe-react-native";
import { ENV } from "../config/env";
import { ensureCustomer, syncSubscriptionFromServer } from "../utils/stripe";
import { getCurrentUser } from "../utils/firebase";

/**
 * Stripe + Authentication bridge.
 * Wraps app with Stripe SDK provider and syncs customer/subscription on auth changes.
 */
export function StripeAuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncStripeWithAuth = async () => {
      if (!mounted) return;

      try {
        const user = await getCurrentUser();

        if (user?.uid) {
          // Ensure Stripe customer exists for this user
          await ensureCustomer(user.email || undefined);
          // Sync subscription status from backend
          await syncSubscriptionFromServer();
        }
      } catch (e) {
        console.warn("Stripe sync error:", e);
      } finally {
        if (mounted) setInitialized(true);
      }
    };

    syncStripeWithAuth();

    // Re-sync when app becomes active
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && mounted) {
          syncStripeWithAuth();
        }
      }
    );

    return () => {
      mounted = false;
      appStateSubscription.remove();
    };
  }, []);

  return (
    <StripeSDKProvider publishableKey={ENV.STRIPE_PUBLISHABLE_KEY}>
      {children}
    </StripeSDKProvider>
  );
}
