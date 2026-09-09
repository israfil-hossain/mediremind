import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { radius as R, accents, spacing, typography, withAlpha } from "../constants/design";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  PatientConnection,
  PatientInvitation,
  checkExistingConnection,
  createInvitation,
  createNotification,
  getDoctorConnections,
  getDoctorInvitations,
  searchPatients,
  updateConnectionStatus,
} from "../utils/connections";
import { UserProfile, getUserProfile } from "../utils/userManagement";
import { GlassButton, GlassCard, GlassField, GlassSurface, ScreenBackground } from "./ui/Glass";

interface PatientSearchResult extends UserProfile {
  id: string;
}
interface ConnectionWithProfile extends PatientConnection {
  patientProfile?: UserProfile;
}
type Tab = "patients" | "pending" | "invitations";

export default function MyPatientsScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [invitations, setInvitations] = useState<PatientInvitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("patients");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientName, setNewPatientName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [conns, invs] = await Promise.all([getDoctorConnections(user.uid), getDoctorInvitations(user.uid)]);
      const withProfiles = await Promise.all(
        conns.map(async (conn) => {
          if (conn.patientId) {
            const profile = await getUserProfile(conn.patientId);
            if (profile) return { ...conn, patientProfile: profile };
          }
          return conn;
        })
      );
      setConnections(withProfiles);
      setInvitations(invs);
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setIsLoading(false);
    }
  };

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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return Alert.alert("Error", "Please enter a search query");
    if (!user) return Alert.alert("Error", "You must be logged in");
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const { patients } = await searchPatients(searchQuery.trim());
      setSearchResults(patients as PatientSearchResult[]);
    } catch (e: any) {
      console.error("Search error:", e);
      Alert.alert("Error", e.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPatient = async (patient: PatientSearchResult) => {
    if (!user) return;
    try {
      if (await checkExistingConnection(user.uid, patient.id)) {
        Alert.alert("Info", "You already have a connection with this patient");
        setShowSearchResults(false);
        setSearchQuery("");
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
      Alert.alert("Success", `${patient.name || patient.email} has been added to your patients`);
      setShowSearchResults(false);
      setSearchQuery("");
      loadData();
    } catch (e: any) {
      console.error("Error adding patient:", e);
      Alert.alert("Error", e.message || "Failed to add patient");
    }
  };

  const handleInviteByEmail = async () => {
    if (!user) return;
    const email = searchQuery.trim().toLowerCase();
    if (!email.includes("@")) return Alert.alert("Error", "Please enter a valid email address to send an invitation");
    try {
      setIsSearching(true);
      await createInvitation(user.uid, email);
      Alert.alert("Invitation Sent", `An invitation has been sent to ${email}. They will be connected to you when they register.`);
      setShowSearchResults(false);
      setSearchQuery("");
      loadData();
    } catch (e: any) {
      console.error("Error sending invitation:", e);
      Alert.alert("Error", e.message || "Failed to send invitation");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDirectAdd = async () => {
    if (!user) return;
    const email = newPatientEmail.trim().toLowerCase();
    const phone = newPatientPhone.trim();
    if (!email || !email.includes("@")) return Alert.alert("Error", "Please enter a valid email address");
    if (!phone || phone.length < 7) return Alert.alert("Error", "Please enter a valid phone number");
    setIsAdding(true);
    try {
      const { patients } = await searchPatients(email);
      if (patients.length > 0) {
        const patient = patients[0];
        if (await checkExistingConnection(user.uid, patient.id)) {
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
        await createInvitation(user.uid, email);
        Alert.alert("Invitation Sent", `${email} is not registered yet. An invitation has been sent.`);
      }
      setShowAddModal(false);
      setNewPatientEmail("");
      setNewPatientPhone("");
      setNewPatientName("");
      loadData();
    } catch (e: any) {
      console.error("Error adding patient:", e);
      Alert.alert("Error", e.message || "Failed to add patient");
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
    } catch (e) {
      console.error("Error accepting request:", e);
      Alert.alert("Error", "Failed to accept connection request");
    }
  };

  const handleRejectRequest = (connectionId: string, patientName: string) =>
    Alert.alert("Reject Request", `Are you sure you want to reject ${patientName}'s connection request?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            await updateConnectionStatus(connectionId, "rejected");
            Alert.alert("Request Rejected", "The connection request has been rejected");
            loadData();
          } catch (e) {
            console.error("Error rejecting request:", e);
            Alert.alert("Error", "Failed to reject connection request");
          }
        },
      },
    ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user]);

  const acceptedConnections = connections.filter((c) => c.status === "accepted");
  const pendingConnections = connections.filter((c) => c.status === "pending");

  const renderConnections = (items: ConnectionWithProfile[], emptyTitle: string, emptySub: string) => {
    if (items.length === 0) {
      return (
        <GlassCard style={styles.empty} padding={spacing.xxl}>
          <Ionicons name="people-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.muted}>{emptySub}</Text>
        </GlassCard>
      );
    }
    return items.map((c) => (
      <Pressable key={c.id} onPress={() => c.status === "accepted" && c.patientId && router.push(`/patient/${c.patientId}`)}>
        <GlassCard style={styles.rowCard} padding={spacing.lg}>
          <GlassSurface radius={R.pill} style={styles.avatar}>
            <Text style={styles.avatarText}>{(c.patientProfile?.name || "P")[0].toUpperCase()}</Text>
          </GlassSurface>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.rowTitle}>{c.patientProfile?.name || "Patient"}</Text>
            <Text style={styles.muted}>{c.patientProfile?.email || c.patientId}</Text>
            {c.patientProfile?.phone && <Text style={styles.detail}>{c.patientProfile.phone}</Text>}
            {c.patientProfile?.patientProfile?.bloodGroup && <Text style={styles.detail}>Blood: {c.patientProfile.patientProfile.bloodGroup}</Text>}
            {c.status === "pending" && <Text style={styles.pendingText}>Pending approval</Text>}
          </View>
          {c.status === "pending" && c.initiatedBy === "patient" ? (
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable style={[styles.circleBtn, { backgroundColor: accents.teal }]} onPress={() => handleAcceptRequest(c.id, c.patientProfile?.name || "Patient")}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </Pressable>
              <Pressable style={[styles.circleBtn, { backgroundColor: accents.rose }]} onPress={() => handleRejectRequest(c.id, c.patientProfile?.name || "Patient")}>
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={22} color={theme.colors.textTertiary} />
          )}
        </GlassCard>
      </Pressable>
    ));
  };

  const renderInvitations = () => {
    if (invitations.length === 0) {
      return (
        <GlassCard style={styles.empty} padding={spacing.xxl}>
          <Ionicons name="mail-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>No pending invitations</Text>
          <Text style={styles.muted}>Invitations sent to unregistered patients appear here</Text>
        </GlassCard>
      );
    }
    return invitations.map((inv) => (
      <GlassCard key={inv.id} style={styles.rowCard} padding={spacing.lg}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(accents.amber, 0.16) }]}>
          <Ionicons name="mail" size={24} color={accents.amber} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.rowTitle}>Invitation Sent</Text>
          <Text style={styles.muted}>{inv.patientEmail}</Text>
          <Text style={styles.pendingText}>Waiting for registration</Text>
        </View>
      </GlassCard>
    ));
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "patients", label: "Patients", count: acceptedConnections.length },
    { key: "pending", label: "Pending", count: pendingConnections.length },
    { key: "invitations", label: "Invites", count: invitations.length },
  ];

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        <GlassCard style={styles.block}>
          <Text style={styles.cardTitle}>Find or Add Patient</Text>
          <View style={styles.searchRow}>
            <GlassField
              placeholder="Search by email, phone, or name"
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t);
                if (!t.trim()) setShowSearchResults(false);
              }}
              autoCapitalize="none"
              editable={!isSearching}
              containerStyle={{ flex: 1 }}
            />
            <Pressable style={[styles.searchBtn, isSearching && { opacity: 0.6 }]} onPress={handleSearch} disabled={isSearching}>
              {isSearching ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={22} color="#fff" />}
            </Pressable>
          </View>
          <Text style={styles.hint}>Enter email, phone number, or patient name</Text>
          <GlassButton label="Add Patient Directly" icon="person-add" color={accents.teal} onPress={() => setShowAddModal(true)} style={{ marginTop: spacing.md }} />

          {showSearchResults && (
            <View style={styles.results}>
              {isSearching ? (
                <ActivityIndicator style={{ marginVertical: spacing.xl }} color={accents.teal} />
              ) : searchResults.length > 0 ? (
                <>
                  <Text style={styles.resultsTitle}>Search Results</Text>
                  {searchResults.map((patient) => (
                    <Pressable key={patient.id} style={styles.resultCard} onPress={() => handleSelectPatient(patient)}>
                      <View style={[styles.avatar, { backgroundColor: withAlpha(accents.teal, 0.14) }]}>
                        <Text style={styles.avatarText}>{(patient.name || "P")[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={styles.rowTitle}>{patient.name}</Text>
                        <Text style={styles.muted}>{patient.email}</Text>
                        {patient.phone && <Text style={styles.muted}>{patient.phone}</Text>}
                      </View>
                      <Ionicons name="add-circle" size={28} color={accents.teal} />
                    </Pressable>
                  ))}
                </>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
                  <Ionicons name="search-outline" size={40} color={theme.colors.textTertiary} />
                  <Text style={[styles.muted, { marginVertical: spacing.sm }]}>No patients found</Text>
                  {searchQuery.trim().includes("@") && (
                    <Pressable style={styles.inviteBtn} onPress={handleInviteByEmail}>
                      <Text style={styles.inviteBtnText}>Send invitation to {searchQuery.trim()}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}
        </GlassCard>

        <View style={styles.tabs}>
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <Pressable key={t.key} style={[styles.tab, active && { backgroundColor: accents.teal }]} onPress={() => setActiveTab(t.key)}>
                <Text style={[styles.tabText, active && { color: "#fff" }]}>{t.label} ({t.count})</Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading && !refreshing ? (
          <ActivityIndicator style={{ marginVertical: spacing.xxxl }} color={accents.teal} size="large" />
        ) : activeTab === "patients" ? (
          renderConnections(acceptedConnections, "No patients yet", "Add a patient to get started")
        ) : activeTab === "pending" ? (
          renderConnections(pendingConnections, "No pending requests", "Connection requests will appear here")
        ) : (
          renderInvitations()
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Patient</Text>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                <Ionicons name="close" size={26} color={theme.colors.text} />
              </Pressable>
            </View>
            <Text style={styles.muted}>If they're registered, they'll be connected immediately. Otherwise, an invitation will be sent.</Text>
            <Text style={styles.label}>Patient Name</Text>
            <GlassField placeholder="Full name" value={newPatientName} onChangeText={setNewPatientName} autoCapitalize="words" containerStyle={styles.f} />
            <Text style={styles.label}>Email *</Text>
            <GlassField placeholder="patient@email.com" value={newPatientEmail} onChangeText={setNewPatientEmail} keyboardType="email-address" autoCapitalize="none" containerStyle={styles.f} />
            <Text style={styles.label}>Phone Number *</Text>
            <GlassField placeholder="+1 234 567 8900" value={newPatientPhone} onChangeText={setNewPatientPhone} keyboardType="phone-pad" containerStyle={styles.f} />
            <GlassButton label="Add Patient" color={accents.teal} onPress={handleDirectAdd} loading={isAdding} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.title, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
    block: { marginBottom: spacing.lg },
    cardTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md },
    searchRow: { flexDirection: "row", gap: spacing.md, alignItems: "stretch" },
    searchBtn: { width: 52, borderRadius: R.md, backgroundColor: accents.teal, alignItems: "center", justifyContent: "center" },
    hint: { ...typography.caption, color: theme.colors.textSecondary, marginTop: spacing.md },
    results: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
    resultsTitle: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.md },
    resultCard: { flexDirection: "row", alignItems: "center", backgroundColor: withAlpha(theme.colors.text, 0.04), borderRadius: R.md, padding: spacing.md, marginBottom: spacing.sm },
    inviteBtn: { backgroundColor: accents.amber, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: R.pill },
    inviteBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    tabs: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.lg, backgroundColor: withAlpha(theme.colors.text, 0.05), borderRadius: R.md, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: R.sm },
    tabText: { fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary },
    rowCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 20, fontWeight: "800", color: accents.teal },
    rowTitle: { ...typography.h2, color: theme.colors.text },
    detail: { ...typography.caption, color: theme.colors.textTertiary, marginTop: 1 },
    pendingText: { ...typography.caption, color: accents.amber, fontWeight: "600", marginTop: 2 },
    circleBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", gap: spacing.sm },
    emptyTitle: { ...typography.h2, color: theme.colors.textSecondary },
    muted: { ...typography.caption, color: theme.colors.textSecondary, textAlign: "center" },
    label: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
    f: { marginBottom: spacing.xs },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: theme.colors.card, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: spacing.xl, paddingBottom: spacing.xxxl },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
    modalTitle: { ...typography.h1, color: theme.colors.text },
  });
