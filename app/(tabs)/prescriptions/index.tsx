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
import { useTheme } from "../../../contexts/ThemeContext";
import {
  createAppointment,
  getPatientAppointments,
  Appointment,
} from "../../../utils/appointments";

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
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [connections, setConnections] = useState<DoctorConnection[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Appointment booking state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorConnection | null>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentReason, setAppointmentReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      await Promise.all([loadConnections(), loadAppointments()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnections = async () => {
    if (!user) return [];
    try {
      await initializeFirebase();
      const firestore = getFirestore();
      if (!firestore) return [];

      const snapshot = await firestore()
        .collection("connections")
        .where("patientId", "==", user.uid)
        .get();

      const connectionsData: DoctorConnection[] = [];
      for (const docSnap of snapshot.docs) {
        const connectionData = { id: docSnap.id, ...docSnap.data() } as DoctorConnection;
        if (connectionData.doctorId) {
          const doctorDoc = await firestore().collection("users").doc(connectionData.doctorId).get();
          if (doctorDoc.exists) {
            connectionData.doctorProfile = doctorDoc.data() as UserProfile;
          }
        }
        connectionsData.push(connectionData);
      }
      setConnections(connectionsData);
      return connectionsData;
    } catch (error) {
      console.error("Error loading connections:", error);
      return [];
    }
  };

  const loadAppointments = async () => {
    if (!user) return;
    try {
      const appointments = await getPatientAppointments(user.uid);
      setMyAppointments(appointments);
    } catch (error) {
      console.error("Error loading appointments:", error);
    }
  };

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
      const doctorSnapshot = await firestore()
        .collection("users")
        .where("email", "==", searchEmail.toLowerCase().trim())
        .where("role", "==", "doctor")
        .get();

      if (doctorSnapshot.empty) {
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

      const existingSnapshot = await firestore()
        .collection("connections")
        .where("doctorId", "==", doctorId)
        .where("patientId", "==", user?.uid)
        .get();

      if (!existingSnapshot.empty) {
        Alert.alert("Info", "You already have a connection with this doctor");
        return;
      }

      await firestore().collection("connections").add({
        doctorId,
        patientId: user?.uid,
        status: "pending",
        initiatedBy: "patient",
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

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
      Alert.alert("Invitation Sent", `An invitation email will be sent to ${email}`);
      setSearchEmail("");
    } catch (error: any) {
      console.error("Error inviting doctor:", error);
      Alert.alert("Error", "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const openAppointmentModal = (connection: DoctorConnection) => {
    setSelectedDoctor(connection);
    setAppointmentDate("");
    setAppointmentTime("");
    setAppointmentReason("");
    setShowAppointmentModal(true);
  };

  const handleBookAppointment = async () => {
    if (!user || !selectedDoctor) return;
    if (!appointmentDate.trim() || !appointmentTime.trim()) {
      Alert.alert("Error", "Please select a date and time for the appointment");
      return;
    }

    setIsBooking(true);
    try {
      await createAppointment({
        doctorId: selectedDoctor.doctorId,
        patientId: user.uid,
        patientName: userProfile?.name || user.email || "Patient",
        doctorName: selectedDoctor.doctorProfile?.name || "Doctor",
        date: appointmentDate,
        time: appointmentTime,
        reason: appointmentReason || "General consultation",
        status: "pending",
      });

      Alert.alert(
        "Appointment Requested",
        `Your appointment request with Dr. ${selectedDoctor.doctorProfile?.name || "Doctor"} on ${appointmentDate} at ${appointmentTime} has been sent.`
      );
      setShowAppointmentModal(false);
      loadAppointments();
    } catch (error: any) {
      console.error("Error booking appointment:", error);
      Alert.alert("Error", error.message || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConnections();
    await loadAppointments();
    setRefreshing(false);
  }, []);

const acceptedConnections = connections.filter((c) => c.status === "accepted");
  const pendingConnections = connections.filter((c) => c.status === "pending");
  const upcomingAppointments = myAppointments
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => new Date(a.date + "T" + a.time).getTime() - new Date(b.date + "T" + a.time).getTime())
    .slice(0, 3);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#0D9488", "#134E4A"]} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Doctor</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D9488", "#134E4A"]} style={styles.header}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
          <Text style={styles.searchHint}>Search by email to connect with your doctor</Text>
        </View>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            {upcomingAppointments.map((appt) => (
              <View key={appt.id} style={styles.appointmentCard}>
                <View style={styles.appointmentIcon}>
                  <Ionicons name="calendar" size={24} color="#0D9488" />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentDoctor}>Dr. {appt.doctorName}</Text>
                  <Text style={styles.appointmentDate}>
                    {appt.date} at {appt.time}
                  </Text>
                  <Text style={styles.appointmentReason}>{appt.reason}</Text>
                  <View style={[styles.statusPill, { backgroundColor: appt.status === "confirmed" ? "#D1FAE5" : "#FEF3C7" }]}>
                    <Text style={[styles.statusPillText, { color: appt.status === "confirmed" ? "#059669" : "#D97706" }]}>
                      {appt.status === "pending" ? "⏳ Pending" : "✓ Confirmed"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending Connections */}
        {pendingConnections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {pendingConnections.map((connection) => (
              <View key={connection.id} style={styles.doctorCard}>
                <View style={styles.doctorIcon}>
                  <Ionicons name="medical" size={30} color="#0D9488" />
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
              <Ionicons name="people-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No doctors connected yet</Text>
              <Text style={styles.emptySubtext}>Add a doctor above to get started</Text>
            </View>
          ) : (
            acceptedConnections.map((connection) => (
              <TouchableOpacity
                key={connection.id}
                style={styles.doctorCard}
                onPress={() => router.push(`/doctor/${connection.doctorId}`)}
              >
                <View style={styles.doctorIcon}>
                  <Ionicons name="medical" size={30} color="#0D9488" />
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
                  <Text style={styles.doctorEmail}>{connection.doctorProfile?.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() => openAppointmentModal(connection)}
                >
                  <Ionicons name="calendar-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Appointment Booking Modal */}
      {showAppointmentModal && selectedDoctor && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Appointment</Text>
              <TouchableOpacity onPress={() => setShowAppointmentModal(false)}>
                <Ionicons name="close" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDoctorName}>
              With Dr. {selectedDoctor.doctorProfile?.name || "Doctor"}
            </Text>

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="2026-05-20"
              value={appointmentDate}
              onChangeText={setAppointmentDate}
            />

            <Text style={styles.inputLabel}>Time (HH:MM) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="10:00"
              value={appointmentTime}
              onChangeText={setAppointmentTime}
            />

            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
              placeholder="e.g., Follow-up, General checkup"
              value={appointmentReason}
              onChangeText={setAppointmentReason}
              multiline
            />

            <TouchableOpacity
              style={[styles.modalBookButton, isBooking && styles.modalBookButtonDisabled]}
              onPress={handleBookAppointment}
              disabled={isBooking}
            >
              {isBooking ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.modalBookButtonText}>Request Appointment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// Prescriptions Screen for Doctors
function PrescriptionsListScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
  const { theme } = useTheme();
  const styles = createStyles(theme);
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

const createStyles = (theme: any) => StyleSheet.create({
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
    backgroundColor: theme.colors.card,
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
    color: theme.colors.text,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 15,
  },
  doctorCard: {
    backgroundColor: theme.colors.card,
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 8,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  prescriptionCard: {
    backgroundColor: theme.colors.card,
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  prescriptionDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
    marginLeft: 8,
    marginBottom: 2,
  },
  moreMedications: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontStyle: "italic",
    marginLeft: 8,
    marginTop: 4,
  },
  prescriptionNotes: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
  // Appointment styles
  appointmentCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentDoctor: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 2,
  },
  appointmentReason: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 6,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  bookButton: {
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
  // Modal styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalDoctorName: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#F8FAFC",
  },
  modalBookButton: {
    backgroundColor: "#0D9488",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalBookButtonDisabled: {
    opacity: 0.6,
  },
  modalBookButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
