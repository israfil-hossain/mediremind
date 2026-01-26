import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import PurchasesUI from "react-native-purchases-ui";
import { useRevenueCat } from "../hooks/useRevenueCat";
import { isTestMode, isRunningInExpoGo } from "../utils/revenuecat";

const { width } = Dimensions.get("window");

const PREMIUM_FEATURES = [
  {
    icon: "infinite-outline",
    title: "Unlimited Medications",
    description: "No limit on the number of medications you can track",
  },
  {
    icon: "cloud-upload-outline",
    title: "Cloud Backup & Sync",
    description: "Your data is safely backed up and synced across devices",
  },
  {
    icon: "analytics-outline",
    title: "Advanced Analytics",
    description: "Track adherence rates and view detailed health reports",
  },
  {
    icon: "notifications-outline",
    title: "Advanced Refill Alerts",
    description: "Get automated notifications when medication supply is low",
  },
  {
    icon: "document-text-outline",
    title: "Data Export",
    description: "Export PDF reports for doctor visits",
  },
  {
    icon: "time-outline",
    title: "Unlimited History",
    description: "Access your complete medication history, no time limits",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Ad-Free Experience",
    description: "Enjoy a clean, distraction-free interface",
  },
  {
    icon: "star-outline",
    title: "Priority Support",
    description: "Get priority customer support when you need help",
  },
];

const FAMILY_CARE_FEATURES = [
  {
    icon: "people-outline",
    title: "Up to 5 Family Members",
    description: "Manage medications for your whole family",
  },
  {
    icon: "notifications-outline",
    title: "Missed Dose Alerts",
    description: "Get notified if a family member misses a dose",
  },
  {
    icon: "stats-chart-outline",
    title: "Caregiver Dashboard",
    description: "Unified view of all family members' medications",
  },
  {
    icon: "chatbubbles-outline",
    title: "Family Communication",
    description: "In-app messaging and shared reports",
  },
];

