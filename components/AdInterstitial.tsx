import React, { useEffect, useRef, useState } from "react";
import { getInterstitialAdUnitId } from "../utils/ads";

// Lazy load the ads module to avoid crashes in Expo Go or when native modules are missing
let GoogleMobileAds: any = null;
try {
  GoogleMobileAds = require("react-native-google-mobile-ads");
} catch (e) {
  console.log("Google Mobile Ads not available in this environment");
}

/**
 * Interstitial Ad Hook
 *
 * Manages loading and showing interstitial (full-screen) ads.
 * Ads are only shown to free users, not premium users.
 * Gracefully handles missing native modules (e.g., running in Expo Go).
 *
 * Usage:
 * ```tsx
 * import { useInterstitialAd } from '../components/AdInterstitial';
 *
 * function MyScreen() {
 *   const { showAd, isReady, isLoading } = useInterstitialAd();
 *
 *   const handleAction = () => {
 *     // Show interstitial ad before/after an action
 *     showAd();
 *     // Or show it after navigation
 *   };
 *
 *   return (
 *     <Button onPress={handleAction} title="Perform Action" />
 *   );
 * }
 * ```
 */
export function useInterstitialAd() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const interstitialRef = useRef<any>(null);

  useEffect(() => {
    loadInterstitial();
    return () => {
      // Cleanup
      if (interstitialRef.current) {
        interstitialRef.current.removeAllListeners?.();
      }
    };
  }, []);

  const loadInterstitial = async () => {
    try {
      const adUnitId = await getInterstitialAdUnitId();

      if (!adUnitId || !GoogleMobileAds) {
        // User is premium or native module not available
        setShowAds(false);
        return;
      }

      setShowAds(true);
      setIsLoading(true);

      // Create and load interstitial ad
      const { InterstitialAd, AdEventType } = GoogleMobileAds;

      const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
        keywords: ["health", "medicine", "wellness", "healthcare"],
      });

      interstitialRef.current = interstitial;

      const unsubscribeLoaded = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log("Interstitial ad loaded");
          setIsReady(true);
          setIsLoading(false);
        }
      );

      const unsubscribeFailed = interstitial.addAdEventListener(
        AdEventType.FAILED_TO_LOAD,
        (error: any) => {
          console.error("Interstitial ad failed to load:", error);
          setIsReady(false);
          setIsLoading(false);
        }
      );

      const unsubscribeClosed = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log("Interstitial ad closed");
          setIsReady(false);
          // Preload the next ad
          loadInterstitial();
        }
      );

      // Start loading the ad
      await interstitial.load();

      return () => {
        unsubscribeLoaded();
        unsubscribeFailed();
        unsubscribeClosed();
      };
    } catch (error) {
      console.error("Error loading interstitial ad:", error);
      setIsLoading(false);
      setShowAds(false);
    }
  };

  const showAd = async () => {
    if (!showAds) {
      console.log("User is premium or ads not available, skipping ad");
      return false;
    }

    if (!isReady) {
      console.log("Interstitial ad not ready yet");
      return false;
    }

    try {
      await interstitialRef.current?.show();
      console.log("Interstitial ad shown");
      return true;
    } catch (error) {
      console.error("Error showing interstitial ad:", error);
      return false;
    }
  };

  return {
    showAd,
    isReady,
    isLoading,
    canShow: showAds && isReady,
  };
}

/**
 * Higher-order component to show interstitial ad on screen focus
 *
 * Usage:
 * ```tsx
 * import { withInterstitialAd } from '../components/AdInterstitial';
 *
 * function MyScreen() {
 *   return <View>Your content</View>;
 * }
 *
 * export default withInterstitialAd(MyScreen);
 * ```
 */
export function withInterstitialAd<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    showOnMount?: boolean; // Show ad when screen mounts
    showOnUnmount?: boolean; // Show ad when screen unmounts
    delay?: number; // Delay in ms before showing ad (default: 500)
  } = {}
) {
  return function WithInterstitialAd(props: P) {
    const { showAd, canShow } = useInterstitialAd();
    const hasShownAdRef = useRef(false);

    useEffect(() => {
      if (options.showOnMount && canShow && !hasShownAdRef.current) {
        const timer = setTimeout(() => {
          showAd();
          hasShownAdRef.current = true;
        }, options.delay || 500);

        return () => clearTimeout(timer);
      }
    }, [canShow]);

    useEffect(() => {
      return () => {
        if (options.showOnUnmount && canShow) {
          showAd();
        }
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
}
