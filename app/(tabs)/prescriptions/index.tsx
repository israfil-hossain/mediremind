import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { Appointment, createAppointment, getPatientAppointments } from "../../../utils/appointments";
import {
  checkExistingPatientConnection,
  createNotification,
  createPatientConnection,
  createPatientInvitation,
  getPatientConnections,
  getUserById,
  searchDoctorsByEmail,
} from "../../../utils/connections";
import { SharedPrescription, deletePrescription as deleteSharedPrescription, getPendingPrescriptions, getUserPrescriptions } from "../../../utils/prescriptionManager";
import { UserProfile } from "../../../utils/userManagement";

interface DoctorConnection {
  id: string;
  doctorId: string;
  patientId: string;
  status: "pending" | "accepted" | "rejected";
  initiatedBy: "doctor" | "patient";
  createdAt: any;
  doctorProfile?: UserProfile;
}

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
    if (!user) return;
    try {
      const patientConns = await getPatientConnections(user.uid);
      const data: DoctorConnection[] = [];
      for (const conn of patientConns) {
        const doctorProfile = await getUserById(conn.doctorId);
        data.push({ id: conn.id, doctorId: conn.doctorId, patientId: conn.patientId, status: conn.status, initiatedBy: conn.initiatedBy, createdAt: conn.createdAt, doctorProfile: doctorProfile || undefined });
      }
      setConnections(data);
    } catch (e) {
      console.error("Error loading connections:", e);
    }
  };

  const loadAppointments = async () => {
    if (!user) return;
    try {
      setMyAppointments(await getPatientAppointments(user.uid));
    } catch (e) {
      console.error("Error loading appointments:", e);
      setMyAppointments([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    getPendingPrescriptions(user.uid)
      .then((p) => setPendingCount(p.length))
      .catch((e) => console.error("Error loading pending count:", e));
  }, [user]);

  const handleInviteDoctor = async (email: string) => {
    if (!user) return;
    try {
      setIsInviting(true);
      await createPatientInvitation(user.uid, user.email || "", email);
      Alert.alert("Invitation Sent", `An invitation email will be sent to ${email}`);
      setSearchEmail("");
    } catch (e: any) {
      console.error("Error inviting doctor:", e);
      Alert.alert("Error", "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleSearchDoctor = async () => {
    if (!searchEmail.trim()) return Alert.alert("Error", "Please enter a doctor's email");
    if (!user) return Alert.alert("Error", "You must be logged in");
    try {
      setIsSearching(true);
      const doctors = await searchDoctorsByEmail(searchEmail);
      if (doctors.length === 0) {
        Alert.alert("Doctor Not Found", "This doctor is not registered. Send an invitation?", [
          { text: "Cancel", style: "cancel" },
          { text: "Invite", onPress: () => handleInviteDoctor(searchEmail) },
        ]);
        return;
      }
      const doctor = doctors[0];
      if (await checkExistingPatientConnection(doctor.id, user.uid)) {
        Alert.alert("Info", "You already have a connection with this doctor");
        return;
      }
      await createPatientConnection(doctor.id, user.uid);
      await createNotification({
        userId: doctor.id,
        type: "connection_request",
        title: "New Patient Connection Request",
        message: `${user.displayName || user.email || "A patient"} wants to connect with you`,
        data: { fromUserId: user.uid },
      });
      Alert.alert("Success", "Connection request sent to doctor");
      setSearchEmail("");
      loadConnections();
    } catch (e: any) {
      console.error("Error searching doctor:", e);
      Alert.alert("Error", e.message || "Failed to send connection request");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!user || !selectedDoctor) return;
    if (!appointmentDate.trim() || !appointmentTime.trim()) return Alert.alert("Error", "Please select a date and time");
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
      Alert.alert("Appointment Requested", `Your request with Dr. ${selectedDoctor.doctorProfile?.name || "Doctor"} on ${appointmentDate} at ${appointmentTime} has been sent.`);
      setShowAppointmentModal(false);
      loadAppointments();
    } catch (e: any) {
      console.error("Error booking appointment:", e);
      Alert.alert("Error", e.message || "Failed to book appointment");
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
    .sort((a, b) => new Date(a.date + "T" + a.time).getTime() - new Date(b.date + "T" + b.time).getTime())
    .slice(0, 3);

  if (isLoading) {
    return (
      <ScreenBackground>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Doctor</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accents.teal} />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Doctor</Text>
        <Pressable style={styles.pendingBtn} onPress={() => router.push("/(tabs)/prescriptions/pending")}>
          <GlassIconButton icon="notifications-outline" onPress={() => router.push("/(tabs)/prescriptions/pending")} />
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        <GlassCard style={styles.block}>
          <Text style={styles.cardTitle}>Add a Doctor</Text>
          <View style={styles.searchRow}>
            <GlassField placeholder="Enter doctor's email" value={searchEmail} onChangeText={setSearchEmail} keyboardType="email-address" autoCapitalize="none" editable={!isSearching && !isInviting} containerStyle={{ flex: 1 }} />
            <Pressable style={[styles.searchBtn, (isSearching || isInviting) && { opacity: 0.6 }]} onPress={handleSearchDoctor} disabled={isSearching || isInviting}>
              {isSearching || isInviting ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={22} color="#fff" />}
            </Pressable>
          </View>
          <Text style={styles.hint}>Search by email to connect with your doctor</Text>
        </GlassCard>

        {upcomingAppointments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            {upcomingAppointments.map((appt) => (
              <GlassCard key={appt.id} style={styles.rowCard} padding={spacing.lg}>
                <View style={styles.iconChip}>
                  <Ionicons name="calendar" size={22} color={accents.teal} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.rowTitle}>Dr. {appt.doctorName}</Text>
                  <Text style={styles.muted}>{appt.date} at {appt.time}</Text>
                  <Text style={styles.muted}>{appt.reason}</Text>
                  <View style={[styles.statusPill, { backgroundColor: withAlpha(appt.status === "confirmed" ? accents.emerald : accents.amber, 0.14) }]}>
                    <Text style={[styles.statusPillText, { color: appt.status === "confirmed" ? accents.emerald : accents.amber }]}>{appt.status === "pending" ? "Pending" : "Confirmed"}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </>
        )}

        {pendingConnections.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {pendingConnections.map((c) => (
              <GlassCard key={c.id} style={styles.rowCard} padding={spacing.lg}>
                <View style={styles.iconChip}>
                  <Ionicons name="medical" size={26} color={accents.teal} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.rowTitle}>{c.doctorProfile?.name || "Doctor"}</Text>
                  <Text style={styles.muted}>{c.doctorProfile?.doctorProfile?.specialty || "Pending"}</Text>
                  <Text style={styles.pendingText}>Waiting for approval</Text>
                </View>
              </GlassCard>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>My Doctors</Text>
        {acceptedConnections.length === 0 ? (
          <GlassCard style={styles.empty} padding={spacing.xxl}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No doctors connected yet</Text>
            <Text style={styles.muted}>Add a doctor above to get started</Text>
          </GlassCard>
        ) : (
          acceptedConnections.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/doctor/${c.doctorId}`)}>
              <GlassCard style={styles.rowCard} padding={spacing.lg}>
                <View style={styles.iconChip}>
                  <Ionicons name="medical" size={26} color={accents.teal} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.rowTitle}>Dr. {c.doctorProfile?.name || "Doctor"}</Text>
                  <Text style={styles.muted}>{c.doctorProfile?.doctorProfile?.specialty || "General Physician"}</Text>
                  {c.doctorProfile?.doctorProfile?.clinicName && <Text style={styles.muted}>{c.doctorProfile.doctorProfile.clinicName}</Text>}
                  <Text style={styles.emailText}>{c.doctorProfile?.email}</Text>
                </View>
                <Pressable
                  style={styles.bookBtn}
                  onPress={() => {
                    setSelectedDoctor(c);
                    setAppointmentDate("");
                    setAppointmentTime("");
                    setAppointmentReason("");
                    setShowAppointmentModal(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color="#fff" />
                </Pressable>
              </GlassCard>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={showAppointmentModal && !!selectedDoctor} transparent animationType="fade" onRequestClose={() => setShowAppointmentModal(false)}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard} padding={spacing.xl}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Appointment</Text>
              <Pressable onPress={() => setShowAppointmentModal(false)} hitSlop={8}>
                <Ionicons name="close" size={26} color={theme.colors.text} />
              </Pressable>
            </View>
            <Text style={styles.muted}>With Dr. {selectedDoctor?.doctorProfile?.name || "Doctor"}</Text>
            <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
            <GlassField placeholder="2026-05-20" value={appointmentDate} onChangeText={setAppointmentDate} containerStyle={styles.f} />
            <Text style={styles.label}>Time (HH:MM) *</Text>
            <GlassField placeholder="10:00" value={appointmentTime} onChangeText={setAppointmentTime} containerStyle={styles.f} />
            <Text style={styles.label}>Reason</Text>
            <GlassField placeholder="e.g., Follow-up" value={appointmentReason} onChangeText={setAppointmentReason} multiline style={{ height: 70 }} containerStyle={styles.f} />
            <GlassButton label="Request Appointment" color={accents.teal} onPress={handleBookAppointment} loading={isBooking} style={{ marginTop: spacing.sm }} />
          </GlassCard>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

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
      setPrescriptions(await getUserPrescriptions(user.uid, userRole));
    } catch (e) {
      console.error("Error loading prescriptions:", e);
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

  const handleDelete = (id: string, title: string) =>
    Alert.alert("Delete Prescription", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSharedPrescription(id);
            await loadPrescriptions();
          } catch {
            Alert.alert("Error", "Failed to delete prescription");
          }
        },
      },
    ]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "N/A";
    }
  };

  return (
    <ScreenBackground>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Prescriptions</Text>
        <GlassIconButton icon="add" onPress={() => router.push("/(tabs)/prescriptions/create")} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accents.violet} />
            <Text style={styles.muted}>Loading prescriptions…</Text>
          </View>
        ) : prescriptions.length === 0 ? (
          <GlassCard style={styles.empty} padding={spacing.xxl}>
            <Ionicons name="document-text-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No prescriptions yet</Text>
            <Text style={styles.muted}>Tap the + button to create a prescription</Text>
          </GlassCard>
        ) : (
          prescriptions.map((rx) => (
            <Pressable key={rx.id} onPress={() => router.push({ pathname: "/(tabs)/prescriptions/[id]", params: { id: rx.id } })}>
              <GlassCard style={styles.block} padding={spacing.lg}>
                <View style={styles.rxHeader}>
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text style={styles.rxTitle}>{rx.title}</Text>
                    <Text style={styles.muted}>{formatDate(rx.createdAt)}</Text>
                    {rx.createdByRole === "doctor" && rx.doctorName && <Text style={[styles.tag, { color: accents.emerald }]}>Dr. {rx.doctorName}</Text>}
                    {rx.createdByRole === "patient" && <Text style={[styles.tag, { color: accents.sky }]}>Patient: {rx.patientName}</Text>}
                  </View>
                  <Pressable onPress={() => handleDelete(rx.id, rx.title)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={22} color={accents.rose} />
                  </Pressable>
                </View>
                {rx.diagnosis && <Text style={styles.diagnosis}>Diagnosis: {rx.diagnosis}</Text>}
                {rx.medications && rx.medications.length > 0 && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={styles.medLabel}>Medications</Text>
                    {rx.medications.slice(0, 3).map((med, i) => (
                      <Text key={i} style={styles.medItem}>• {med.name}{med.dosage && ` - ${med.dosage}`}{med.frequency && ` (${med.frequency})`}</Text>
                    ))}
                    {rx.medications.length > 3 && <Text style={styles.moreMed}>+{rx.medications.length - 3} more</Text>}
                  </View>
                )}
                {rx.notes && <Text style={styles.notes} numberOfLines={2}>{rx.notes}</Text>}
              </GlassCard>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

export default function PrescriptionsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { userRole, isLoading: authLoading } = useAuth();

  if (authLoading || !userRole) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.muted}>Loading your profile…</Text>
        </View>
      </ScreenBackground>
    );
  }

  return userRole === "patient" ? <MyDoctorScreen /> : <PrescriptionsListScreen />;
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
    title: { ...typography.title, color: theme.colors.text },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxxl },
    muted: { ...typography.caption, color: theme.colors.textSecondary, textAlign: "center" },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
    block: { marginBottom: spacing.lg },
    cardTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md },
    searchRow: { flexDirection: "row", gap: spacing.md, alignItems: "stretch" },
    searchBtn: { width: 52, borderRadius: R.md, backgroundColor: accents.teal, alignItems: "center", justifyContent: "center" },
    hint: { ...typography.caption, color: theme.colors.textSecondary, marginTop: spacing.md },
    pendingBtn: { position: "relative" },
    pendingBadge: { position: "absolute", top: -2, right: -2, backgroundColor: accents.rose, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    pendingBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md, marginTop: spacing.xs },
    rowCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    iconChip: { width: 52, height: 52, borderRadius: 26, backgroundColor: withAlpha(accents.teal, 0.14), alignItems: "center", justifyContent: "center" },
    rowTitle: { ...typography.h2, color: theme.colors.text },
    pendingText: { ...typography.caption, color: accents.amber, fontStyle: "italic", marginTop: 2 },
    emailText: { ...typography.caption, color: accents.teal, marginTop: 2 },
    statusPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, marginTop: spacing.xs },
    statusPillText: { fontSize: 11, fontWeight: "700" },
    bookBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: accents.teal, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", gap: spacing.sm },
    emptyText: { ...typography.h2, color: theme.colors.textSecondary },
    rxHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
    rxTitle: { ...typography.h2, color: theme.colors.text },
    tag: { ...typography.caption, fontWeight: "600", marginTop: spacing.xs },
    diagnosis: { ...typography.caption, color: theme.colors.textSecondary, fontStyle: "italic", marginBottom: spacing.sm },
    medLabel: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.xs },
    medItem: { ...typography.caption, color: theme.colors.textSecondary, marginLeft: spacing.sm, marginBottom: 2 },
    moreMed: { ...typography.caption, color: theme.colors.textTertiary, fontStyle: "italic", marginLeft: spacing.sm, marginTop: 2 },
    notes: { ...typography.caption, color: theme.colors.textSecondary, fontStyle: "italic", marginTop: spacing.sm },
    label: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
    f: { marginBottom: spacing.xs },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.xl },
    modalCard: {},
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
    modalTitle: { ...typography.h1, color: theme.colors.text },
  });
