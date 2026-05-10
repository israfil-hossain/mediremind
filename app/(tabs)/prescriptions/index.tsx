import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../../contexts/AuthContext";
import {
  getPrescriptions,
  deletePrescription,
  Prescription,
} from "../../../utils/storage";
import { getFirestore, initializeFirebase } from "../../../utils/firebase";
import { UserProfile } from "../../../utils/userManagement";
import {
  getUserPrescriptions,
  SharedPrescription,
  deletePrescription as deleteSharedPrescription,
  getPendingPrescriptions,
} from "../../../utils/prescriptionManager";

interface DoctorConnection {
  id: string;
  doctorId: string;
  patientId: string;
  status: "pending" | "accepted" | "rejected";
  initiatedBy: "doctor" | "patient";
  createdAt: any;
  doctorProfile?: UserProfile;
}

// My Doctor Screen for Patients
function MyDoctorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [connections, setConnections] = useState<DoctorConnection[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const initializeAndLoad = async () => {
      await initializeFirebase();
      const firestore = getFirestore();
      if (!firestore) {
        console.log("Firestore not initialized");
        return;
      }

      // Listen to connections in real-time
      const unsubscribe = firestore()
      .collection("connections")
      .where("patientId", "==", user.uid)
      .onSnapshot(async (snapshot) => {
        const connectionsData: DoctorConnection[] = [];

        for (const docSnap of snapshot.docs) {
          const connectionData = {
            id: docSnap.id,
            ...docSnap.data(),
          } as DoctorConnection;

          // Fetch doctor profile
          if (connectionData.doctorId) {
            const doctorDoc = await firestore()
              .collection("users")
              .doc(connectionData.doctorId)
              .get();

            if (doctorDoc.exists) {
              connectionData.doctorProfile = doctorDoc.data() as UserProfile;
            }
          }

          connectionsData.push(connectionData);
        }

        setConnections(connectionsData);
      });

      return () => unsubscribe();
    };

    initializeAndLoad();
  }, [user]);

  // Load pending prescriptions count
  useEffect(() => {
    if (!user) return;

    const loadPendingCount = async () => {
      try {
        const pending = await getPendingPrescriptions(user.uid);
        setPendingCount(pending.length);
      } catch (error) {
        console.error("Error loading pending count:", error);
      }
    };

    loadPendingCount();
  }, [user]);

  const handleSearchDoctor = async () => {
    if (!searchEmail.trim()) {
      Alert.alert("Error", "Please enter a doctor's email");
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

      // Search for doctor by email
      const doctorSnapshot = await firestore()
        .collection("users")
        .where("email", "==", searchEmail.toLowerCase().trim())
        .where("role", "==", "doctor")
        .get();

      if (doctorSnapshot.empty) {
        // Doctor not found, offer to invite
        Alert.alert(
          "Doctor Not Found",
          "This doctor is not registered in the system. Would you like to send an invitation?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Invite", onPress: () => handleInviteDoctor(searchEmail) },
          ]
        );
        return;
      }

      const doctorData = doctorSnapshot.docs[0];
      const doctorId = doctorData.id;

      // Check if connection already exists
      const existingSnapshot = await firestore()
        .collection("connections")
        .where("doctorId", "==", doctorId)
        .where("patientId", "==", user?.uid)
        .get();

      if (!existingSnapshot.empty) {
        Alert.alert("Info", "You already have a connection with this doctor");
        return;
      }

      // Create connection request
      await firestore().collection("connections").add({
        doctorId,
        patientId: user?.uid,
        status: "pending",
        initiatedBy: "patient",
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create notification for doctor
      await firestore().collection("notifications").add({
        userId: doctorId,
        type: "connection_request",
        title: "New Patient Connection Request",
        message: `${user?.displayName || "A patient"} wants to connect with you`,
        data: { fromUserId: user?.uid },
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert("Success", "Connection request sent to doctor");
      setSearchEmail("");
    } catch (error: any) {
      console.error("Error searching doctor:", error);
      Alert.alert("Error", error.message || "Failed to send connection request");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteDoctor = async (email: string) => {
    await initializeFirebase();
    const firestore = getFirestore();
    if (!firestore) {
      Alert.alert("Error", "Database not initialized");
      return;
    }

    try {
      setIsInviting(true);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await firestore().collection("invitations").add({
        invitedBy: user?.uid,
        doctorEmail: email.toLowerCase().trim(),
        status: "pending",
        createdAt: firestore.FieldValue.serverTimestamp(),
        expiresAt: firestore.Timestamp.fromDate(expiresAt),
      });

      Alert.alert(
        "Invitation Sent",
        `An invitation email will be sent to ${email}`
      );
      setSearchEmail("");
    } catch (error: any) {
      console.error("Error inviting doctor:", error);
      Alert.alert("Error", "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Connections will refresh automatically via snapshot listener
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const acceptedConnections = connections.filter((c) => c.status === "accepted");
  const pendingConnections = connections.filter((c) => c.status === "pending");

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Doctor</Text>
          <TouchableOpacity
            style={styles.pendingButton}
            onPress={() => router.push("/(tabs)/prescriptions/pending")}
          >
            <Ionicons name="notifications-outline" size={24} color="white" />
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search/Add Doctor Section */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Add a Doctor</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter doctor's email"
              value={searchEmail}
              onChangeText={setSearchEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSearching && !isInviting}
            />
            <TouchableOpacity
              style={[styles.searchButton, (isSearching || isInviting) && styles.searchButtonDisabled]}
              onPress={handleSearchDoctor}
              disabled={isSearching || isInviting}
            >
              {isSearching || isInviting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="search" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.searchHint}>
            Search by email to connect with your doctor
          </Text>
        </View>

        {/* Pending Connections */}
        {pendingConnections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {pendingConnections.map((connection) => (
              <View key={connection.id} style={styles.doctorCard}>
                <View style={styles.doctorIcon}>
                  <Ionicons name="medical" size={30} color="#4CAF50" />
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>
                    {connection.doctorProfile?.name || "Doctor"}
                  </Text>
                  <Text style={styles.doctorSpecialty}>
                    {connection.doctorProfile?.doctorProfile?.specialty || "Pending"}
                  </Text>
                  <Text style={styles.pendingStatus}>⏳ Waiting for approval</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Connected Doctors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Doctors</Text>
          {acceptedConnections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No doctors connected yet</Text>
              <Text style={styles.emptySubtext}>
                Add a doctor above to get started
              </Text>
            </View>
          ) : (
            acceptedConnections.map((connection) => (
              <TouchableOpacity
                key={connection.id}
                style={styles.doctorCard}
                onPress={() => {
                  // TODO: Navigate to doctor details
                }}
              >
                <View style={styles.doctorIcon}>
                  <Ionicons name="medical" size={30} color="#4CAF50" />
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>
                    Dr. {connection.doctorProfile?.name || "Doctor"}
                  </Text>
                  <Text style={styles.doctorSpecialty}>
                    {connection.doctorProfile?.doctorProfile?.specialty || "General Physician"}
                  </Text>
                  {connection.doctorProfile?.doctorProfile?.clinicName && (
                    <Text style={styles.doctorClinic}>
                      {connection.doctorProfile.doctorProfile.clinicName}
                    </Text>
                  )}
                  <Text style={styles.doctorEmail}>
                    {connection.doctorProfile?.email}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Prescriptions Screen for Doctors
function PrescriptionsListScreen() {
  const router = useRouter();
  const { user, userRole } = useAuth();
  const [prescriptions, setPrescriptions] = useState<SharedPrescription[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadPrescriptions = useCallback(async () => {
    if (!user || !userRole) return;

    try {
      setIsLoading(true);
      // Load from Firestore
      const firestorePrescriptions = await getUserPrescriptions(user.uid, userRole);
      setPrescriptions(firestorePrescriptions);
    } catch (error) {
      console.error("Error loading prescriptions:", error);
      setPrescriptions([]);
      Alert.alert("Error", "Failed to load prescriptions");
    } finally {
      setIsLoading(false);
    }
  }, [user, userRole]);

  useFocusEffect(
    useCallback(() => {
      loadPrescriptions();
    }, [loadPrescriptions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  }, [loadPrescriptions]);

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      "Delete Prescription",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSharedPrescription(id);
              await loadPrescriptions();
            } catch (error) {
              Alert.alert("Error", "Failed to delete prescription");
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#7C4DFF", "#5E35B1"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Prescriptions</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/(tabs)/prescriptions/create")}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#7C4DFF" />
            <Text style={styles.emptyText}>Loading prescriptions...</Text>
          </View>
        ) : !prescriptions || prescriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No prescriptions yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create a prescription
            </Text>
          </View>
        ) : (
          prescriptions.map((prescription) => (
            <TouchableOpacity
              key={prescription.id}
              style={styles.prescriptionCard}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/prescriptions/[id]",
                  params: { id: prescription.id },
                })
              }
            >
              <View style={styles.prescriptionHeader}>
                <View style={styles.prescriptionTitleContainer}>
                  <Text style={styles.prescriptionTitle}>
                    {prescription.title}
                  </Text>
                  <Text style={styles.prescriptionDate}>
                    {formatDate(prescription.createdAt)}
                  </Text>
                  {prescription.createdByRole === "doctor" && prescription.doctorName && (
                    <Text style={styles.prescriptionDoctor}>
                      Dr. {prescription.doctorName}
                    </Text>
                  )}
                  {prescription.createdByRole === "patient" && (
                    <Text style={styles.prescriptionPatient}>
                      Patient: {prescription.patientName}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(prescription.id, prescription.title);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={24} color="#f44336" />
                </TouchableOpacity>
              </View>

              {prescription.diagnosis && (
                <Text style={styles.prescriptionDiagnosis}>
                  Diagnosis: {prescription.diagnosis}
                </Text>
              )}

              {prescription.medications && prescription.medications.length > 0 && (
                <View style={styles.medicationsContainer}>
                  <Text style={styles.medicationsLabel}>Medications:</Text>
                  {prescription.medications.slice(0, 3).map((med, index) => (
                    <Text key={index} style={styles.medicationItem}>
                      • {med.name}
                      {med.dosage && ` - ${med.dosage}`}
                      {med.frequency && ` (${med.frequency})`}
                    </Text>
                  ))}
                  {prescription.medications.length > 3 && (
                    <Text style={styles.moreMedications}>
                      +{prescription.medications.length - 3} more
                    </Text>
                  )}
                </View>
              )}

              {prescription.notes && (
                <Text style={styles.prescriptionNotes} numberOfLines={2}>
                  {prescription.notes}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// Main component that shows different screens based on role
export default function PrescriptionsScreen() {
  const { userRole, isLoading: authLoading } = useAuth();

  // Show loading while role is being determined
  if (authLoading || !userRole) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </LinearGradient>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.emptyText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  if (userRole === "patient") {
    return <MyDoctorScreen />;
  }

  return <PrescriptionsListScreen />;
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
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  pendingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  pendingBadge: {
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
  pendingBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  doctorCard: {
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
  doctorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  doctorClinic: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  doctorEmail: {
    fontSize: 12,
    color: "#4CAF50",
  },
  pendingStatus: {
    fontSize: 12,
    color: "#FF9800",
    fontStyle: "italic",
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  prescriptionCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  prescriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  prescriptionTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  prescriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  prescriptionDate: {
    fontSize: 14,
    color: "#666",
  },
  prescriptionDoctor: {
    fontSize: 13,
    color: "#4CAF50",
    marginTop: 4,
  },
  prescriptionPatient: {
    fontSize: 13,
    color: "#2196F3",
    marginTop: 4,
  },
  prescriptionDiagnosis: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    fontStyle: "italic",
  },
  medicationsContainer: {
    marginTop: 8,
  },
  medicationsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },
  medicationItem: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    marginBottom: 2,
  },
  moreMedications: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginLeft: 8,
    marginTop: 4,
  },
  prescriptionNotes: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
});
