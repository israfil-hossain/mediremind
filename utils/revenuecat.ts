import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import PurchasesUI from "react-native-purchases-ui";
import Constants from "expo-constants";
import { ENV } from "../config/env";

// Test key for Expo Go (paywall UI won't display but SDK works)
const TEST_API_KEY = "test_lfxSmareMuAWVHTRcfgRBEqYMpP";

// Production key from .env
const PRODUCTION_API_KEY = ENV.REVENUECAT_API_KEY;

// Detect if running in Expo Go
// Check if running in Expo Go by checking executionEnvironment
const isExpoGo = Constants.executionEnvironment === "storeClient";

// Use production key always (allows paywall to work in development builds)
const RC_API_KEY = PRODUCTION_API_KEY || TEST_API_KEY;

const ENTITLEMENT_ID = "flowentech Premium";

export const isTestMode = () => RC_API_KEY.startsWith("test_");
export const isRunningInExpoGo = () => isExpoGo;

export async function initRevenueCat(appUserId?: string) {
  console.log(`Initializing RevenueCat (${isExpoGo ? 'Expo Go - Test Mode' : 'Development Build'})`);
  console.log(`Using API key: ${RC_API_KEY.substring(0, 10)}...`);

  try {
    Purchases.configure({ apiKey: RC_API_KEY, appUserID: appUserId });
    Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  } catch (error) {
    console.error("RevenueCat initialization failed:", error);
    throw error;
  }
}

export async function logInRevenueCat(appUserId: string) {
  await Purchases.logIn(appUserId);
}

export async function logOutRevenueCat() {
  await Purchases.logOut();
}

export async function fetchOfferings(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export async function fetchCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export function isEntitled(info: CustomerInfo): boolean {
  // Development override: Test premium features without subscription
  if (__DEV__ && ENV.DEV_IS_PREMIUM) {
    console.log("🔧 [DEV] Premium override enabled via EXPO_PUBLIC_DEV_IS_PREMIUM");
    return true;
  }

  return info.entitlements.active[ENTITLEMENT_ID] != null;
}

export async function purchasePackageById(
  offering: PurchasesOffering | null,
  packageId: string
): Promise<CustomerInfo> {
  if (!offering?.availablePackages) {
    throw new Error("No offerings available");
  }
  const pkg: PurchasesPackage | undefined = offering.availablePackages.find(
    (p) => p.identifier === packageId
  );
  if (!pkg) throw new Error("Package not found");
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  const info = await Purchases.restorePurchases();
  return info;
}

export async function presentPaywall(offeringId?: string) {
  // Presents RevenueCat paywall UI (recommended)
  // @ts-ignore - offeringIdentifier is valid but types may be outdated
  return PurchasesUI.presentPaywall({
    offeringIdentifier: offeringId,
  });
}

export async function presentCustomerCenter() {
  // Self-serve manage/restore
  return PurchasesUI.presentCustomerCenter();
}
