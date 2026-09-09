import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { radius as R, accents, spacing, typography, withAlpha } from "../constants/design";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getDoctorTodayAppointments } from "../utils/appointments";
import { PatientConnection, PatientInvitation, createNotification, getDoctorConnections, getDoctorInvitations, updateConnectionStatus } from "../utils/connections";
import { UserProfile, getUserProfile } from "../utils/userManagement";
import { GlassCard, GlassIconButton, GlassSurface, ScreenBackground } from "./ui/Glass";

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
  const styles = createStyles(theme);
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [invitations, setInvitations] = useState<PatientInvitation[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalPatients: 0, pendingRequests: 0, pendingInvitations: 0, todaysAppointments: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const [conns, invs, todayAppts] = await Promise.all([getDoctorConnections(user.uid), getDoctorInvitations(user.uid), getDoctorTodayAppointments(user.uid)]);
      const withProfiles = await Promise.all(
        conns.map(async (conn) => {
          if (conn.patientId) {
            const profile = await getUserProfile(conn.patientId);
            if (profile) return { ...conn, patientProfile: profile };
          }
          return conn;
        })
      );
      const accepted = withProfiles.filter((c) => c.status === "accepted");
      const pending = withProfiles.filter((c) => c.status === "pending");
      setConnections(withProfiles);
      setInvitations(invs);
      setStats({ totalPatients: accepted.length, pendingRequests: pending.length, pendingInvitations: invs.length, todaysAppointments: todayAppts.length });
    } catch (e) {
      console.error("Error loading dashboard data:", e);
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
            loadDashboardData();
          } catch (e) {
            console.error("Error rejecting request:", e);
            Alert.alert("Error", "Failed to reject connection request");
          }
        },
      },
    ]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const pendingRequests = connections.filter((c) => c.status === "pending");
  const recentPatients = connections.filter((c) => c.status === "accepted").slice(0, 5);

  const statCards = [
    { icon: "people" as const, value: stats.totalPatients, label: "My Patients", color: accents.teal, route: "/(tabs)/history" as const },
    { icon: "time-outline" as const, value: stats.pendingRequests, label: "Pending", color: accents.amber, route: "/(tabs)/history" as const },
    { icon: "mail-outline" as const, value: stats.pendingInvitations, label: "Invitations", color: accents.sky, route: "/(tabs)/history" as const },
    { icon: "document-text" as const, value: stats.todaysAppointments, label: "Appointments", color: accents.violet, route: "/(tabs)/prescriptions" as const },
  ];

  const quickActions = [
    { icon: "person-add" as const, label: "Add Patient", color: accents.teal, route: "/(tabs)/history" as const },
    { icon: "create" as const, label: "Prescription", color: accents.violet, route: "/(tabs)/prescriptions/create" as const },
    { icon: "calendar" as const, label: "Appointments", color: accents.amber, route: "/appointments" as const },
    { icon: "documents" as const, label: "My Scripts", color: accents.sky, route: "/(tabs)/prescriptions" as const },
  ];

  if (isLoading) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accents.teal} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>Dr. {userProfile?.name || "Doctor"}</Text>
            {userProfile?.doctorProfile?.specialty && (
              <View style={styles.specialtyBadge}>
                <Ionicons name="medical" size={12} color={accents.teal} />
                <Text style={styles.specialtyText}>{userProfile.doctorProfile.specialty}</Text>
              </View>
            )}
          </View>
          <Pressable onPress={() => router.push("/(tabs)/history")}>
            <GlassIconButton icon="notifications-outline" onPress={() => router.push("/(tabs)/history")} />
            {stats.pendingRequests + stats.pendingInvitations > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats.pendingRequests + stats.pendingInvitations}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((s) => (
            <Pressable key={s.label} style={styles.statItem} onPress={() => router.push(s.route)}>
              <GlassCard padding={spacing.lg} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: withAlpha(s.color, 0.16) }]}>
                  <Ionicons name={s.icon} size={22} color={s.color} />
                </View>
                <Text style={[styles.statNumber, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </GlassCard>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl, paddingBottom: spacing.sm }}>
          {quickActions.map((a) => (
            <Pressable key={a.label} onPress={() => router.push(a.route)} style={{ marginRight: spacing.md }}>
              <GlassCard padding={spacing.lg} style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: withAlpha(a.color, 0.16) }]}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={styles.actionText}>{a.label}</Text>
              </GlassCard>
            </Pressable>
          ))}
        </ScrollView>

        {pendingRequests.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <Pressable onPress={() => router.push("/(tabs)/history")}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
            {pendingRequests.map((request) => (
              <GlassCard key={request.id} style={styles.rowCard} padding={spacing.lg}>
                <GlassSurface radius={R.pill} style={styles.avatar}>
                  <Text style={styles.avatarText}>{(request.patientProfile?.name || "P")[0].toUpperCase()}</Text>
                </GlassSurface>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.rowTitle}>{request.patientProfile?.name || "Patient"}</Text>
                  <Text style={styles.muted}>{request.patientProfile?.email}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Pressable style={[styles.circleBtn, { backgroundColor: accents.teal }]} onPress={() => handleAcceptRequest(request.id, request.patientProfile?.name || "Patient")}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </Pressable>
                  <Pressable style={[styles.circleBtn, { backgroundColor: accents.rose }]} onPress={() => handleRejectRequest(request.id, request.patientProfile?.name || "Patient")}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </Pressable>
                </View>
              </GlassCard>
            ))}
          </>
        )}

        {recentPatients.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Patients</Text>
              <Pressable onPress={() => router.push("/(tabs)/history")}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
            {recentPatients.map((c) => (
              <Pressable key={c.id} onPress={() => router.push(`/patient/${c.patientId}`)}>
                <GlassCard style={styles.rowCard} padding={spacing.lg}>
                  <GlassSurface radius={R.pill} style={styles.avatar}>
                    <Text style={styles.avatarText}>{(c.patientProfile?.name || "P")[0].toUpperCase()}</Text>
                  </GlassSurface>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.rowTitle}>{c.patientProfile?.name || "Patient"}</Text>
                    <Text style={styles.muted}>{c.patientProfile?.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={theme.colors.textTertiary} />
                </GlassCard>
              </Pressable>
            ))}
          </>
        )}

        {invitations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sent Invitations</Text>
            {invitations.slice(0, 3).map((inv) => (
              <GlassCard key={inv.id} style={styles.rowCard} padding={spacing.lg}>
                <View style={[styles.avatar, { backgroundColor: withAlpha(accents.amber, 0.16) }]}>
                  <Ionicons name="mail" size={20} color={accents.amber} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.rowTitle}>{inv.patientEmail}</Text>
                  <Text style={[styles.muted, { color: accents.amber }]}>Waiting to register</Text>
                </View>
              </GlassCard>
            ))}
          </>
        )}

        {connections.length === 0 && (
          <GlassCard style={styles.empty} padding={spacing.xxl}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={44} color={accents.teal} />
            </View>
            <Text style={styles.emptyTitle}>No patients yet</Text>
            <Text style={styles.muted}>Tap "Add Patient" to connect with your first patient</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/history")}>
              <Text style={styles.emptyBtnText}>Add Patient</Text>
            </Pressable>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: 120 },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.xl },
    greeting: { ...typography.body, color: theme.colors.textSecondary },
    name: { ...typography.title, color: theme.colors.text, marginTop: 2 },
    specialtyBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: withAlpha(accents.teal, 0.14), paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: R.pill, alignSelf: "flex-start", marginTop: spacing.sm },
    specialtyText: { fontSize: 13, color: accents.teal, fontWeight: "600" },
    notifBadge: { position: "absolute", top: -2, right: -2, backgroundColor: accents.rose, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    notifBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xl },
    statItem: { width: "47.5%" },
    statCard: { alignItems: "center" },
    statIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
    statNumber: { fontSize: 26, fontWeight: "800" },
    statLabel: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
    viewAll: { ...typography.label, color: accents.teal },
    actionCard: { alignItems: "center", width: 'auto', gap: spacing.sm },
    actionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    actionText: { ...typography.caption, color: theme.colors.text, textAlign: "center" },
    rowCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 20, fontWeight: "800", color: accents.teal },
    rowTitle: { ...typography.h2, color: theme.colors.text },
    muted: { ...typography.caption, color: theme.colors.textSecondary, textAlign: "center" },
    circleBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", gap: spacing.sm },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: withAlpha(accents.teal, 0.14), alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
    emptyTitle: { ...typography.h1, color: theme.colors.text },
    emptyBtn: { backgroundColor: accents.teal, paddingHorizontal: spacing.xxl, paddingVertical: 12, borderRadius: R.pill, marginTop: spacing.md },
    emptyBtnText: { color: "#fff", fontWeight: "700" },
  });
