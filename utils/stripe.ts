import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { ENV } from "../config/env";
import { setSubscription, Subscription } from "./subscription";

// Firebase callable function helper
async function callFunction(name: string, data: Record<string, any> = {}) {
  const auth = require("@react-native-firebase/auth").default;
  const user = auth().currentUser;
  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken();
  const projectId = ENV.FIREBASE_PROJECT_ID;
  const url = `https://us-central1-${projectId}.cloudfunctions.net/${name}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error?.error?.message || `Function ${name} failed`);
  }

  const result = await response.json();
  return result.result;
}

export type StripePlanType = "monthly" | "yearly" | "lifetime";

export interface SubscriptionInfo {
  status: "free" | "active" | string;
  planType: StripePlanType | null;
  expiryDate: string | null;
  cancelAtPeriodEnd: boolean;
}

let stripeAvailable = true;

export const isStripeAvailable = () => stripeAvailable;

/**
 * Ensure a Stripe customer exists for the current Firebase user.
 */
export async function ensureCustomer(email?: string): Promise<string> {
  try {
    const result = await callFunction("createCustomer", { email });
    return result.customerId;
  } catch (error: any) {
    console.warn("Could not create Stripe customer:", error.message);
    stripeAvailable = false;
    throw error;
  }
}

/**
 * Subscribe to a monthly or yearly plan via Stripe PaymentSheet.
 */
export async function createSubscription(planType: "monthly" | "yearly"): Promise<boolean> {
  try {
    const result = await callFunction("createSubscription", { planType });

    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: result.clientSecret,
      customerEphemeralKeySecret: result.ephemeralKey,
      customerId: result.customerId,
      merchantDisplayName: "MediRemind",
      allowsDelayedPaymentMethods: false,
    });

    if (initError) {
      throw new Error(initError.message);
    }

    const { error: presentError } = await presentPaymentSheet();
    if (presentError) {
      if (presentError.code === "Canceled") {
        return false; // User cancelled
      }
      throw new Error(presentError.message);
    }

    // Payment succeeded — update local subscription
    const subType = planType === "monthly" ? "premium_monthly" : "premium_yearly";
    const now = new Date();
    const expiry = new Date(now);
    if (planType === "monthly") {
      expiry.setMonth(expiry.getMonth() + 1);
    } else {
      expiry.setFullYear(expiry.getFullYear() + 1);
    }

    const subscription: Subscription = {
      type: subType,
      isActive: true,
      expiryDate: expiry.toISOString(),
      purchaseDate: now.toISOString(),
    };
    await setSubscription(subscription);

    return true;
  } catch (error: any) {
    console.error("Subscription error:", error.message);
    throw error;
  }
}

/**
 * One-time lifetime payment via Stripe PaymentSheet.
 */
export async function createLifetimePayment(): Promise<boolean> {
  try {
    const result = await callFunction("createPaymentIntent");

    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: result.clientSecret,
      customerEphemeralKeySecret: result.ephemeralKey,
      customerId: result.customerId,
      merchantDisplayName: "MediRemind",
      allowsDelayedPaymentMethods: false,
    });

    if (initError) {
      throw new Error(initError.message);
    }

    const { error: presentError } = await presentPaymentSheet();
    if (presentError) {
      if (presentError.code === "Canceled") {
        return false;
      }
      throw new Error(presentError.message);
    }

    // Payment succeeded — update local subscription
    const subscription: Subscription = {
      type: "premium_lifetime",
      isActive: true,
      purchaseDate: new Date().toISOString(),
    };
    await setSubscription(subscription);

    return true;
  } catch (error: any) {
    console.error("Lifetime payment error:", error.message);
    throw error;
  }
}

/**
 * Subscribe to a plan (monthly, yearly, or lifetime).
 */
export async function subscribe(planType: StripePlanType): Promise<boolean> {
  if (planType === "lifetime") {
    return createLifetimePayment();
  }
  return createSubscription(planType);
}

/**
 * Cancel the active subscription via backend.
 */
export async function cancelSubscriptionViaBackend(): Promise<void> {
  await callFunction("cancelSubscription");
}

/**
 * Check subscription status from backend (replaces restorePurchases).
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionInfo> {
  try {
    const result = await callFunction("getSubscriptionStatus");
    return result as SubscriptionInfo;
  } catch (error: any) {
    console.warn("Could not check subscription status:", error.message);
    return {
      status: "free",
      planType: null,
      expiryDate: null,
      cancelAtPeriodEnd: false,
    };
  }
}

/**
 * Sync subscription status from Stripe backend to local storage.
 */
export async function syncSubscriptionFromServer(): Promise<void> {
  try {
    const info = await checkSubscriptionStatus();

    if (info.status === "active" && info.planType) {
      const typeMap: Record<string, Subscription["type"]> = {
        monthly: "premium_monthly",
        yearly: "premium_yearly",
        lifetime: "premium_lifetime",
      };

      const subscription: Subscription = {
        type: typeMap[info.planType] || "free",
        isActive: true,
        expiryDate: info.expiryDate || undefined,
        purchaseDate: new Date().toISOString(),
      };
      await setSubscription(subscription);
    } else {
      await setSubscription({
        type: "free",
        isActive: false,
        purchaseDate: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn("Could not sync subscription from server:", error);
  }
}
