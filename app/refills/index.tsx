import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard, GlassIconButton, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useTheme } from "../../contexts/ThemeContext";
import { getMedications, Medication, updateMedication } from "../../utils/storage";
import { isPremium } from "../../utils/subscription";

export default function RefillTrackerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  const loadMedications = useCallback(async () => {
    try {
      const [all, premium] = await Promise.all([getMedications(), isPremium()]);
      setMedications(all);
      setIsPremiumUser(premium);
    } catch (e) {
      console.error("Error loading medications:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [loadMedications])
  );

  const handleRefill = async (medication: Medication) => {
    try {
      await updateMedication({ ...medication, currentSupply: medication.totalSupply, lastRefillDate: new Date().toISOString() });
      await loadMedications();
      Alert.alert("Refill Recorded", `${medication.name} has been refilled to ${medication.totalSupply} units.`);
    } catch (e) {
      console.error("Error recording refill:", e);
      Alert.alert("Error", "Failed to record refill. Please try again.");
    }
  };

  const supplyStatus = (m: Medication) => {
    const pct = (m.currentSupply / m.totalSupply) * 100;
    if (pct <= m.refillAt) return { status: "Low", color: accents.rose };
    if (pct <= 50) return { status: "Medium", color: accents.amber };
    return { status: "Good", color: accents.emerald };
  };

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={styles.title}>Refill tracker</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isPremiumUser && (
          <GlassCard style={styles.block}>
            <View style={styles.bannerRow}>
              <View style={styles.bannerIcon}>
                <Ionicons name="notifications-outline" size={22} color={accents.emerald} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.bannerTitle}>Automated refill alerts</Text>
                <Text style={styles.bannerText}>Get notified automatically when supply runs low. Upgrade to Premium to enable.</Text>
              </View>
            </View>
            <Pressable style={styles.bannerBtn} onPress={() => router.push("/premium")}>
              <Text style={styles.bannerBtnText}>Upgrade</Text>
            </Pressable>
          </GlassCard>
        )}

        {medications.length === 0 ? (
          <GlassCard style={styles.empty} padding={spacing.xxl}>
            <Ionicons name="medical-outline" size={44} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No medications to track</Text>
            <Pressable style={styles.addBtn} onPress={() => router.push("/medications/add")}>
              <Text style={styles.addBtnText}>Add medication</Text>
            </Pressable>
          </GlassCard>
        ) : (
          medications.map((m) => {
            const status = supplyStatus(m);
            const pct = Math.max(0, Math.min(100, (m.currentSupply / m.totalSupply) * 100));
            return (
              <GlassCard key={m.id} style={styles.block} padding={spacing.lg}>
                <View style={styles.medHeader}>
                  <View style={[styles.medBar, { backgroundColor: m.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{m.name}</Text>
                    <Text style={styles.medDosage}>{m.dosage}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: withAlpha(status.color, 0.14) }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.status}</Text>
                  </View>
                </View>

                <View style={styles.supplyRow}>
                  <Text style={styles.supplyLabel}>Current supply</Text>
                  <Text style={styles.supplyValue}>{m.currentSupply} units</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: status.color }]} />
                </View>
                <View style={styles.supplyRow}>
                  <Text style={styles.refillLabel}>Refill at {m.refillAt}%</Text>
                  <Text style={styles.refillLabel}>{Math.round(pct)}%</Text>
                </View>
                {m.lastRefillDate && (
                  <Text style={styles.lastRefill}>Last refill: {new Date(m.lastRefillDate).toLocaleDateString()}</Text>
                )}

                <Pressable
                  style={[styles.refillBtn, { backgroundColor: pct < 100 ? m.color : theme.colors.border }]}
                  onPress={() => handleRefill(m)}
                  disabled={pct >= 100}
                >
                  <Text style={styles.refillBtnText}>Record refill</Text>
                </Pressable>
              </GlassCard>
            );
          })
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
    block: { marginBottom: spacing.lg },
    bannerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
    bannerIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: withAlpha(accents.emerald, 0.14), alignItems: "center", justifyContent: "center" },
    bannerTitle: { ...typography.h2, color: theme.colors.text },
    bannerText: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 },
    bannerBtn: { backgroundColor: accents.emerald, paddingVertical: 10, borderRadius: R.pill, alignItems: "center" },
    bannerBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    empty: { alignItems: "center", gap: spacing.md },
    emptyText: { ...typography.body, color: theme.colors.textSecondary },
    addBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: R.pill },
    addBtnText: { color: "#fff", fontWeight: "700" },
    medHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
    medBar: { width: 6, height: 40, borderRadius: 3, marginRight: spacing.md },
    medName: { ...typography.h2, color: theme.colors.text },
    medDosage: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: R.pill },
    statusText: { fontSize: 13, fontWeight: "700" },
    supplyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
    supplyLabel: { ...typography.caption, color: theme.colors.textSecondary },
    supplyValue: { ...typography.label, color: theme.colors.text },
    track: { height: 8, backgroundColor: withAlpha(theme.colors.text, 0.08), borderRadius: 4, overflow: "hidden", marginBottom: spacing.sm },
    fill: { height: "100%", borderRadius: 4 },
    refillLabel: { ...typography.caption, color: theme.colors.textSecondary },
    lastRefill: { ...typography.caption, color: theme.colors.textTertiary, marginTop: spacing.xs },
    refillBtn: { paddingVertical: 13, borderRadius: R.pill, alignItems: "center", marginTop: spacing.lg },
    refillBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
