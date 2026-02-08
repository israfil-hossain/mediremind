import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "../config/env";

const SUBSCRIPTION_KEY = "@subscription";
const SUBSCRIPTION_TYPE_KEY = "@subscription_type";
const SUBSCRIPTION_EXPIRY_KEY = "@subscription_expiry";

export type SubscriptionType = "free" | "premium_monthly" | "premium_yearly" | "premium_lifetime" | "family_care_monthly" | "family_care_yearly" | "family_care_lifetime";

export interface Subscription {
  type: SubscriptionType;
  isActive: boolean;
  expiryDate?: string; // ISO string, undefined for lifetime
  trialEndDate?: string; // ISO string for trial period
  purchaseDate: string; // ISO string
}

const FREE_TIER_MEDICATION_LIMIT = 5;
const FREE_TIER_HISTORY_DAYS = 30;

export async function getSubscription(): Promise<Subscription> {
  try {
    const data = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (data) {
      const subscription: Subscription = JSON.parse(data);
      // Check if subscription is still valid
      if (subscription.expiryDate) {
        const expiry = new Date(subscription.expiryDate);
        if (expiry < new Date() && subscription.type !== "free" && subscription.type !== "premium_lifetime" && subscription.type !== "family_care_lifetime") {
          // Subscription expired, revert to free
          return {
            type: "free",
            isActive: false,
            purchaseDate: new Date().toISOString(),
          };
        }
      }
      return subscription;
    }
    // Default to free tier
    return {
      type: "free",
      isActive: false,
      purchaseDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting subscription:", error);
    return {
      type: "free",
      isActive: false,
      purchaseDate: new Date().toISOString(),
    };
  }
}

export async function setSubscription(subscription: Subscription): Promise<void> {
  try {
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
  } catch (error) {
    console.error("Error setting subscription:", error);
    throw error;
  }
}

export async function isPremium(): Promise<boolean> {
  // Development override: Test premium features without subscription
  if (__DEV__ && ENV.DEV_IS_PREMIUM) {
    console.log("🔧 [DEV] Premium override enabled via EXPO_PUBLIC_DEV_IS_PREMIUM");
    return true;
  }

  const subscription = await getSubscription();
  return subscription.type !== "free" && subscription.isActive;
}

export async function isFamilyCare(): Promise<boolean> {
  // Development override: Test family care features without subscription
  if (__DEV__ && ENV.DEV_IS_PREMIUM) {
    console.log("🔧 [DEV] Family Care override enabled via EXPO_PUBLIC_DEV_IS_PREMIUM");
    return true;
  }

  const subscription = await getSubscription();
  return (
    (subscription.type === "family_care_monthly" ||
      subscription.type === "family_care_yearly" ||
      subscription.type === "family_care_lifetime") &&
    subscription.isActive
  );
}

export async function canAddMedication(currentCount: number): Promise<boolean> {
  const subscription = await getSubscription();
  if (subscription.type === "free") {
    return currentCount < FREE_TIER_MEDICATION_LIMIT;
  }
  return true; // Premium has unlimited medications
}

export async function getMedicationLimit(): Promise<number> {
  // Development override: Unlimited medications for testing
  if (__DEV__ && ENV.DEV_IS_PREMIUM) {
    return Infinity;
  }

  const subscription = await getSubscription();
  if (subscription.type === "free") {
    return FREE_TIER_MEDICATION_LIMIT;
  }
  return Infinity;
}

export async function getHistoryLimitDays(): Promise<number> {
  // Development override: Unlimited history for testing
  if (__DEV__ && ENV.DEV_IS_PREMIUM) {
    return Infinity;
  }

  const subscription = await getSubscription();
  if (subscription.type === "free") {
    return FREE_TIER_HISTORY_DAYS;
  }
  return Infinity; // Unlimited history for premium
}

export async function canUseRefillAlerts(): Promise<boolean> {
  // Development override
  if (__DEV__ && ENV.DEV_IS_PREMIUM) return true;

  const subscription = await getSubscription();
  return subscription.type !== "free" && subscription.isActive;
}

export async function canUseCloudBackup(): Promise<boolean> {
  // Development override
  if (__DEV__ && ENV.DEV_IS_PREMIUM) return true;

  const subscription = await getSubscription();
  return subscription.type !== "free" && subscription.isActive;
}

export async function canExportData(): Promise<boolean> {
  // Development override
  if (__DEV__ && ENV.DEV_IS_PREMIUM) return true;

  const subscription = await getSubscription();
  return subscription.type !== "free" && subscription.isActive;
}

export async function canUseAdvancedAnalytics(): Promise<boolean> {
  // Development override
  if (__DEV__ && ENV.DEV_IS_PREMIUM) return true;

  const subscription = await getSubscription();
  return subscription.type !== "free" && subscription.isActive;
}

// Purchase subscription (mock implementation - integrate with RevenueCat/Stripe in production)
export async function purchaseSubscription(
  type: Exclude<SubscriptionType, "free">,
  isTrial: boolean = false
): Promise<Subscription> {
  const now = new Date();
  let expiryDate: string | undefined;

  // Calculate expiry date based on subscription type
  if (type.includes("monthly")) {
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + 1);
    expiryDate = expiry.toISOString();
  } else if (type.includes("yearly")) {
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 1);
    expiryDate = expiry.toISOString();
  }
  // Lifetime subscriptions have no expiry

  const trialEndDate = isTrial
    ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const subscription: Subscription = {
    type,
    isActive: true,
    expiryDate,
    trialEndDate,
    purchaseDate: now.toISOString(),
  };

  await setSubscription(subscription);
  return subscription;
}

// Cancel subscription (for testing/demo purposes)
export async function cancelSubscription(): Promise<void> {
  const freeSubscription: Subscription = {
    type: "free",
    isActive: false,
    purchaseDate: new Date().toISOString(),
  };
  await setSubscription(freeSubscription);
}
