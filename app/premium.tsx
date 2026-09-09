import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassIconButton, ScreenBackground } from "../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../constants/design";
import { useTheme } from "../contexts/ThemeContext";
import { useStripe } from "../hooks/useStripe";
import { StripePlanType } from "../utils/stripe";

const MONTHLY_PRICE = 9.99;
const YEARLY_MONTHLY_PRICE = 9.99;
const YEARLY_DISCOUNT = 0.2;
const MONTHS_IN_YEAR = 12;
const LIFETIME_PRICE = 299;

const yearlyOriginalPrice = YEARLY_MONTHLY_PRICE * MONTHS_IN_YEAR;
const yearlyDiscountedPrice = yearlyOriginalPrice * (1 - YEARLY_DISCOUNT);
const yearlySavings = yearlyOriginalPrice - yearlyDiscountedPrice;

const PREMIUM_FEATURES = [
  { icon: "infinite-outline" as const, title: "Unlimited Medications", description: "No limit on the number of medications you can track" },
  { icon: "cloud-upload-outline" as const, title: "Cloud Backup & Sync", description: "Your data is safely backed up and synced across devices" },
  { icon: "analytics-outline" as const, title: "Advanced Analytics", description: "Track adherence rates and view detailed health reports" },
  { icon: "notifications-outline" as const, title: "Advanced Refill Alerts", description: "Get automated notifications when medication supply is low" },
  { icon: "document-text-outline" as const, title: "Data Export", description: "Export PDF reports for doctor visits" },
  { icon: "time-outline" as const, title: "Unlimited History", description: "Access your complete medication history, no time limits" },
  { icon: "shield-checkmark-outline" as const, title: "Ad-Free Experience", description: "Enjoy a clean, distraction-free interface" },
  { icon: "people-outline" as const, title: "Family Care (Up to 5 Members)", description: "Manage medications for your whole family" },
  { icon: "notifications-off-outline" as const, title: "Missed Dose Alerts", description: "Get notified if a family member misses a dose" },
  { icon: "stats-chart-outline" as const, title: "Caregiver Dashboard", description: "Unified view of all family members' medications" },
];

const PLANS: { key: StripePlanType; name: string; price: string; period: string; badge?: string; note?: string }[] = [
  { key: "monthly", name: "Monthly", price: `$${MONTHLY_PRICE}`, period: "per month" },
  { key: "yearly", name: "Yearly", price: `$${yearlyDiscountedPrice.toFixed(2)}`, period: "per year", badge: "SAVE 20%", note: `Save $${yearlySavings.toFixed(2)}` },
  { key: "lifetime", name: "Lifetime", price: `$${LIFETIME_PRICE}`, period: "one-time", badge: "BEST VALUE", note: "Pay once, own forever" },
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
      const errorMessage =
        e.message?.includes("network") || e.message?.includes("connection")
          ? "Network error. Please check your internet connection and try again."
          : "Something went wrong. Please try again.";
      Alert.alert("Payment Failed", errorMessage, [{ text: "OK" }]);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleCancelSubscription = () =>
    Alert.alert("Cancel Subscription", "Are you sure you want to cancel? You'll keep access until the end of your current billing period.", [
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
    ]);

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={styles.title}>Premium</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isPro && !loading && (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={20} color={accents.emerald} />
            <Text style={styles.activeBadgeText}>Premium Active</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Choose your plan</Text>
        <View style={styles.plans}>
          {PLANS.map((plan) => {
            const active = selectedPlan === plan.key;
            return (
              <Pressable key={plan.key} style={{ flex: 1 }} onPress={() => setSelectedPlan(plan.key)}>
                <GlassCard padding={spacing.md} radius={R.lg} style={[styles.planCard, active && { borderWidth: 2, borderColor: accents.emerald }]}>
                  {plan.badge && (
                    <View style={[styles.planBadge, { backgroundColor: plan.key === "yearly" ? accents.amber : accents.emerald }]}>
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                  {plan.note && <Text style={styles.planNote}>{plan.note}</Text>}
                </GlassCard>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Premium features</Text>
        {PREMIUM_FEATURES.map((feature, i) => (
          <GlassCard key={i} style={styles.featureCard} padding={spacing.lg}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon} size={22} color={accents.emerald} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.description}</Text>
            </View>
          </GlassCard>
        ))}

        {!isPro && (
          <GlassButton
            label={selectedPlan === "lifetime" ? "Get Lifetime Access" : "Subscribe Now"}
            onPress={handleSubscribe}
            loading={purchaseLoading}
            style={{ marginTop: spacing.lg }}
          />
        )}

        <View style={styles.trialInfo}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.trialText}>Start with a 7-day free trial. Cancel anytime. No credit card required for trial.</Text>
        </View>

        {isPro && (
          <Pressable style={styles.cancelBtn} onPress={handleCancelSubscription}>
            <Text style={styles.cancelText}>Cancel Subscription</Text>
          </Pressable>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
    title: { ...typography.title, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    activeBadge: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: withAlpha(accents.emerald, 0.14), paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: R.pill, alignSelf: "flex-start", marginBottom: spacing.lg },
    activeBadgeText: { color: accents.emerald, fontWeight: "700" },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginTop: spacing.md, marginBottom: spacing.md },
    plans: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
    planCard: { alignItems: "center", paddingTop: spacing.lg, minHeight: 130, justifyContent: "center" },
    planBadge: { position: "absolute", top: -10, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: R.sm },
    planBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
    planName: { ...typography.label, color: theme.colors.textSecondary },
    planPrice: { fontSize: 22, fontWeight: "800", color: theme.colors.text, marginTop: 4 },
    planPeriod: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    planNote: { ...typography.caption, color: accents.emerald, fontWeight: "600", marginTop: spacing.xs, textAlign: "center" },
    featureCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    featureIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: withAlpha(accents.emerald, 0.14), alignItems: "center", justifyContent: "center" },
    featureTitle: { ...typography.h2, color: theme.colors.text },
    featureDesc: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 },
    trialInfo: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.lg },
    trialText: { flex: 1, ...typography.caption, color: theme.colors.textSecondary, lineHeight: 18 },
    cancelBtn: { marginTop: spacing.xl, paddingVertical: 13, borderRadius: R.pill, backgroundColor: withAlpha(accents.rose, 0.1), alignItems: "center" },
    cancelText: { color: accents.rose, fontWeight: "700", fontSize: 15 },
  });
