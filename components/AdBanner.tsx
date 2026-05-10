import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { getBannerAdUnitId } from "../utils/ads";

const AD_HEIGHT = 50; // Standard banner ad height

interface AdBannerProps {
  style?: any;
}

/**
 * AdBanner Component
 *
 * Displays banner ads at the bottom of screens for free users only.
 * Automatically hidden for premium users.
 *
 * Usage:
 * ```tsx
 * import AdBanner from '../components/AdBanner';
 *
 * <View style={{ flex: 1 }}>
 *   <YourContent />
 *   <AdBanner />
 * </View>
 * ```
 */
export default function AdBanner({ style }: AdBannerProps) {
  const [adUnitId, setAdUnitId] = useState<string | null>(null);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    loadAdUnitId();
  }, []);

  const loadAdUnitId = async () => {
    try {
      const unitId = await getBannerAdUnitId();
      if (unitId) {
        setAdUnitId(unitId);
        setShowAd(true);
      } else {
        // User is premium, don't show ads
        setShowAd(false);
      }
    } catch (error) {
      console.error("Error loading ad unit ID:", error);
      setShowAd(false);
    }
  };

  // Don't render anything if user is premium or no ad unit ID
  if (!showAd || !adUnitId) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
          keywords: ["health", "medicine", "wellness", "healthcare"],
        }}
        onAdLoaded={() => {
          console.log("Banner ad loaded");
        }}
        onAdFailedToLoad={(error) => {
          console.error("Banner ad failed to load:", error);
        }}
        onAdOpened={() => {
          console.log("Banner ad opened");
        }}
        onAdClosed={() => {
          console.log("Banner ad closed");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: AD_HEIGHT,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    height: AD_HEIGHT,
  },
});

/**
 * A placeholder component that reserves space for ads
 * Use this when you want to maintain layout consistency
 * whether ads are shown or not
 */
export function AdPlaceholder({ height = AD_HEIGHT }: { height?: number }) {
  return <View style={{ height }} />;
}
