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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useStripe } from "../hooks/useStripe";
import { StripePlanType } from "../utils/stripe";
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");

const MONTHLY_PRICE = 9.99;
const YEARLY_MONTHLY_PRICE = 9.99;
const YEARLY_DISCOUNT = 0.20;
const MONTHS_IN_YEAR = 12;
const LIFETIME_PRICE = 299;

const yearlyOriginalPrice = YEARLY_MONTHLY_PRICE * MONTHS_IN_YEAR;
const yearlyDiscountedPrice = yearlyOriginalPrice * (1 - YEARLY_DISCOUNT);
const yearlySavings = yearlyOriginalPrice - yearlyDiscountedPrice;

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
    icon: "people-outline",
    title: "Family Care (Up to 5 Members)",
    description: "Manage medications for your whole family",
  },
  {
    icon: "notifications-off-outline",
    title: "Missed Dose Alerts",
    description: "Get notified if a family member misses a dose",
  },
  {
    icon: "stats-chart-outline",
    title: "Caregiver Dashboard",
    description: "Unified view of all family members' medications",
  },
];

export default function PremiumScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<StripePlanType>("yearly");
  const { isPro, loading, subscribe, cancelSubscription } = useStripe();
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setPurchaseLoading(true);
      const success = await subscribe(selectedPlan);

      if (success) {
        Alert.alert("Welcome!", "Your Premium access is now active.");
        router.back();
      }
    } catch (e: any) {
      console.error("Purchase error:", e);

      let errorMessage = "Something went wrong. Please try again.";
      if (e.message?.includes("network") || e.message?.includes("connection")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }

      Alert.alert("Payment Failed", errorMessage, [{ text: "OK" }]);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel? You'll keep access until the end of your current billing period.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription();
              Alert.alert("Cancelled", "Your subscription has been cancelled.");
            } catch (e: any) {
              Alert.alert("Error", e.message || "Could not cancel subscription.");
            }
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>Premium</Text>
        </View>

        {isPro && !loading && (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.activeBadgeText}>Premium Active</Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Pricing Cards */}
          <View style={styles.pricingContainer}>
            <Text style={styles.pricingTitle}>Choose Your Plan</Text>
            <View style={styles.plansContainer}>
              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === "monthly" && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan("monthly")}
              >
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planPrice}>${MONTHLY_PRICE}</Text>
                <Text style={styles.planPeriod}>per month</Text>
              </TouchableOpacity>

              {/* Yearly Plan - Recommended */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === "yearly" && styles.planCardSelected,
                  styles.planCardRecommended,
                ]}
                onPress={() => setSelectedPlan("yearly")}
              >
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>SAVE 20%</Text>
                </View>
                <Text style={styles.planName}>Yearly</Text>
                <Text style={styles.planPrice}>${yearlyDiscountedPrice.toFixed(2)}</Text>
                <Text style={styles.planPeriod}>per year</Text>
                <View style={styles.savingsContainer}>
                  <Text style={styles.planSavings}>Save ${yearlySavings.toFixed(2)}</Text>
                  <Text style={styles.planOriginalPrice}>${yearlyOriginalPrice.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>

              {/* Lifetime Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === "lifetime" && styles.planCardSelected,
                  styles.planCardLifetime,
                ]}
                onPress={() => setSelectedPlan("lifetime")}
              >
                <View style={styles.lifetimeBadge}>
                  <Text style={styles.lifetimeBadgeText}>BEST VALUE</Text>
                </View>
                <Text style={styles.planName}>Lifetime</Text>
                <Text style={styles.planPrice}>${LIFETIME_PRICE}</Text>
                <Text style={styles.planPeriod}>one-time payment</Text>
                <View style={styles.savingsContainer}>
                  <Text style={styles.planSavings}>Pay once, own forever</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Premium Features</Text>
            {PREMIUM_FEATURES.map((feature, index) => (
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

          {/* Purchase Button */}
          {!isPro && (
            <TouchableOpacity
              style={[styles.purchaseButton, purchaseLoading && styles.purchaseButtonDisabled]}
              onPress={handleSubscribe}
              disabled={purchaseLoading}
            >
              <LinearGradient
                colors={["#1a8e2d", "#146922"]}
                style={styles.purchaseButtonGradient}
              >
                {purchaseLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.purchaseButtonText}>
                      {selectedPlan === "lifetime" ? "Get Lifetime Access" : "Subscribe Now"}
                    </Text>
                    <Text style={styles.purchaseButtonSubtext}>Secure payment via Stripe</Text>
                  </>
                )}
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

          {/* Manage Subscription */}
          {isPro && (
            <View style={styles.manageContainer}>
              <Text style={styles.manageTitle}>Manage Subscription</Text>
              <View style={styles.manageButtons}>
                <TouchableOpacity style={styles.manageButton} onPress={handleCancelSubscription}>
                  <Text style={styles.manageButtonText}>Cancel Subscription</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.card,
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
  scrollView: {
    flex: 1,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: "row",
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  pricingContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 16,
  },
  plansContainer: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  planCard: {
    flex: 1,
    minWidth: width / 3 - 20,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
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
  planCardLifetime: {
    borderColor: "#1a8e2d",
    backgroundColor: "#F1F8F4",
  },
  lifetimeBadge: {
    position: "absolute",
    top: -8,
    backgroundColor: "#1a8e2d",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lifetimeBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
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
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  planSavings: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 4,
  },
  savingsContainer: {
    marginTop: 8,
    alignItems: "center",
  },
  planOriginalPrice: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    textDecorationLine: "line-through",
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 16,
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
    color: theme.colors.textSecondary,
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
    color: theme.colors.text,
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
