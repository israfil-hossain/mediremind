import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard, GlassIconButton, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useTheme } from "../../../contexts/ThemeContext";
import { DoseHistory, getDoseHistory, getMedications, Medication, recordDose } from "../../../utils/storage";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [meds, history] = await Promise.all([getMedications(), getDoseHistory()]);
      setMedications(meds);
      setDoseHistory(history);
    } catch (e) {
      console.error("Error loading calendar data:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const shiftMonth = (delta: number) => setSelectedDate(new Date(year, month + delta, 1));

  const renderGrid = () => {
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(<View key={`e-${i}`} style={styles.cell} />);
    for (let day = 1; day <= days; day++) {
      const date = new Date(year, month, day);
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate.toDateString() === date.toDateString();
      const hasDoses = doseHistory.some((d) => new Date(d.timestamp).toDateString() === date.toDateString());
      cells.push(
        <Pressable key={day} style={styles.cell} onPress={() => setSelectedDate(date)}>
          <View style={[styles.cellInner, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}>
            <Text style={[styles.dayText, (isSelected || isToday) && styles.dayTextActive]}>{day}</Text>
            {hasDoses && <View style={[styles.dot, { backgroundColor: isSelected ? "#fff" : accents.emerald }]} />}
          </View>
        </Pressable>
      );
    }
    return cells;
  };

  const dateStr = selectedDate.toDateString();
  const dayDoses = doseHistory.filter((d) => new Date(d.timestamp).toDateString() === dateStr);

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={{ marginBottom: spacing.lg }} padding={spacing.lg}>
          <View style={styles.monthHeader}>
            <GlassIconButton icon="chevron-back" size={18} onPress={() => shiftMonth(-1)} />
            <Text style={styles.monthText}>{selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}</Text>
            <GlassIconButton icon="chevron-forward" size={18} onPress={() => shiftMonth(1)} />
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>{renderGrid()}</View>
        </GlassCard>

        <Text style={styles.scheduleTitle}>
          {selectedDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}
        </Text>

        {medications.length === 0 ? (
          <GlassCard style={styles.empty} padding={spacing.xxl}>
            <Ionicons name="calendar-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No medications for this day</Text>
          </GlassCard>
        ) : (
          medications.map((m) => {
            const taken = dayDoses.some((d) => d.medicationId === m.id && d.taken);
            return (
              <GlassCard key={m.id} style={styles.medCard} padding={spacing.lg}>
                <View style={[styles.medBar, { backgroundColor: m.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.medMeta}>
                    {m.dosage} · {m.times[0]}
                  </Text>
                </View>
                {taken ? (
                  <View style={styles.takenBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                    <Text style={styles.takenText}>Taken</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.takeBtn, { backgroundColor: m.color }]}
                    onPress={async () => {
                      await recordDose(m.id, true, new Date().toISOString());
                      loadData();
                    }}
                  >
                    <Text style={styles.takeText}>Take</Text>
                  </Pressable>
                )}
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
    header: { paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
    title: { ...typography.title, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
    monthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
    monthText: { ...typography.h2, color: theme.colors.text },
    weekRow: { flexDirection: "row", marginBottom: spacing.sm },
    weekday: { flex: 1, textAlign: "center", ...typography.caption, color: theme.colors.textTertiary },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 3 },
    cellInner: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", borderRadius: R.sm },
    cellSelected: { backgroundColor: accents.emerald },
    cellToday: { backgroundColor: withAlpha(accents.emerald, 0.14) },
    dayText: { fontSize: 15, color: theme.colors.text },
    dayTextActive: { fontWeight: "700" },
    dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
    scheduleTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md },
    empty: { alignItems: "center", gap: spacing.md },
    emptyText: { ...typography.body, color: theme.colors.textSecondary },
    medCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    medBar: { width: 6, height: 40, borderRadius: 3, marginRight: spacing.md },
    medName: { ...typography.h2, color: theme.colors.text },
    medMeta: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    takenBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: withAlpha(theme.colors.success, 0.14) },
    takenText: { color: theme.colors.success, fontWeight: "600", fontSize: 13 },
    takeBtn: { paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: R.pill },
    takeText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  });
