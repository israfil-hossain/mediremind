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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { UserProfile, getUserProfile } from "../utils/userManagement";
import {
  searchPatients,
  checkExistingConnection,
  createConnection,
  createInvitation,
  getDoctorConnections,
  getDoctorInvitations,
  updateConnectionStatus,
  createNotification,
  PatientConnection,
  PatientInvitation,
} from "../utils/connections";

interface PatientSearchResult extends UserProfile {
  id: string;
}

interface ConnectionWithProfile extends PatientConnection {
  patientProfile?: UserProfile;
}

export default function MyPatientsScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [invitations, setInvitations] = useState<PatientInvitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"patients" | "pending" | "invitations">("patients");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Direct add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientName, setNewPatientName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [conns, invs] = await Promise.all([
        getDoctorConnections(user.uid),
        getDoctorInvitations(user.uid),
      ]);

      const connectionsWithProfiles = await Promise.all(
        conns.map(async (conn) => {
          if (conn.patientId) {
            const profile = await getUserProfile(conn.patientId);
            if (profile) return { ...conn, patientProfile: profile };
          }
          return conn;
        })
      );

      setConnections(connectionsWithProfiles);
      setInvitations(invs);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a search query");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const { patients } = await searchPatients(searchQuery.trim());
      setSearchResults(patients as PatientSearchResult[]);
    } catch (error: any) {
      console.error("Search error:", error);
      Alert.alert("Error", error.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  // Direct connect to found patient (no pending)
  const handleSelectPatient = async (patient: PatientSearchResult) => {
    if (!user) return;
    try {
      const exists = await checkExistingConnection(user.uid, patient.id);
      if (exists) {
        Alert.alert("Info", "You already have a connection with this patient");
        setShowSearchResults(false);
        setSearchQuery("");
        return;
      }

      // Create DIRECT connection (accepted immediately)
      await createDirectConnection(user.uid, patient.id);

      // Notify patient
      await createNotification({
        userId: patient.id,
        type: "connection_accepted",
        title: "Doctor Connected",
        message: `Dr. ${userProfile?.name || "A doctor"} has added you to their patients.`,
        data: { doctorId: user.uid },
      });

      Alert.alert("Success", `${patient.name || patient.email} has been added to your patients`);
      setShowSearchResults(false);
      setSearchQuery("");
      loadData();
    } catch (error: any) {
      console.error("Error adding patient:", error);
      Alert.alert("Error", error.message || "Failed to add patient");
    }
  };

  // Create direct accepted connection
  async function createDirectConnection(doctorId: string, patientId: string): Promise<string | null> {
    const { ENV } = await import("../config/env");
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const projectId = ENV.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Firebase project ID not configured");

    const idToken = await AsyncStorage.getItem("@firebase_id_token");
    if (!idToken) throw new Error("Not authenticated");

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/connections`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          doctorId: { stringValue: doctorId },
          patientId: { stringValue: patientId },
          status: { stringValue: "accepted" },
          initiatedBy: { stringValue: "doctor" },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error creating connection:", response.status, errorText);
      throw new Error("Failed to create connection");
    }
    const result = await response.json();
    return result.name.split("/").pop();
  }

  // Invite by email (when patient not found)
  const handleInviteByEmail = async () => {
    if (!user) return;
    const email = searchQuery.trim().toLowerCase();
    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address to send an invitation");
      return;
    }
    try {
      setIsSearching(true);
      await createInvitation(user.uid, email);
      Alert.alert(
        "Invitation Sent",
        `An invitation has been sent to ${email}. They will be connected to you when they register.`
      );
      setShowSearchResults(false);
      setSearchQuery("");
      loadData();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      Alert.alert("Error", error.message || "Failed to send invitation");
    } finally {
      setIsSearching(false);
    }
  };

  // Direct add patient modal
  const handleDirectAdd = async () => {
    if (!user) return;
    const email = newPatientEmail.trim().toLowerCase();
    const phone = newPatientPhone.trim();
    const name = newPatientName.trim();

    if (!email || !email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    if (!phone || phone.length < 7) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    setIsAdding(true);
    try {
      // First search if patient exists
      const { patients } = await searchPatients(email);
      if (patients.length > 0) {
        const patient = patients[0];
        const exists = await checkExistingConnection(user.uid, patient.id);
        if (exists) {
          Alert.alert("Info", "This patient is already connected to you");
          setIsAdding(false);
          return;
        }
        await createDirectConnection(user.uid, patient.id);
        await createNotification({
          userId: patient.id,
          type: "connection_accepted",
          title: "Doctor Connected",
          message: `Dr. ${userProfile?.name || "A doctor"} has added you to their patients.`,
          data: { doctorId: user.uid },
        });
        Alert.alert("Success", `${patient.name || email} has been added to your patients`);
      } else {
        // Create invitation
        await createInvitation(user.uid, email);
        Alert.alert(
          "Invitation Sent",
          `${email} is not registered yet. An invitation has been sent. They will be auto-connected when they sign up.`
        );
      }

      setShowAddModal(false);
      setNewPatientEmail("");
      setNewPatientPhone("");
      setNewPatientName("");
      loadData();
    } catch (error: any) {
      console.error("Error adding patient:", error);
      Alert.alert("Error", error.message || "Failed to add patient");
    } finally {
      setIsAdding(false);
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
      loadData();
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
              loadData();
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
    await loadData();
    setRefreshing(false);
  }, [user]);

  const acceptedConnections = connections.filter((c) => c.status === "accepted");
  const pendingConnections = connections.filter((c) => c.status === "pending");

  const renderConnectionsList = (
    items: ConnectionWithProfile[],
    emptyTitle: string,
    emptySubtext: string
  ) => {
    if (items.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>{emptyTitle}</Text>
          <Text style={styles.emptySubtext}>{emptySubtext}</Text>
        </View>
      );
    }

    return items.map((connection) => (
      <TouchableOpacity
        key={connection.id}
        style={styles.patientCard}
        onPress={() => {
          if (connection.status === "accepted" && connection.patientId) {
            router.push(`/patient/${connection.patientId}`);
          }
        }}
        activeOpacity={connection.status === "accepted" ? 0.7 : 1}
      >
        <View style={styles.patientIcon}>
          <Text style={styles.patientInitial}>
            {(connection.patientProfile?.name || "P")[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>
            {connection.patientProfile?.name || "Patient"}
          </Text>
          <Text style={styles.patientEmail}>
            {connection.patientProfile?.email || connection.patientId}
          </Text>
          {connection.patientProfile?.phone && (
            <Text style={styles.patientDetails}>
              {connection.patientProfile.phone}
            </Text>
          )}
          {connection.patientProfile?.patientProfile?.bloodGroup && (
            <Text style={styles.patientDetails}>
              Blood: {connection.patientProfile.patientProfile.bloodGroup}
            </Text>
          )}
          {connection.status === "pending" && (
            <Text style={styles.pendingBadge}>⏳ Pending approval</Text>
          )}
        </View>
        {connection.status === "pending" && connection.initiatedBy === "patient" ? (
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
          <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
        )}
      </TouchableOpacity>
    ));
  };

  const renderInvitationsList = () => {
    if (invitations.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="mail-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>No pending invitations</Text>
          <Text style={styles.emptySubtext}>
            Invitations sent to unregistered patients will appear here
          </Text>
        </View>
      );
    }

    return invitations.map((invitation) => (
      <View key={invitation.id} style={styles.patientCard}>
        <View style={[styles.patientIcon, { backgroundColor: "#FFF7ED" }]}>
          <Ionicons name="mail" size={28} color="#F97316" />
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>Invitation Sent</Text>
          <Text style={styles.patientEmail}>{invitation.patientEmail}</Text>
          <Text style={styles.pendingBadge}>⏳ Waiting for registration</Text>
        </View>
      </View>
    ));
  };

  const renderContent = () => {
    switch (activeTab) {
      case "patients":
        return renderConnectionsList(
          acceptedConnections,
          "No patients yet",
          "Add a patient to get started"
        );
      case "pending":
        return renderConnectionsList(
          pendingConnections,
          "No pending requests",
          "Connection requests will appear here"
        );
      case "invitations":
        return renderInvitationsList();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D9488", "#134E4A"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Patients</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search & Add Section */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Find or Add Patient</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email, phone, or name"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (!text.trim()) setShowSearchResults(false);
              }}
              autoCapitalize="none"
              editable={!isSearching}
            />
            <TouchableOpacity
              style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="search" size={22} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.searchHint}>
            Enter email, phone number, or patient name
          </Text>

          {/* Direct Add Button */}
          <TouchableOpacity
            style={styles.directAddButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="person-add" size={18} color="white" />
            <Text style={styles.directAddButtonText}>Add Patient Directly</Text>
          </TouchableOpacity>

          {/* Search Results */}
          {showSearchResults && (
            <View style={styles.searchResultsContainer}>
              {isSearching ? (
                <ActivityIndicator style={{ marginVertical: 20 }} color="#0D9488" />
              ) : searchResults.length > 0 ? (
                <>
                  <Text style={styles.searchResultsTitle}>Search Results</Text>
                  {searchResults.map((patient) => (
                    <TouchableOpacity
                      key={patient.id}
                      style={styles.searchResultCard}
                      onPress={() => handleSelectPatient(patient)}
                    >
                      <View style={styles.searchResultIcon}>
                        <Text style={styles.searchResultInitial}>
                          {(patient.name || "P")[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{patient.name}</Text>
                        <Text style={styles.searchResultDetail}>{patient.email}</Text>
                        {patient.phone && (
                          <Text style={styles.searchResultDetail}>{patient.phone}</Text>
                        )}
                      </View>
                      <Ionicons name="add-circle" size={28} color="#0D9488" />
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={40} color="#CBD5E1" />
                  <Text style={styles.noResultsText}>No patients found</Text>
                  {searchQuery.trim().includes("@") && (
                    <TouchableOpacity style={styles.inviteButton} onPress={handleInviteByEmail}>
                      <Text style={styles.inviteButtonText}>
                        Send invitation to {searchQuery.trim()}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "patients" && styles.tabActive]}
            onPress={() => setActiveTab("patients")}
          >
            <Text style={[styles.tabText, activeTab === "patients" && styles.tabTextActive]}>
              My Patients ({acceptedConnections.length})
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
          <TouchableOpacity
            style={[styles.tab, activeTab === "invitations" && styles.tabActive]}
            onPress={() => setActiveTab("invitations")}
          >
            <Text style={[styles.tabText, activeTab === "invitations" && styles.tabTextActive]}>
              Invitations ({invitations.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading && !refreshing ? (
          <ActivityIndicator style={{ marginVertical: 40 }} color="#0D9488" size="large" />
        ) : (
          renderContent()
        )}
      </ScrollView>

      {/* Add Patient Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Patient</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter patient details. If they are registered, they will be connected immediately. Otherwise, an invitation will be sent.
            </Text>

            <Text style={styles.inputLabel}>Patient Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Full name"
              value={newPatientName}
              onChangeText={setNewPatientName}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="patient@email.com"
              value={newPatientEmail}
              onChangeText={setNewPatientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="+1 234 567 8900"
              value={newPatientPhone}
              onChangeText={setNewPatientPhone}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.modalAddButton, isAdding && styles.modalAddButtonDisabled]}
              onPress={handleDirectAdd}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.modalAddButtonText}>Add Patient</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
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
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background,
  },
  searchButton: {
    backgroundColor: "#0D9488",
    borderRadius: 14,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 10,
  },
  directAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D9488",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  directAddButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  searchResultsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
  },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchResultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  searchResultInitial: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0D9488",
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  searchResultDetail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 10,
    marginBottom: 10,
  },
  inviteButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  inviteButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#0D9488",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: "white",
  },
  patientCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 18,
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
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  patientInitial: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0D9488",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 3,
  },
  patientEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  patientDetails: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  pendingBadge: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "500",
    marginTop: 3,
  },
  actionButtons: {
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
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
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background,
  },
  modalAddButton: {
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
  modalAddButtonDisabled: {
    opacity: 0.6,
  },
  modalAddButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
