import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard, GlassIconButton, GlassSurface, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Appointment, getDoctorAppointments, updateAppointmentStatus } from "../../utils/appointments";

type FilterKey = "all" | "pending" | "confirmed" | "today";

const statusMeta = (status: string) =>
  ({
    confirmed: { color: accents.emerald, label: "Confirmed" },
    pending: { color: accents.amber, label: "Pending" },
    completed: { color: accents.sky, label: "Completed" },
    cancelled: { color: accents.rose, label: "Cancelled" },
  } as Record<string, { color: string; label: string }>)[status] || { color: accents.teal, label: status };

export default function DoctorAppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const loadAppointments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setAppointments(await getDoctorAppointments(user.uid));
    } catch (e) {
      console.error("Error loading appointments:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [loadAppointments])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, [loadAppointments]);

  const runAction = async (appt: Appointment, status: "confirmed" | "cancelled" | "completed", successMsg: string) => {
    try {
      setProcessingId(appt.id);
      await updateAppointmentStatus(appt.id, status);
      Alert.alert(status === "cancelled" ? "Cancelled" : status === "completed" ? "Completed" : "Confirmed", successMsg);
      await loadAppointments();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update appointment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = (appt: Appointment) =>
    Alert.alert("Cancel Appointment", `Are you sure you want to cancel the appointment with ${appt.patientName}?`, [
      { text: "No", style: "cancel" },
      { text: "Cancel Appointment", style: "destructive", onPress: () => runAction(appt, "cancelled", "The appointment has been cancelled.") },
    ]);

  const today = new Date().toISOString().split("T")[0];
  const filtered = appointments.filter((a) =>
    activeFilter === "today" ? a.date === today : activeFilter === "pending" ? a.status === "pending" : activeFilter === "confirmed" ? a.status === "confirmed" : true
  );

  const filters: { label: string; value: FilterKey }[] = [
    { label: "All", value: "all" },
    { label: "Today", value: "today" },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
  ];

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Appointments</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.filters}>
        {filters.map((f) => {
          const active = activeFilter === f.value;
          return (
            <Pressable key={f.value} onPress={() => setActiveFilter(f.value)} style={[styles.filterPill, active && { backgroundColor: accents.teal }]}>
              <Text style={[styles.filterText, active && { color: "#fff" }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.muted}>Loading appointments…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={56} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>No appointments</Text>
          <Text style={styles.muted}>
            {activeFilter === "today" ? "Nothing scheduled for today" : activeFilter === "pending" ? "No pending requests" : "Your appointments will appear here"}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
          {filtered.map((appt) => {
            const meta = statusMeta(appt.status);
            const isProcessing = processingId === appt.id;
            return (
              <GlassCard key={appt.id} style={styles.block} padding={spacing.lg}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: withAlpha(meta.color, 0.14) }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={styles.dateText}>{appt.date} at {appt.time}</Text>
                </View>
                <View style={styles.patientRow}>
                  <GlassSurface radius={R.pill} style={styles.patientIcon}>
                    <Text style={styles.patientInitial}>{(appt.patientName || "P")[0].toUpperCase()}</Text>
                  </GlassSurface>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.patientName}>{appt.patientName}</Text>
                    <Text style={styles.muted}>{appt.reason}</Text>
                  </View>
                </View>
                {appt.notes && <Text style={styles.notesText}>Notes: {appt.notes}</Text>}

                {appt.status === "pending" && (
                  <View style={styles.actions}>
                    <Pressable style={[styles.actionBtn, { backgroundColor: accents.rose }]} onPress={() => handleCancel(appt)} disabled={isProcessing}>
                      {isProcessing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Decline</Text>}
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: accents.teal }]} onPress={() => runAction(appt, "confirmed", `Appointment with ${appt.patientName} confirmed.`)} disabled={isProcessing}>
                      {isProcessing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Confirm</Text>}
                    </Pressable>
                  </View>
                )}
                {appt.status === "confirmed" && (
                  <View style={styles.actions}>
                    <Pressable style={[styles.actionBtn, { backgroundColor: accents.sky }]} onPress={() => runAction(appt, "completed", `Appointment with ${appt.patientName} marked completed.`)} disabled={isProcessing}>
                      {isProcessing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Mark Completed</Text>}
                    </Pressable>
                  </View>
                )}
              </GlassCard>
            );
          })}
        </ScrollView>
      )}
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    filters: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
    filterPill: { paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: R.pill, backgroundColor: withAlpha(theme.colors.text, 0.06) },
    filterText: { ...typography.label, color: theme.colors.textSecondary },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm, padding: spacing.xl },
    emptyTitle: { ...typography.h1, color: theme.colors.text, marginTop: spacing.sm },
    muted: { ...typography.caption, color: theme.colors.textSecondary, textAlign: "center" },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    block: { marginBottom: spacing.md },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
    statusText: { fontSize: 12, fontWeight: "700" },
    dateText: { ...typography.caption, color: theme.colors.textSecondary },
    patientRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
    patientIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    patientInitial: { fontSize: 18, fontWeight: "800", color: accents.teal },
    patientName: { ...typography.h2, color: theme.colors.text },
    notesText: { ...typography.caption, color: theme.colors.textTertiary, fontStyle: "italic", marginBottom: spacing.md },
    actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
    actionBtn: { flex: 1, paddingVertical: 11, borderRadius: R.pill, alignItems: "center" },
    actionText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  });
