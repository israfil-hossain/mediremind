import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import PremiumButton from "../../../components/PremiumButton";
import PremiumModal from "../../../components/PremiumModal";
import { GlassCard, GlassIconButton, ScreenBackground } from "../../../components/ui/Glass";
import { accents, spacing, typography, withAlpha } from "../../../constants/design";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  AdherenceStats,
  calculateAdherenceStats,
  getInsights,
  getMedicationAdherenceStats,
  getTimeOfDayAnalysis,
  getWeeklyTrends,
  MedicationAdherence,
  TimeAnalysis,
  WeeklyStats,
} from "../../../utils/analytics";
import { exportReport } from "../../../utils/exportReports";

const rateColor = (r: number) => (r >= 90 ? accents.emerald : r >= 70 ? accents.amber : accents.rose);

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdherenceStats | null>(null);
  const [medStats, setMedStats] = useState<MedicationAdherence[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyStats[]>([]);
  const [timeAnalysis, setTimeAnalysis] = useState<TimeAnalysis | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [adherence, medications, trends, time, insightsData] = await Promise.all([
        calculateAdherenceStats(30),
        getMedicationAdherenceStats(30),
        getWeeklyTrends(4),
        getTimeOfDayAnalysis(30),
        getInsights(),
      ]);
      setStats(adherence);
      setMedStats(medications);
      setWeeklyTrends(trends);
      setTimeAnalysis(time);
      setInsights(insightsData);
    } catch (e) {
      console.error("Error loading analytics:", e);
      Alert.alert("Error", "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "json" | "html") => {
    try {
      setExporting(true);
      await exportReport(format);
      setShowExportModal(false);
      Alert.alert("Success", "Report exported successfully!");
    } catch (e) {
      console.error("Export error:", e);
      Alert.alert("Error", "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics…</Text>
        </View>
      </ScreenBackground>
    );
  }

  const overall = [
    { icon: "checkmark-circle" as const, value: `${stats?.adherenceRate ?? 0}%`, label: "Adherence Rate", color: accents.emerald },
    { icon: "calendar" as const, value: stats?.totalDoses ?? 0, label: "Total Doses", color: accents.sky },
    { icon: "flame" as const, value: stats?.currentStreak ?? 0, label: "Current Streak", color: accents.amber },
    { icon: "trophy" as const, value: stats?.longestStreak ?? 0, label: "Longest Streak", color: accents.violet },
  ];

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Analytics</Text>
        <GlassIconButton icon="share-outline" onPress={() => setShowExportModal(true)} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Overall performance</Text>
        <View style={styles.grid}>
          {overall.map((s) => (
            <GlassCard key={s.label} style={styles.statCard} padding={spacing.lg}>
              <Ionicons name={s.icon} size={28} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </GlassCard>
          ))}
        </View>

        {insights.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Insights</Text>
            {insights.map((insight, i) => (
              <GlassCard key={i} style={styles.insight} padding={spacing.lg}>
                <View style={styles.insightAccent} />
                <Text style={styles.insightText}>{insight}</Text>
              </GlassCard>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Adherence by medication</Text>
        {medStats.map((med) => (
          <GlassCard key={med.medicationId} style={styles.block} padding={spacing.lg}>
            <View style={styles.medHeader}>
              <View style={[styles.medDot, { backgroundColor: med.color }]} />
              <Text style={styles.medName}>{med.medicationName}</Text>
              <Text style={[styles.medRate, { color: rateColor(med.adherenceRate) }]}>{med.adherenceRate}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${med.adherenceRate}%`, backgroundColor: rateColor(med.adherenceRate) }]} />
            </View>
            <Text style={styles.medMeta}>
              {med.takenDoses} of {med.totalDoses} doses taken
            </Text>
          </GlassCard>
        ))}

        <Text style={styles.sectionTitle}>Weekly trends</Text>
        <GlassCard style={styles.chart} padding={spacing.lg}>
          {weeklyTrends.map((week, i) => {
            const maxRate = Math.max(...weeklyTrends.map((w) => w.adherenceRate), 1);
            const h = (week.adherenceRate / maxRate) * 120;
            return (
              <View key={i} style={styles.chartBar}>
                <Text style={styles.chartValue}>{week.adherenceRate}%</Text>
                <View style={[styles.bar, { height: h || 5, backgroundColor: rateColor(week.adherenceRate) }]} />
                <Text style={styles.chartLabel}>{week.week}</Text>
              </View>
            );
          })}
        </GlassCard>

        {timeAnalysis && (
          <>
            <Text style={styles.sectionTitle}>Best time to take medications</Text>
            <View style={styles.grid}>
              {Object.entries(timeAnalysis).map(([time, count]) => (
                <GlassCard key={time} style={styles.statCard} padding={spacing.lg}>
                  <Ionicons
                    name={time === "morning" ? "sunny" : time === "afternoon" ? "partly-sunny" : time === "evening" ? "moon" : "cloudy-night"}
                    size={28}
                    color={accents.emerald}
                  />
                  <Text style={styles.statValue}>{count as number}</Text>
                  <Text style={styles.statLabel}>{time.charAt(0).toUpperCase() + time.slice(1)}</Text>
                </GlassCard>
              ))}
            </View>
          </>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <PremiumButton title="Export Full Report" onPress={() => setShowExportModal(true)} variant="primary" icon="download" fullWidth />
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      <PremiumModal visible={showExportModal} onClose={() => setShowExportModal(false)} title="Export Report" subtitle="Choose a format to export" headerIcon="document-text" size="small">
        <View style={{ gap: spacing.md }}>
          <PremiumButton title="Export as HTML" onPress={() => handleExport("html")} variant="outline" icon="document" iconPosition="left" fullWidth loading={exporting} />
          <PremiumButton title="Export as CSV" onPress={() => handleExport("csv")} variant="outline" icon="grid" iconPosition="left" fullWidth loading={exporting} />
          <PremiumButton title="Export as JSON" onPress={() => handleExport("json")} variant="outline" icon="code" iconPosition="left" fullWidth loading={exporting} />
        </View>
      </PremiumModal>
    </ScreenBackground>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loading: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: spacing.lg, ...typography.body, color: theme.colors.textSecondary },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.sm },
    title: { ...typography.h1, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    statCard: { width: "47.5%", alignItems: "center" },
    statValue: { fontSize: 26, fontWeight: "800", color: theme.colors.text, marginTop: spacing.sm },
    statLabel: { ...typography.caption, color: theme.colors.textTertiary, marginTop: 2, textAlign: "center" },
    insight: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    insightAccent: { width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: accents.emerald, marginRight: spacing.md },
    insightText: { flex: 1, ...typography.body, color: theme.colors.text, lineHeight: 21 },
    block: { marginBottom: spacing.md },
    medHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    medDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.md },
    medName: { flex: 1, ...typography.h2, color: theme.colors.text },
    medRate: { fontSize: 18, fontWeight: "800" },
    track: { height: 8, backgroundColor: withAlpha(theme.colors.text, 0.08), borderRadius: 4, overflow: "hidden", marginBottom: spacing.sm },
    fill: { height: "100%", borderRadius: 4 },
    medMeta: { ...typography.caption, color: theme.colors.textTertiary },
    chart: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 200, marginBottom: spacing.md },
    chartBar: { alignItems: "center", flex: 1 },
    bar: { width: 38, borderRadius: 8, marginVertical: spacing.sm },
    chartLabel: { ...typography.caption, color: theme.colors.textTertiary },
    chartValue: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "700" },
  });
