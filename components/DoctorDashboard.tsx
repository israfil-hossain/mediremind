import { useState, useEffect } from "react";
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
import { getFirestore, initializeFirebase } from "../utils/firebase";
import { UserProfile } from "../utils/userManagement";

const { width } = Dimensions.get("window");

interface PatientConnection {
  id: string;
  doctorId: string;
  patientId: string;
  status: "pending" | "accepted" | "rejected";
  initiatedBy: "doctor" | "patient";
  createdAt: any;
  patientProfile?: UserProfile;
}

interface DashboardStats {
  totalPatients: number;
  pendingRequests: number;
  todaysAppointments: number;
  prescriptionsToday: number;
}

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [connections, setConnections] = useState<PatientConnection[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    pendingRequests: 0,
    todaysAppointments: 0,
    prescriptionsToday: 0,
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
      // Try to initialize Firebase
      await initializeFirebase();
      const firestore = getFirestore();

      if (!firestore) {
        console.log("Firestore not available, showing empty dashboard");
        setIsLoading(false);
        return;
      }

      // Listen to connections in real-time
      const unsubscribe = firestore()
        .collection("connections")
        .where("doctorId", "==", user.uid)
        .onSnapshot(
          async (snapshot) => {
            const connectionsData: PatientConnection[] = [];
            let pendingCount = 0;
            let acceptedCount = 0;

            for (const docSnap of snapshot.docs) {
              const connectionData = {
                id: docSnap.id,
                ...docSnap.data(),
              } as PatientConnection;

              // Fetch patient profile
              if (connectionData.patientId) {
                try {
                  const patientDoc = await firestore()
                    .collection("users")
                    .doc(connectionData.patientId)
                    .get();

                  if (patientDoc.exists) {
                    connectionData.patientProfile = patientDoc.data() as UserProfile;
                  }
                } catch (error) {
                  console.error("Error fetching patient profile:", error);
                }
              }

              if (connectionData.status === "pending") {
                pendingCount++;
              } else if (connectionData.status === "accepted") {
                acceptedCount++;
              }

              connectionsData.push(connectionData);
            }

            setConnections(connectionsData);
            setStats((prev) => ({
              ...prev,
              totalPatients: acceptedCount,
              pendingRequests: pendingCount,
            }));
            setIsLoading(false);
          },
          (error) => {
            console.error("Error in connections snapshot:", error);
            setIsLoading(false);
          }
        );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (connectionId: string, patientName: string) => {
    try {
      await initializeFirebase();
      const firestore = getFirestore();

      if (!firestore) {
        Alert.alert("Error", "Database not available. Please try again later.");
        return;
      }

      await firestore().collection("connections").doc(connectionId).update({
        status: "accepted",
      });

      // Send notification to patient
      const connection = connections.find((c) => c.id === connectionId);
      if (connection) {
        await firestore().collection("notifications").add({
          userId: connection.patientId,
          type: "connection_accepted",
          title: "Connection Accepted",
          message: `Dr. ${userProfile?.name || "Your doctor"} has accepted your connection request`,
          data: { connectionId },
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      Alert.alert("Success", `${patientName} has been added to your patients`);
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
              await initializeFirebase();
              const firestore = getFirestore();

              if (!firestore) {
                Alert.alert("Error", "Database not available. Please try again later.");
                return;
              }

              await firestore().collection("connections").doc(connectionId).update({
                status: "rejected",
              });

              Alert.alert("Request Rejected", "The connection request has been rejected");
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
    setTimeout(() => setRefreshing(false), 1000);
  };

  const pendingRequests = connections.filter((c) => c.status === "pending");
  const recentPatients = connections
    .filter((c) => c.status === "accepted")
    .slice(0, 5);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.doctorInfo}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.doctorName}>Dr. {userProfile?.name || "Doctor"}</Text>
              {userProfile?.doctorProfile?.specialty && (
                <Text style={styles.specialty}>{userProfile.doctorProfile.specialty}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => {
                // TODO: Navigate to notifications
              }}
            >
              <Ionicons name="notifications-outline" size={24} color="white" />
              {stats.pendingRequests > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{stats.pendingRequests}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="people" size={32} color="#4CAF50" />
              <Text style={styles.statNumber}>{stats.totalPatients}</Text>
              <Text style={styles.statLabel}>Total Patients</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="person-add" size={32} color="#FF9800" />
              <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
              <Text style={styles.statLabel}>Pending Requests</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="calendar" size={32} color="#2196F3" />
              <Text style={styles.statNumber}>{stats.todaysAppointments}</Text>
              <Text style={styles.statLabel}>Today's Appointments</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#F3E5F5" }]}>
              <Ionicons name="document-text" size={32} color="#9C27B0" />
              <Text style={styles.statNumber}>{stats.prescriptionsToday}</Text>
              <Text style={styles.statLabel}>Prescriptions</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/history")}
            >
              <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.actionGradient}>
                <Ionicons name="people" size={28} color="white" />
                <Text style={styles.actionText}>My Patients</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/prescriptions/create")}
            >
              <LinearGradient colors={["#7C4DFF", "#5E35B1"]} style={styles.actionGradient}>
                <Ionicons name="create" size={28} color="white" />
                <Text style={styles.actionText}>New Prescription</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Connection Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Connection Requests</Text>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.patientIcon}>
                  <Ionicons name="person" size={28} color="#4CAF50" />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.patientName}>
                    {request.patientProfile?.name || "Patient"}
                  </Text>
                  <Text style={styles.requestEmail}>
                    {request.patientProfile?.email}
                  </Text>
                  {request.patientProfile?.patientProfile?.dateOfBirth && (
                    <Text style={styles.requestDetails}>
                      DOB: {request.patientProfile.patientProfile.dateOfBirth}
                    </Text>
                  )}
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
                onPress={() => {
                  // TODO: Navigate to patient details
                }}
              >
                <View style={styles.patientIcon}>
                  <Ionicons name="person" size={28} color="#4CAF50" />
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

        {/* Empty State */}
        {connections.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No patients yet</Text>
            <Text style={styles.emptySubtext}>
              Patient connections will appear here when they send you a request
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
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
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#f44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  viewAllText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  patientIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  requestEmail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  requestDetails: {
    fontSize: 12,
    color: "#999",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f44336",
    justifyContent: "center",
    alignItems: "center",
  },
  patientCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  patientCardInfo: {
    flex: 1,
  },
  patientCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  patientCardEmail: {
    fontSize: 13,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