export default function PremiumScreen() {
  const router = useRouter();
  const [subscriptionType, setSubscriptionType] = useState<"premium" | "family">("premium");
  const { isPro, loading, offerings } = useRevenueCat();
  const [paywallLoading, setPaywallLoading] = useState(false);

  const features = subscriptionType === "premium" ? PREMIUM_FEATURES : FAMILY_CARE_FEATURES;
  const hasOfferings = offerings && offerings.availablePackages && offerings.availablePackages.length > 0;

  const presentPaywall = async () => {
    try {
      setPaywallLoading(true);
      console.log("Opening RevenueCat paywall...");

      const result = await PurchasesUI.presentPaywall();
      console.log("Paywall result:", result);

      // Check if paywall was not presented (Preview API mode)
      if (result === "NOT_PRESENTED") {
        const isExpoGo = isRunningInExpoGo();

        Alert.alert(
          isExpoGo ? "Expo Go Limitation" : "Development Mode",
          isExpoGo
            ? "Paywall UI is not available in Expo Go.\n\n" +
              "To test subscriptions:\n" +
              "1. Create a development build: npx expo run:android\n" +
              "2. Or wait until production deployment\n\n" +
              "RevenueCat requires native code which Expo Go doesn't support."
            : "RevenueCat is running in test mode. The paywall cannot be displayed.\n\n" +
              "To enable subscriptions:\n" +
              "1. Configure products in RevenueCat Dashboard\n" +
              "2. Create an offering named 'default'\n" +
              "3. Add subscription products to the offering",
          [
            { text: "OK" }
          ]
        );
        return;
      }

      if (result?.customerInfo?.entitlements.active["flowentech Premium"]) {
        Alert.alert("Welcome!", "Your Premium access is now active.");
        router.back();
      } else {
        console.log("Paywall closed without purchase");
      }
    } catch (e: any) {
      console.error("Paywall error:", e);

      if (e.code === "PURCHASE_CANCELLED") {
        console.log("User cancelled purchase");
        return;
      }

      // Show more detailed error to help debug
      let errorMessage = "We couldn't open the purchase screen.";

      if (e.message?.includes("offering") || e.message?.includes("not found")) {
        errorMessage = "No subscription plans are currently available. Please contact support.";
      } else if (e.message?.includes("network") || e.message?.includes("connection")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (e.code === "CONFIGURATION_ERROR") {
        errorMessage = "Subscription service is not configured. Please contact support.";
      }

      Alert.alert(
        "Cannot Open Purchase Screen",
        `${errorMessage}\n\nError: ${e.message || e.code || "Unknown error"}`,
        [
          { text: "OK" }
        ]
      );
    } finally {
      setPaywallLoading(false);
    }
  };

  const presentCustomerCenter = async () => {
    try {
      console.log("Opening RevenueCat Customer Center...");
      await PurchasesUI.presentCustomerCenter();
    } catch (e: any) {
      console.error("Customer Center error:", e);
      Alert.alert(
        "Cannot Open Customer Center",
        `Unable to open the subscription manager.\n\nError: ${e.message || e.code || "Unknown error"}`,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a8e2d", "#146922"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#1a8e2d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {subscriptionType === "premium" ? "Premium" : "Family Care"}
          </Text>
        </View>

        {isPro && !loading && (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.activeBadgeText}>Premium Active</Text>
          </View>
        )}

        {isRunningInExpoGo() && !isPro && (
          <View style={styles.expoGoBadge}>
            <Ionicons name="warning" size={20} color="#FF9800" />
            <Text style={styles.expoGoBadgeText}>
              Running in Expo Go: Paywall UI is disabled. Create a development build to test subscriptions.
              {"\n\n"}Run: npx expo run:android
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Subscription Type Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                subscriptionType === "premium" && styles.toggleButtonActive,
              ]}
              onPress={() => setSubscriptionType("premium")}
            >
              <Text
                style={[
                  styles.toggleText,
                  subscriptionType === "premium" && styles.toggleTextActive,
                ]}
              >
                Premium
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                subscriptionType === "family" && styles.toggleButtonActive,
              ]}
              onPress={() => setSubscriptionType("family")}
            >
              <Text
                style={[
                  styles.toggleText,
                  subscriptionType === "family" && styles.toggleTextActive,
                ]}
              >
                Family Care
              </Text>
            </TouchableOpacity>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={24} color="#1a8e2d" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Purchase Button (RevenueCat Paywall) */}
          {!isPro && (
            <TouchableOpacity
              style={[styles.purchaseButton, paywallLoading && styles.purchaseButtonDisabled]}
              onPress={presentPaywall}
              disabled={paywallLoading}
            >
              <LinearGradient
                colors={["#1a8e2d", "#146922"]}
                style={styles.purchaseButtonGradient}
              >
                <Text style={styles.purchaseButtonText}>
                  {paywallLoading ? "Opening..." : "View Plans & Start Trial"}
                </Text>
                <Text style={styles.purchaseButtonSubtext}>Managed by App Store / Play Store</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Trial Info */}
          <View style={styles.trialInfo}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.trialInfoText}>
              Start with a 7-day free trial. Cancel anytime. No credit card required for trial.
            </Text>
          </View>

          {/* Manage / Restore */}
          <View style={styles.manageContainer}>
            <Text style={styles.manageTitle}>Manage or Restore</Text>
            <View style={styles.manageButtons}>
              <TouchableOpacity style={styles.manageButton} onPress={presentCustomerCenter}>
                <Text style={styles.manageButtonText}>Open Customer Center</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.manageButton} onPress={presentPaywall}>
                <Text style={styles.manageButtonText}>Restore / Change Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 140 : 120,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginLeft: 15,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 8,
  },
  expoGoBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  expoGoBadgeText: {
    color: "#E65100",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  testModeBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  testModeBadgeText: {
    color: "#1565C0",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  warningBadgeText: {
    color: "#E65100",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#1a8e2d",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  toggleTextActive: {
    color: "white",
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
  },
  pricingContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  plansContainer: {
    flexDirection: "row",
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#1a8e2d",
    backgroundColor: "#F1F8F4",
  },
  planCardRecommended: {
    borderColor: "#FF9800",
  },
  recommendedBadge: {
    position: "absolute",
    top: -8,
    backgroundColor: "#FF9800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  planName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  planSavings: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 4,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  purchaseButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  purchaseButtonSubtext: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
  },
  trialInfo: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: "flex-start",
  },
  trialInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    lineHeight: 18,
  },
  manageContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  manageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  manageButtons: {
    gap: 10,
  },
  manageButton: {
    backgroundColor: "#F1F8F4",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCEFE2",
  },
  manageButtonText: {
    color: "#1a8e2d",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
