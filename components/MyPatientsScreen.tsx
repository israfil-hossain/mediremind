import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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

interface PatientConnection {
  id: string;
  doctorId: string;
  patientId: string;
  status: "pending" | "accepted" | "rejected";
  initiatedBy: "doctor" | "patient";
  createdAt: any;
  patientProfile?: UserProfile;
}

export default function MyPatientsScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [connections, setConnections] = useState<PatientConnection[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");

  useEffect(() => {
    if (!user) return;
    loadConnections();
  }, [user]);

  const loadConnections = async () => {
    await initializeFirebase();
    const firestore = getFirestore();
    if (!firestore || !user) return;

    const unsubscribe = firestore()
      .collection("connections")
      .where("doctorId", "==", user.uid)
      .onSnapshot(async (snapshot) => {
        const connectionsData: PatientConnection[] = [];

        for (const docSnap of snapshot.docs) {
          const connectionData = {
            id: docSnap.id,
            ...docSnap.data(),
          } as PatientConnection;

          // Fetch patient profile
          if (connectionData.patientId) {
            const patientDoc = await firestore()
              .collection("users")
              .doc(connectionData.patientId)
              .get();

            if (patientDoc.exists) {
              connectionData.patientProfile = patientDoc.data() as UserProfile;
            }
          }

          connectionsData.push(connectionData);
        }

        // Sort: pending first, then by date
        connectionsData.sort((a, b) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return b.createdAt?.toMillis() - a.createdAt?.toMillis();
        });

        setConnections(connectionsData);
      });

    return () => unsubscribe();
  };

  const handleSearchPatient = async () => {
    if (!searchEmail.trim()) {
      Alert.alert("Error", "Please enter a patient's email");
      return;
    }

    await initializeFirebase();
    const firestore = getFirestore();
    if (!firestore) {
      Alert.alert("Error", "Database not initialized");
      return;
    }

    try {
      setIsSearching(true);

      // Search for patient by email
      const patientSnapshot = await firestore()
        .collection("users")
        .where("email", "==", searchEmail.toLowerCase().trim())
        .where("role", "==", "patient")
        .get();

      if (patientSnapshot.empty) {
        Alert.alert(
          "Patient Not Found",
          "This patient is not registered in the system."
        );
        return;
      }

      const patientData = patientSnapshot.docs[0];
      const patientId = patientData.id;

      // Check if connection already exists
      const existingSnapshot = await firestore()
        .collection("connections")
        .where("doctorId", "==", user?.uid)
        .where("patientId", "==", patientId)
        .get();

      if (!existingSnapshot.empty) {
        Alert.alert("Info", "You already have a connection with this patient");
        return;
      }

      // Create connection request
      await firestore().collection("connections").add({
        doctorId: user?.uid,
        patientId,
        status: "pending",
        initiatedBy: "doctor",
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create notification for patient
      await firestore().collection("notifications").add({
        userId: patientId,
        type: "connection_request",
        title: "Doctor Connection Request",
        message: `Dr. ${userProfile?.name || "A doctor"} wants to connect with you`,
        data: { fromUserId: user?.uid },
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert("Success", "Connection request sent to patient");
      setSearchEmail("");
    } catch (error: any) {
      console.error("Error searching patient:", error);
      Alert.alert("Error", error.message || "Failed to send connection request");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (connectionId: string, patientName: string) => {
    await initializeFirebase();
    const firestore = getFirestore();
    if (!firestore) return;

    try {
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
            await initializeFirebase();
            const firestore = getFirestore();
            if (!firestore) return;

            try {
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredConnections = connections.filter((c) =>
    activeTab === "pending" ? c.status === "pending" : true
  );

  const acceptedConnections = connections.filter((c) => c.status === "accepted");
  const pendingConnections = connections.filter((c) => c.status === "pending");

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Patients</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Add Patient Section */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Add a Patient</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter patient's email"
              value={searchEmail}
              onChangeText={setSearchEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSearching}
            />
            <TouchableOpacity
              style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
              onPress={handleSearchPatient}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="search" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.searchHint}>Search by email to connect with a patient</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              All Patients ({acceptedConnections.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pending" && styles.tabActive]}
            onPress={() => setActiveTab("pending")}
          >
            <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
              Pending ({pendingConnections.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Patients List */}
        {filteredConnections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeTab === "pending" ? "No pending requests" : "No patients yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === "pending"
                ? "Connection requests will appear here"
                : "Add a patient above to get started"}
            </Text>
          </View>
        ) : (
          filteredConnections.map((connection) => (
            <View key={connection.id} style={styles.patientCard}>
              <View style={styles.patientIcon}>
                <Ionicons name="person" size={30} color="#4CAF50" />
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>
                  {connection.patientProfile?.name || "Patient"}
                </Text>
                <Text style={styles.patientEmail}>
                  {connection.patientProfile?.email}
                </Text>
                {connection.patientProfile?.patientProfile?.dateOfBirth && (
                  <Text style={styles.patientDetails}>
                    DOB: {connection.patientProfile.patientProfile.dateOfBirth}
                  </Text>
                )}
                {connection.patientProfile?.patientProfile?.bloodGroup && (
                  <Text style={styles.patientDetails}>
                    Blood Group: {connection.patientProfile.patientProfile.bloodGroup}
                  </Text>
                )}
                {connection.status === "pending" && (
                  <Text style={styles.pendingBadge}>⏳ Pending approval</Text>
                )}
              </View>
              {connection.status === "pending" ? (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() =>
                      handleAcceptRequest(
                        connection.id,
                        connection.patientProfile?.name || "Patient"
                      )
                    }
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() =>
                      handleRejectRequest(
                        connection.id,
                        connection.patientProfile?.name || "Patient"
                      )
                    }
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={24} color="#666" />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  searchCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  searchButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#4CAF50",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "white",
  },
  patientCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  patientDetails: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  pendingBadge: {
    fontSize: 12,
    color: "#FF9800",
    fontStyle: "italic",
    marginTop: 4,
  },
  actionButtons: {
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
  },
});
