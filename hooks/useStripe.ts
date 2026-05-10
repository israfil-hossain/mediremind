import { useEffect, useState, useCallback } from "react";
import {
  checkSubscriptionStatus,
  subscribe as stripeSubscribe,
  cancelSubscriptionViaBackend,
  syncSubscriptionFromServer,
  SubscriptionInfo,
  StripePlanType,
} from "../utils/stripe";
import { isPremium } from "../utils/subscription";
import { ENV } from "../config/env";

export interface StripePlans {
  monthly: { price: number; label: string };
  yearly: { price: number; label: string };
  lifetime: { price: number; label: string };
}

const PLANS: StripePlans = {
  monthly: { price: 9.99, label: "$9.99/month" },
  yearly: { price: 79.92, label: "$79.92/year (Save 20%)" },
  lifetime: { price: 299, label: "$299 one-time" },
};

export function useStripe() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Sync from server to local storage
      await syncSubscriptionFromServer();
      const info = await checkSubscriptionStatus();
      setSubscriptionInfo(info);
      const premium = await isPremium();
      setIsPro(premium);
    } catch (e) {
      console.warn("Stripe refresh failed:", e);
      // Fall back to local cache
      const premium = await isPremium();
      setIsPro(premium);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async (planType: StripePlanType): Promise<boolean> => {
    try {
      const success = await stripeSubscribe(planType);
      if (success) {
        await refresh();
      }
      return success;
    } catch (error) {
      throw error;
    }
  }, [refresh]);

  const cancelSubscription = useCallback(async () => {
    try {
      await cancelSubscriptionViaBackend();
      await refresh();
    } catch (error) {
      throw error;
    }
  }, [refresh]);

  return {
    plans: PLANS,
    subscriptionInfo,
    isPro,
    loading,
    refresh,
    subscribe,
    cancelSubscription,
  };
}
