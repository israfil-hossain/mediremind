import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useTheme } from "../../contexts/ThemeContext";
import {
    addFamilyProfile,
    deleteFamilyProfile,
    FamilyProfile,
    getActiveProfileId,
    getFamilyProfiles,
    setActiveProfile,
    updateFamilyProfile,
} from "../../utils/familyProfiles";
import { isFamilyCare } from "../../utils/subscription";

const RELATIONSHIPS = [
  { value: "Self", icon: "person" as const },
  { value: "Spouse", icon: "people" as const },
  { value: "Parent", icon: "man" as const },
  { value: "Child", icon: "happy" as const },
  { value: "Sibling", icon: "people-circle" as const },
  { value: "Other", icon: "ellipsis-horizontal" as const },
];

const EMPTY_FORM = { name: "", relationship: "Self", email: "", dateOfBirth: "", notes: "" };

export default function FamilyProfilesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [isFamilyCareActive, setIsFamilyCareActive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FamilyProfile | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    loadProfiles();
    isFamilyCare().then(setIsFamilyCareActive);
  }, []);

  const loadProfiles = async () => {
    setProfiles(await getFamilyProfiles());
    setActiveProfileIdState(await getActiveProfileId());
  };

  const handleAddProfile = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }
    if (!isFamilyCareActive && profiles.length >= 1) {
      Alert.alert("Upgrade Required", "Family Care plan is required to manage multiple profiles. Upgrade to add up to 5 family members.", [
        { text: "Cancel", style: "cancel" },
        { text: "Upgrade", onPress: () => router.push("/premium") },
      ]);
      return;
    }
    if (isFamilyCareActive && profiles.length >= 5) {
      Alert.alert("Limit Reached", "Family Care plan supports up to 5 family members.");
      return;
    }
    try {
      if (editingProfile) await updateFamilyProfile({ ...editingProfile, ...formData });
      else await addFamilyProfile({ id: Math.random().toString(36).slice(2, 11), ...formData });
      setShowAddModal(false);
      setEditingProfile(null);
      setFormData(EMPTY_FORM);
      loadProfiles();
    } catch {
      Alert.alert("Error", "Failed to save profile");
    }
  };

  const handleEditProfile = (profile: FamilyProfile) => {
    setEditingProfile(profile);
    setFormData({ name: profile.name, relationship: profile.relationship, email: profile.email || "", dateOfBirth: profile.dateOfBirth || "", notes: profile.notes || "" });
    setShowAddModal(true);
  };

  const handleDeleteProfile = (profile: FamilyProfile) => {
    if (profile.id === "self") {
      Alert.alert("Cannot Delete", "You cannot delete your own profile");
      return;
    }
    Alert.alert("Delete Profile", `Are you sure you want to delete ${profile.name}'s profile? This will also delete all their medications and history.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => (await deleteFamilyProfile(profile.id), loadProfiles()) },
    ]);
  };

  const openAdd = () => {
    setEditingProfile(null);
    setFormData(EMPTY_FORM);
    setShowAddModal(true);
  };

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={styles.title}>Family Profiles</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isFamilyCareActive && (
          <GlassCard style={styles.block} padding={spacing.xl}>
            <View style={{ alignItems: "center" }}>
              <Ionicons name="people" size={44} color={accents.amber} />
              <Text style={styles.upgradeTitle}>Upgrade to Family Care</Text>
              <Text style={styles.upgradeDesc}>Manage medications for up to 5 family members with one subscription</Text>
              <GlassButton label="Upgrade Now" color={accents.amber} onPress={() => router.push("/premium")} style={{ marginTop: spacing.lg }} />
            </View>
          </GlassCard>
        )}

        <Text style={styles.sectionTitle}>{isFamilyCareActive ? `Family Members (${profiles.length}/5)` : "Your Profile"}</Text>

        {isFamilyCareActive && (
          <GlassCard style={styles.block}>
            <View style={{ flexDirection: "row" }}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={20} color={accents.emerald} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.infoTitle}>Email Notifications</Text>
                <Text style={styles.infoDesc}>Family members with an email address receive automated alerts when a dose is missed by more than 30 minutes.</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {profiles.map((profile) => {
          const rel = RELATIONSHIPS.find((r) => r.value === profile.relationship);
          const isActive = profile.id === activeProfileId;
          return (
            <Pressable key={profile.id} onPress={() => (setActiveProfile(profile.id), setActiveProfileIdState(profile.id))}>
              <GlassCard style={[styles.profileCard, isActive && { borderWidth: 2, borderColor: accents.emerald }]} padding={spacing.lg}>
                <View style={[styles.profileIcon, { backgroundColor: isActive ? accents.emerald : withAlpha(theme.colors.text, 0.08) }]}>
                  <Ionicons name={rel?.icon || "person"} size={28} color={isActive ? "#fff" : theme.colors.textSecondary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.profileRel}>{profile.relationship}</Text>
                  {profile.dateOfBirth && <Text style={styles.profileDetails}>Born: {new Date(profile.dateOfBirth).toLocaleDateString()}</Text>}
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Pressable onPress={() => handleEditProfile(profile)} style={styles.iconBtn} hitSlop={6}>
                    <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                  </Pressable>
                  {profile.id !== "self" && (
                    <Pressable onPress={() => handleDeleteProfile(profile)} style={styles.iconBtn} hitSlop={6}>
                      <Ionicons name="trash-outline" size={20} color={accents.rose} />
                    </Pressable>
                  )}
                </View>
              </GlassCard>
            </Pressable>
          );
        })}

        {isFamilyCareActive && profiles.length < 5 && (
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add-circle" size={22} color={theme.colors.primary} />
            <Text style={styles.addBtnText}>Add Family Member</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProfile ? "Edit Profile" : "Add Family Member"}</Text>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                <Ionicons name="close" size={26} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Name</Text>
              <GlassField value={formData.name} onChangeText={(t) => setFormData((p) => ({ ...p, name: t }))} placeholder="Enter name" containerStyle={{ marginBottom: spacing.lg }} />

              <Text style={styles.label}>Relationship</Text>
              <View style={styles.relGrid}>
                {RELATIONSHIPS.map((rel) => {
                  const active = formData.relationship === rel.value;
                  return (
                    <Pressable key={rel.value} onPress={() => setFormData((p) => ({ ...p, relationship: rel.value }))} style={[styles.relOption, active ? { backgroundColor: accents.emerald, borderColor: accents.emerald } : { borderColor: theme.colors.border }]}>
                      <Ionicons name={rel.icon} size={22} color={active ? "#fff" : theme.colors.text} />
                      <Text style={[styles.relText, active && { color: "#fff" }]}>{rel.value}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Email Address (Optional)</Text>
              <GlassField value={formData.email} onChangeText={(t) => setFormData((p) => ({ ...p, email: t }))} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
              <View style={styles.helper}>
                <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.helperText}>Receives automated email alerts when a medication is missed by more than 30 minutes</Text>
              </View>

              <Text style={styles.label}>Notes (Optional)</Text>
              <GlassField value={formData.notes} onChangeText={(t) => setFormData((p) => ({ ...p, notes: t }))} placeholder="Add any notes..." multiline style={{ height: 80 }} containerStyle={{ marginBottom: spacing.lg }} />

              <GlassButton label={editingProfile ? "Update Profile" : "Add Profile"} onPress={handleAddProfile} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.title, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    block: { marginBottom: spacing.lg },
    upgradeTitle: { ...typography.h1, color: theme.colors.text, marginTop: spacing.md },
    upgradeDesc: { ...typography.caption, color: theme.colors.textSecondary, textAlign: "center", marginTop: spacing.xs },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md },
    infoIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: withAlpha(accents.emerald, 0.14), alignItems: "center", justifyContent: "center" },
    infoTitle: { ...typography.h2, color: theme.colors.text },
    infoDesc: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 },
    profileCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    profileIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
    profileName: { ...typography.h1, color: theme.colors.text },
    activeBadge: { backgroundColor: accents.emerald, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    activeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    profileRel: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    profileDetails: { ...typography.caption, color: theme.colors.textTertiary, marginTop: 2 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: withAlpha(theme.colors.text, 0.06), alignItems: "center", justifyContent: "center" },
    addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: R.md, borderWidth: 2, borderColor: theme.colors.primary, borderStyle: "dashed" },
    addBtnText: { ...typography.h2, color: theme.colors.primary },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: theme.colors.card, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: spacing.xl, maxHeight: "85%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
    modalTitle: { ...typography.h1, color: theme.colors.text },
    label: { ...typography.label, color: theme.colors.text, marginBottom: spacing.sm },
    relGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
    relOption: { width: "31%", borderRadius: R.md, padding: spacing.md, alignItems: "center", borderWidth: StyleSheet.hairlineWidth },
    relText: { fontSize: 12, fontWeight: "600", color: theme.colors.text, marginTop: 4 },
    helper: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: spacing.xs, marginBottom: spacing.lg },
    helperText: { flex: 1, ...typography.caption, color: theme.colors.textSecondary, lineHeight: 16 },
  });
