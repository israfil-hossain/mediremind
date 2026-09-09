import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard, GlassIconButton, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useTheme } from "../../contexts/ThemeContext";
import { clearAllData, DoseHistory, getDoseHistory, getMedications, Medication } from "../../utils/storage";
import { getHistoryLimitDays, isPremium } from "../../utils/subscription";

type EnrichedDoseHistory = DoseHistory & { medication?: Medication };
type Filter = "all" | "taken" | "missed";

export default function HistoryViewScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [history, setHistory] = useState<EnrichedDoseHistory[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<Filter>("all");
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [historyLimitDays, setHistoryLimitDays] = useState(30);

  const loadHistory = useCallback(async () => {
    try {
      const [doseHistory, medications, premium, limitDays] = await Promise.all([getDoseHistory(), getMedications(), isPremium(), getHistoryLimitDays()]);
      setIsPremiumUser(premium);
      setHistoryLimitDays(limitDays);
      setHistory(doseHistory.map((dose) => ({ ...dose, medication: medications.find((m) => m.id === dose.medicationId) })));
    } catch (e) {
      console.error("Error loading history:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const filtered = history.filter((d) => (selectedFilter === "all" ? true : selectedFilter === "taken" ? d.taken : !d.taken));
  const grouped = Object.entries(
    filtered.reduce((acc, dose) => {
      const date = new Date(dose.timestamp).toDateString();
      (acc[date] ||= []).push(dose);
      return acc;
    }, {} as Record<string, EnrichedDoseHistory[]>)
  ).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

  const handleClearAllData = () =>
    Alert.alert("Clear All Data", "Are you sure you want to clear all medication data? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          try {
            await clearAllData();
            await loadHistory();
            Alert.alert("Success", "All data has been cleared successfully");
          } catch (e) {
            console.error("Error clearing data:", e);
            Alert.alert("Error", "Failed to clear data. Please try again.");
          }
        },
      },
    ]);

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={styles.title}>History Log</Text>
      </View>

      <View style={styles.filters}>
        {(["all", "taken", "missed"] as Filter[]).map((f) => {
          const active = selectedFilter === f;
          return (
            <Pressable key={f} onPress={() => setSelectedFilter(f)} style={[styles.filterPill, active && { backgroundColor: accents.emerald }]}>
              <Text style={[styles.filterText, active && { color: "#fff" }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isPremiumUser && historyLimitDays !== Infinity && (
          <GlassCard style={styles.block}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md }}>
              <View style={styles.rowIcon}>
                <Ionicons name="time-outline" size={22} color={accents.emerald} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.infoTitle}>View full history</Text>
                <Text style={styles.infoDesc}>Free version shows the last {historyLimitDays} days. Upgrade to Premium for unlimited history.</Text>
              </View>
            </View>
            <Pressable style={styles.bannerBtn} onPress={() => router.push("/premium")}>
              <Text style={styles.bannerBtnText}>Upgrade</Text>
            </Pressable>
          </GlassCard>
        )}

        {grouped.map(([date, doses]) => (
          <View key={date} style={{ marginBottom: spacing.xl }}>
            <Text style={styles.dateHeader}>{new Date(date).toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}</Text>
            {doses.map((dose) => (
              <GlassCard key={dose.id} style={styles.histCard} padding={spacing.lg}>
                <View style={[styles.medBar, { backgroundColor: dose.medication?.color || theme.colors.border }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{dose.medication?.name || "Unknown Medication"}</Text>
                  <Text style={styles.medMeta}>
                    {dose.medication?.dosage} · {new Date(dose.timestamp).toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: withAlpha(dose.taken ? accents.emerald : accents.rose, 0.14) }]}>
                  <Ionicons name={dose.taken ? "checkmark-circle" : "close-circle"} size={15} color={dose.taken ? accents.emerald : accents.rose} />
                  <Text style={[styles.statusText, { color: dose.taken ? accents.emerald : accents.rose }]}>{dose.taken ? "Taken" : "Missed"}</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        ))}

        <Pressable style={styles.clearBtn} onPress={handleClearAllData}>
          <Ionicons name="trash-outline" size={18} color={accents.rose} />
          <Text style={styles.clearText}>Clear all data</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.title, color: theme.colors.text },
    filters: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
    filterPill: { paddingHorizontal: spacing.xl, paddingVertical: 8, borderRadius: R.pill, backgroundColor: withAlpha(theme.colors.text, 0.06) },
    filterText: { ...typography.label, color: theme.colors.textSecondary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    block: { marginBottom: spacing.lg },
    rowIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: withAlpha(accents.emerald, 0.14), alignItems: "center", justifyContent: "center" },
    infoTitle: { ...typography.h2, color: theme.colors.text },
    infoDesc: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 },
    bannerBtn: { backgroundColor: accents.emerald, paddingVertical: 10, borderRadius: R.pill, alignItems: "center" },
    bannerBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    dateHeader: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.md },
    histCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    medBar: { width: 6, height: 40, borderRadius: 3, marginRight: spacing.md },
    medName: { ...typography.h2, color: theme.colors.text },
    medMeta: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
    statusText: { fontSize: 13, fontWeight: "600" },
    clearBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: withAlpha(accents.rose, 0.1), paddingVertical: 13, borderRadius: R.pill, marginBottom: spacing.lg },
    clearText: { color: accents.rose, fontSize: 15, fontWeight: "700" },
  });
