import { Platform } from "react-native";
import { isPremium } from "./subscription";
import { ENV } from "../config/env";

// Test Ad Unit IDs (Google's test IDs - always show test ads)
const TEST_BANNER_ID = Platform.select({
  android: "ca-app-pub-3940256099942544/6300978111",
  ios: "ca-app-pub-3940256099942544/2934735716",
});

const TEST_INTERSTITIAL_ID = Platform.select({
  android: "ca-app-pub-3940256099942544/1033173712",
  ios: "ca-app-pub-3940256099942544/4411468910",
});

// Production Ad Unit IDs from environment variables (.env file)
const PRODUCTION_BANNER_ID = Platform.select({
  android: ENV.ADMOB_ANDROID_BANNER_ID || TEST_BANNER_ID,
  ios: ENV.ADMOB_IOS_BANNER_ID || TEST_BANNER_ID,
});

const PRODUCTION_INTERSTITIAL_ID = Platform.select({
  android: ENV.ADMOB_ANDROID_INTERSTITIAL_ID || TEST_INTERSTITIAL_ID,
  ios: ENV.ADMOB_IOS_INTERSTITIAL_ID || TEST_INTERSTITIAL_ID,
});

// Use test IDs in development, production IDs in release builds
const __DEV__ = process.env.NODE_ENV === "development";

/**
 * Check if ads should be shown for the current user
 * Ads are only shown to free users, not premium users
 */
export async function shouldShowAds(): Promise<boolean> {
  const premium = await isPremium();
  return !premium; // Show ads only if not premium
}

/**
 * Get the appropriate Banner Ad Unit ID
 * Returns null if user is premium (ads disabled)
 */
export async function getBannerAdUnitId(): Promise<string | null> {
  const showAds = await shouldShowAds();

  if (!showAds) {
    return null; // Don't show ads for premium users
  }

  // Use test IDs in development, production IDs in production
  // Falls back to test IDs if env variables are not set
  const adUnitId = __DEV__ ? TEST_BANNER_ID : PRODUCTION_BANNER_ID;
  return adUnitId as string;
}

/**
 * Get the appropriate Interstitial Ad Unit ID
 * Returns null if user is premium (ads disabled)
 */
export async function getInterstitialAdUnitId(): Promise<string | null> {
  const showAds = await shouldShowAds();

  if (!showAds) {
    return null; // Don't show ads for premium users
  }

  // Use test IDs in development, production IDs in production
  // Falls back to test IDs if env variables are not set
  const adUnitId = __DEV__ ? TEST_INTERSTITIAL_ID : PRODUCTION_INTERSTITIAL_ID;
  return adUnitId as string;
}

/**
 * Check if the app is in development mode
 */
export function isDevelopment(): boolean {
  return __DEV__;
}

/**
 * Get ad request configuration
 */
export const adRequestOptions = {
  // Additional request options
  requestNonPersonalizedAdsOnly: false,
  networkExtras: {},
  keywords: ["health", "medicine", "wellness", "healthcare", "fitness"],
};
