import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  calculateAdherenceStats,
  getMedicationAdherenceStats,
  getWeeklyTrends,
  getTimeOfDayAnalysis,
  getInsights,
  AdherenceStats,
  MedicationAdherence,
  WeeklyStats,
  TimeAnalysis,
} from "../../../utils/analytics";
import { exportReport } from "../../../utils/exportReports";
import PremiumModal from "../../../components/PremiumModal";
import PremiumButton from "../../../components/PremiumButton";
import { useTheme, Theme } from "../../../contexts/ThemeContext";

const { width } = Dimensions.get("window");

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdherenceStats | null>(null);
  const [medStats, setMedStats] = useState<MedicationAdherence[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyStats[]>([]);
  const [timeAnalysis, setTimeAnalysis] = useState<TimeAnalysis | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const styles = createStyles(theme);

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
    } catch (error) {
      console.error("Error loading analytics:", error);
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
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <TouchableOpacity
            onPress={() => setShowExportModal(true)}
            style={styles.exportButton}
          >
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Stats Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Performance</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: "#4CAF50" }]}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={styles.statValue}>{stats?.adherenceRate}%</Text>
              <Text style={styles.statLabel}>Adherence Rate</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: "#2196F3" }]}>
              <Ionicons name="calendar" size={32} color="#2196F3" />
              <Text style={styles.statValue}>{stats?.totalDoses}</Text>
              <Text style={styles.statLabel}>Total Doses</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: "#FF9800" }]}>
              <Ionicons name="flame" size={32} color="#FF9800" />
              <Text style={styles.statValue}>{stats?.currentStreak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: "#9C27B0" }]}>
              <Ionicons name="trophy" size={32} color="#9C27B0" />
              <Text style={styles.statValue}>{stats?.longestStreak}</Text>
              <Text style={styles.statLabel}>Longest Streak</Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Insights</Text>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Medication Adherence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adherence by Medication</Text>
          {medStats.map((med) => (
            <View key={med.medicationId} style={styles.medCard}>
              <View style={styles.medHeader}>
                <View style={[styles.medDot, { backgroundColor: med.color }]} />
                <Text style={styles.medName}>{med.medicationName}</Text>
                <Text
                  style={[
                    styles.medRate,
                    {
                      color:
                        med.adherenceRate >= 90
                          ? "#4CAF50"
                          : med.adherenceRate >= 70
                          ? "#FF9800"
                          : "#F44336",
                    },
                  ]}
                >
                  {med.adherenceRate}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${med.adherenceRate}%`,
                      backgroundColor:
                        med.adherenceRate >= 90
                          ? "#4CAF50"
                          : med.adherenceRate >= 70
                          ? "#FF9800"
                          : "#F44336",
                    },
                  ]}
                />
              </View>
              <Text style={styles.medStats}>
                {med.takenDoses} of {med.totalDoses} doses taken
              </Text>
            </View>
          ))}
        </View>

        {/* Weekly Trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Trends</Text>
          <View style={styles.chartContainer}>
            {weeklyTrends.map((week, index) => {
              const maxRate = Math.max(...weeklyTrends.map((w) => w.adherenceRate));
              const height = (week.adherenceRate / maxRate) * 120;
              return (
                <View key={index} style={styles.chartBar}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: height || 5,
                        backgroundColor:
                          week.adherenceRate >= 90
                            ? "#4CAF50"
                            : week.adherenceRate >= 70
                            ? "#FF9800"
                            : "#F44336",
                      },
                    ]}
                  />
                  <Text style={styles.chartLabel}>{week.week}</Text>
                  <Text style={styles.chartValue}>{week.adherenceRate}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Time of Day Analysis */}
        {timeAnalysis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best Time to Take Medications</Text>
            <View style={styles.timeGrid}>
              {Object.entries(timeAnalysis).map(([time, count]) => (
                <View key={time} style={styles.timeCard}>
                  <Ionicons
                    name={
                      time === "morning"
                        ? "sunny"
                        : time === "afternoon"
                        ? "partly-sunny"
                        : time === "evening"
                        ? "moon"
                        : "cloudy-night"
                    }
                    size={32}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.timeLabel}>
                    {time.charAt(0).toUpperCase() + time.slice(1)}
                  </Text>
                  <Text style={styles.timeValue}>{count}</Text>
                  <Text style={styles.timeSubtext}>doses</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          <PremiumButton
            title="Export Full Report"
            onPress={() => setShowExportModal(true)}
            variant="primary"
            icon="download"
            fullWidth
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Export Modal */}
      <PremiumModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Report"
        subtitle="Choose a format to export"
        headerIcon="document-text"
        size="small"
      >
        <View style={{ gap: 12 }}>
          <PremiumButton
            title="Export as HTML"
            onPress={() => handleExport("html")}
            variant="outline"
            icon="document"
            iconPosition="left"
            fullWidth
            loading={exporting}
          />
          <PremiumButton
            title="Export as CSV"
            onPress={() => handleExport("csv")}
            variant="outline"
            icon="grid"
            iconPosition="left"
            fullWidth
            loading={exporting}
          />
          <PremiumButton
            title="Export as JSON"
            onPress={() => handleExport("json")}
            variant="outline"
            icon="code"
            iconPosition="left"
            fullWidth
            loading={exporting}
          />
        </View>
      </PremiumModal>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 4,
    textAlign: "center",
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  insightText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  medCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  medDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  medName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  medRate: {
    fontSize: 18,
    fontWeight: "700",
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  medStats: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    height: 200,
  },
  chartBar: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    width: 40,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
  },
  chartLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 8,
  },
  chartValue: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    marginTop: 4,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 8,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
    marginTop: 4,
  },
  timeSubtext: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
});
