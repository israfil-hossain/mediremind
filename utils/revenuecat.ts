import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import PurchasesUI from "react-native-purchases-ui";

const RC_API_KEY = "test_hzJdVMmeDObfVswtVFJAQdBmapt";
const ENTITLEMENT_ID = "flowentech Premium";

export async function initRevenueCat(appUserId?: string) {
  await Purchases.configure({ apiKey: RC_API_KEY, appUserID: appUserId });
  Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
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
  return PurchasesUI.presentPaywall({
    offeringIdentifier: offeringId,
  });
}

export async function presentCustomerCenter() {
  // Self-serve manage/restore
  return PurchasesUI.presentCustomerCenter();
}
