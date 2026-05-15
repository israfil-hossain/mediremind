import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { UserProfile, getUserProfile } from "../utils/userManagement";
import {
  getDoctorConnections,
  getDoctorInvitations,
  updateConnectionStatus,
  createNotification,
  PatientConnection,
  PatientInvitation,
} from "../utils/connections";
import { getDoctorTodayAppointments } from "../utils/appointments";

const { width } = Dimensions.get("window");

interface DashboardStats {
  totalPatients: number;
  pendingRequests: number;
  pendingInvitations: number;
  todaysAppointments: number;
}

interface ConnectionWithProfile extends PatientConnection {
  patientProfile?: UserProfile;
}

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [invitations, setInvitations] = useState<PatientInvitation[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    pendingRequests: 0,
    pendingInvitations: 0,
    todaysAppointments: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const [conns, invs, todayAppts] = await Promise.all([
        getDoctorConnections(user.uid),
        getDoctorInvitations(user.uid),
        getDoctorTodayAppointments(user.uid),
      ]);

      // Load patient profiles for connections
      const connectionsWithProfiles = await Promise.all(
        conns.map(async (conn) => {
          if (conn.patientId) {
            const profile = await getUserProfile(conn.patientId);
            if (profile) {
              return { ...conn, patientProfile: profile };
            }
          }
          return conn;
        })
      );

      const accepted = connectionsWithProfiles.filter((c) => c.status === "accepted");
      const pending = connectionsWithProfiles.filter((c) => c.status === "pending");

      setConnections(connectionsWithProfiles);
      setInvitations(invs);
      setStats({
        totalPatients: accepted.length,
        pendingRequests: pending.length,
        pendingInvitations: invs.length,
        todaysAppointments: todayAppts.length,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (connectionId: string, patientName: string) => {
    try {
      await updateConnectionStatus(connectionId, "accepted");

      const connection = connections.find((c) => c.id === connectionId);
      if (connection?.patientId) {
        await createNotification({
          userId: connection.patientId,
          type: "connection_accepted",
          title: "Connection Accepted",
          message: `Dr. ${userProfile?.name || "Your doctor"} has accepted your connection request`,
          data: { connectionId },
        });
      }

      Alert.alert("Success", `${patientName} has been added to your patients`);
      loadDashboardData();
    } catch (error: any) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", "Failed to accept connection request");
    }
  };

  const handleRejectRequest = async (connectionId: string, patientName: string) => {
    Alert.alert(
      "Reject Request",
      `Are you sure you want to reject ${patientName}'s connection request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateConnectionStatus(connectionId, "rejected");
              Alert.alert("Request Rejected", "The connection request has been rejected");
              loadDashboardData();
            } catch (error: any) {
              console.error("Error rejecting request:", error);
              Alert.alert("Error", "Failed to reject connection request");
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const pendingRequests = connections.filter((c) => c.status === "pending");
  const recentPatients = connections
    .filter((c) => c.status === "accepted")
    .slice(0, 5);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Modern Header with Glassmorphism */}
      <LinearGradient colors={["#0D9488", "#134E4A"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.doctorInfo}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.doctorName}>Dr. {userProfile?.name || "Doctor"}</Text>
              {userProfile?.doctorProfile?.specialty && (
                <View style={styles.specialtyBadge}>
                  <Ionicons name="medical" size={12} color="white" />
                  <Text style={styles.specialty}>{userProfile.doctorProfile.specialty}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push("/(tabs)/history")}
            >
              <Ionicons name="notifications-outline" size={24} color="white" />
              {stats.pendingRequests + stats.pendingInvitations > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {stats.pendingRequests + stats.pendingInvitations}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Modern Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: "#F0FDFA" }]}
              onPress={() => router.push("/(tabs)/history")}
            >
              <View style={[styles.statIcon, { backgroundColor: "#CCFBF1" }]}>
                <Ionicons name="people" size={24} color="#0D9488" />
              </View>
              <Text style={styles.statNumber}>{stats.totalPatients}</Text>
              <Text style={styles.statLabel}>My Patients</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: "#FFFBEB" }]}
              onPress={() => router.push("/(tabs)/history")}
            >
              <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="time-outline" size={24} color="#D97706" />
              </View>
              <Text style={[styles.statNumber, { color: "#D97706" }]}>
                {stats.pendingRequests}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: "#EFF6FF" }]}
              onPress={() => router.push("/(tabs)/history")}
            >
              <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="mail-outline" size={24} color="#2563EB" />
              </View>
              <Text style={[styles.statNumber, { color: "#2563EB" }]}>
                {stats.pendingInvitations}
              </Text>
              <Text style={styles.statLabel}>Invitations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: "#F5F3FF" }]}
              onPress={() => router.push("/(tabs)/prescriptions")}
            >
              <View style={[styles.statIcon, { backgroundColor: "#EDE9FE" }]}>
                <Ionicons name="document-text" size={24} color="#7C3AED" />
              </View>
              <Text style={[styles.statNumber, { color: "#7C3AED" }]}>
                {stats.todaysAppointments}
              </Text>
              <Text style={styles.statLabel}>Prescriptions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions - Modern Horizontal Scroll */}
        <View style={[styles.section, styles.quickActionsSection]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/history")}
            >
              <LinearGradient colors={["#0D9488", "#115E59"]} style={styles.actionGradient}>
                <Ionicons name="person-add" size={28} color="white" />
                <Text style={styles.actionText}>Add Patient</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/prescriptions/create")}
            >
              <LinearGradient colors={["#7C3AED", "#5B21B6"]} style={styles.actionGradient}>
                <Ionicons name="create" size={28} color="white" />
                <Text style={styles.actionText}>Prescription</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/appointments")}
            >
              <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.actionGradient}>
                <Ionicons name="calendar" size={28} color="white" />
                <Text style={styles.actionText}>Appts</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/prescriptions")}
            >
              <LinearGradient colors={["#2563EB", "#1E40AF"]} style={styles.actionGradient}>
                <Ionicons name="documents" size={28} color="white" />
                <Text style={styles.actionText}>My Scripts</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Pending Connection Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.patientIcon}>
                  <Text style={styles.patientInitial}>
                    {(request.patientProfile?.name || "P")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.patientName}>
                    {request.patientProfile?.name || "Patient"}
                  </Text>
                  <Text style={styles.requestEmail}>
                    {request.patientProfile?.email}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() =>
                      handleAcceptRequest(
                        request.id,
                        request.patientProfile?.name || "Patient"
                      )
                    }
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() =>
                      handleRejectRequest(
                        request.id,
                        request.patientProfile?.name || "Patient"
                      )
                    }
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Patients */}
        {recentPatients.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Patients</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentPatients.map((connection) => (
              <TouchableOpacity
                key={connection.id}
                style={styles.patientCard}
                onPress={() => router.push(`/patient/${connection.patientId}`)}
              >
                <View style={styles.patientIcon}>
                  <Text style={styles.patientInitial}>
                    {(connection.patientProfile?.name || "P")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.patientCardInfo}>
                  <Text style={styles.patientCardName}>
                    {connection.patientProfile?.name || "Patient"}
                  </Text>
                  <Text style={styles.patientCardEmail}>
                    {connection.patientProfile?.email}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Invitations Sent */}
        {invitations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sent Invitations</Text>
            </View>
            {invitations.slice(0, 3).map((inv) => (
              <View key={inv.id} style={styles.invitationCard}>
                <View style={[styles.patientIcon, { backgroundColor: "#FFF7ED" }]}>
                  <Ionicons name="mail" size={20} color="#F97316" />
                </View>
                <View style={styles.patientCardInfo}>
                  <Text style={styles.patientCardName}>{inv.patientEmail}</Text>
                  <Text style={styles.invitationStatus}>Waiting to register</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {connections.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={48} color="#0D9488" />
            </View>
            <Text style={styles.emptyText}>No patients yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "Add Patient" to connect with your first patient
            </Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={() => router.push("/(tabs)/history")}
            >
              <Text style={styles.emptyActionButtonText}>Add Patient</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
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
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  doctorInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
    fontWeight: "500",
  },
  doctorName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  specialtyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
  },
  specialty: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#0D9488",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0D9488",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  section: {
    marginBottom: 28,
  },
  quickActionsSection: {
    marginBottom: 36,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: "#0D9488",
    fontWeight: "600",
  },
  quickActionsScroll: {
    marginHorizontal: -4,
  },
  actionCard: {
    width: 110,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionGradient: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  requestCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  patientIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  patientInitial: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0D9488",
  },
  requestInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  requestEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D9488",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  patientCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  patientCardInfo: {
    flex: 1,
  },
  patientCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  patientCardEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  invitationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  invitationStatus: {
    fontSize: 12,
    color: "#F97316",
    fontWeight: "500",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  emptyActionButton: {
    backgroundColor: "#0D9488",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
});
