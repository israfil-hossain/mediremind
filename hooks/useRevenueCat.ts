import { useEffect, useState, useCallback } from "react";
import Purchases, { CustomerInfo, PurchasesOffering } from "react-native-purchases";
import { fetchOfferings, fetchCustomerInfo, isEntitled } from "../utils/revenuecat";

const ENTITLEMENT_ID = "flowentech Premium";

export function useRevenueCat() {
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [o, info] = await Promise.all([fetchOfferings(), fetchCustomerInfo()]);
      setOfferings(o);
      setCustomerInfo(info);
      setIsPro(isEntitled(info));
    } catch (e) {
      console.warn("RevenueCat refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const sub = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
      setIsPro(isEntitled(info));
    });
    return () => sub.remove();
  }, [refresh]);

  return { offerings, customerInfo, isPro, loading, refresh };
}
