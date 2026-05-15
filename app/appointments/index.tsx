import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  Appointment,
} from "../../utils/appointments";

export default function DoctorAppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "confirmed" | "today">("all");

  const loadAppointments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getDoctorAppointments(user.uid);
      setAppointments(data);
    } catch (error) {
      console.error("Error loading appointments:", error);
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

  const handleConfirm = async (appt: Appointment) => {
    try {
      setProcessingId(appt.id);
      await updateAppointmentStatus(appt.id, "confirmed");
      Alert.alert("Confirmed", `Appointment with ${appt.patientName} has been confirmed.`);
      await loadAppointments();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to confirm appointment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (appt: Appointment) => {
    Alert.alert(
      "Cancel Appointment",
      `Are you sure you want to cancel the appointment with ${appt.patientName}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Appointment",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessingId(appt.id);
              await updateAppointmentStatus(appt.id, "cancelled");
              Alert.alert("Cancelled", "The appointment has been cancelled.");
              await loadAppointments();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to cancel appointment");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleComplete = async (appt: Appointment) => {
    try {
      setProcessingId(appt.id);
      await updateAppointmentStatus(appt.id, "completed");
      Alert.alert("Completed", `Appointment with ${appt.patientName} marked as completed.`);
      await loadAppointments();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to complete appointment");
    } finally {
      setProcessingId(null);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const filteredAppointments = appointments.filter((appt) => {
    if (activeFilter === "today") return appt.date === today;
    if (activeFilter === "pending") return appt.status === "pending";
    if (activeFilter === "confirmed") return appt.status === "confirmed";
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return { bg: "#D1FAE5", text: "#059669", label: "Confirmed" };
      case "pending": return { bg: "#FEF3C7", text: "#D97706", label: "Pending" };
      case "completed": return { bg: "#DBEAFE", text: "#2563EB", label: "Completed" };
      case "cancelled": return { bg: "#FEE2E2", text: "#DC2626", label: "Cancelled" };
      default: return { bg: theme.colors.surface, text: theme.colors.textSecondary, label: status };
    }
  };

  const FilterChip = ({ label, value }: { label: string; value: typeof activeFilter }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        activeFilter === value && styles.filterChipActive,
      ]}
      onPress={() => setActiveFilter(value)}
    >
      <Text
        style={[
          styles.filterChipText,
          activeFilter === value && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D9488", "#134E4A"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointments</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip label="All" value="all" />
          <FilterChip label="Today" value="today" />
          <FilterChip label="Pending" value="pending" />
          <FilterChip label="Confirmed" value="confirmed" />
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : filteredAppointments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={64} color={theme.colors.border} />
          <Text style={styles.emptyTitle}>No appointments</Text>
          <Text style={styles.emptyText}>
            {activeFilter === "today"
              ? "You have no appointments scheduled for today"
              : activeFilter === "pending"
              ? "No pending appointment requests"
              : "Your appointments will appear here"}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredAppointments.map((appt) => {
            const statusStyle = getStatusColor(appt.status);
            const isProcessing = processingId === appt.id;

            return (
              <View key={appt.id} style={styles.appointmentCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {statusStyle.label}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {appt.date} at {appt.time}
                  </Text>
                </View>

                <View style={styles.patientRow}>
                  <View style={styles.patientIcon}>
                    <Text style={styles.patientInitial}>
                      {(appt.patientName || "P")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{appt.patientName}</Text>
                    <Text style={styles.reasonText}>{appt.reason}</Text>
                  </View>
                </View>

                {appt.notes && (
                  <Text style={styles.notesText}>Notes: {appt.notes}</Text>
                )}

                {/* Action Buttons */}
                {appt.status === "pending" && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleCancel(appt)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Decline</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.confirmBtn]}
                      onPress={() => handleConfirm(appt)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Confirm</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {appt.status === "confirmed" && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.completeBtn]}
                      onPress={() => handleComplete(appt)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Mark Completed</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      fontSize: 20,
      fontWeight: "bold",
      color: "white",
      flex: 1,
      textAlign: "center",
    },
    filtersContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      marginRight: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: "#0D9488",
      borderColor: "#0D9488",
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
      color: "white",
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    appointmentCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "700",
    },
    dateText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    patientRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    patientIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#F0FDFA",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    patientInitial: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#0D9488",
    },
    patientInfo: {
      flex: 1,
    },
    patientName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    reasonText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    notesText: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      fontStyle: "italic",
      marginBottom: 12,
    },
    actionButtons: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
    },
    confirmBtn: {
      backgroundColor: "#0D9488",
    },
    rejectBtn: {
      backgroundColor: "#EF4444",
    },
    completeBtn: {
      backgroundColor: "#2563EB",
    },
    actionBtnText: {
      color: "white",
      fontSize: 14,
      fontWeight: "700",
    },
  });
