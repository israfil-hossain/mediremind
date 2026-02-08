import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getFamilyProfiles,
  addFamilyProfile,
  updateFamilyProfile,
  deleteFamilyProfile,
  getActiveProfileId,
  setActiveProfile,
  FamilyProfile,
} from "../../utils/familyProfiles";
import { isFamilyCare } from "../../utils/subscription";
import { useTheme } from "../../contexts/ThemeContext";

const RELATIONSHIPS = [
  { value: "Self", icon: "person" },
  { value: "Spouse", icon: "people" },
  { value: "Parent", icon: "man" },
  { value: "Child", icon: "happy" },
  { value: "Sibling", icon: "people-circle" },
  { value: "Other", icon: "ellipsis-horizontal" },
];

export default function FamilyProfilesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(
    null
  );
  const [isFamilyCareActive, setIsFamilyCareActive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FamilyProfile | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    relationship: "Self",
    email: "",
    dateOfBirth: "",
    notes: "",
  });

  useEffect(() => {
    loadProfiles();
    checkFamilyCare();
  }, []);

  const loadProfiles = async () => {
    const allProfiles = await getFamilyProfiles();
    setProfiles(allProfiles);
    const activeId = await getActiveProfileId();
    setActiveProfileIdState(activeId);
  };

  const checkFamilyCare = async () => {
    const hasFamily = await isFamilyCare();
    setIsFamilyCareActive(hasFamily);
  };

  const handleAddProfile = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }

    if (!isFamilyCareActive && profiles.length >= 1) {
      Alert.alert(
        "Upgrade Required",
        "Family Care plan is required to manage multiple profiles. Upgrade to add up to 5 family members.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => router.push("/premium"),
          },
        ]
      );
      return;
    }

    if (isFamilyCareActive && profiles.length >= 5) {
      Alert.alert(
        "Limit Reached",
        "Family Care plan supports up to 5 family members."
      );
      return;
    }

    try {
      if (editingProfile) {
        await updateFamilyProfile({
          ...editingProfile,
          ...formData,
        });
      } else {
        await addFamilyProfile({
          id: Math.random().toString(36).slice(2, 11),
          ...formData,
        });
      }

      setShowAddModal(false);
      setEditingProfile(null);
      setFormData({ name: "", relationship: "Self", email: "", dateOfBirth: "", notes: "" });
      loadProfiles();
    } catch (error) {
      Alert.alert("Error", "Failed to save profile");
    }
  };

  const handleEditProfile = (profile: FamilyProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      relationship: profile.relationship,
      email: profile.email || "",
      dateOfBirth: profile.dateOfBirth || "",
      notes: profile.notes || "",
    });
    setShowAddModal(true);
  };

  const handleDeleteProfile = (profile: FamilyProfile) => {
    if (profile.id === "self") {
      Alert.alert("Cannot Delete", "You cannot delete your own profile");
      return;
    }

    Alert.alert(
      "Delete Profile",
      `Are you sure you want to delete ${profile.name}'s profile? This will also delete all their medications and history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteFamilyProfile(profile.id);
            loadProfiles();
          },
        },
      ]
    );
  };

  const handleSetActive = async (profileId: string) => {
    await setActiveProfile(profileId);
    setActiveProfileIdState(profileId);
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Family Profiles</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isFamilyCareActive && (
          <View style={styles.upgradeCard}>
            <Ionicons name="people" size={48} color={theme.colors.warning} />
            <Text style={styles.upgradeTitle}>Upgrade to Family Care</Text>
            <Text style={styles.upgradeDescription}>
              Manage medications for up to 5 family members with one subscription
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push("/premium")}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isFamilyCareActive
              ? `Family Members (${profiles.length}/5)`
              : "Your Profile"}
          </Text>

          {/* Email Notification Info Card */}
          {isFamilyCareActive && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Email Notifications</Text>
                <Text style={styles.infoDescription}>
                  Family members with an email address will receive automated alerts when a medication dose is missed by more than 30 minutes. This helps ensure medication adherence and peace of mind for caregivers.
                </Text>
              </View>
            </View>
          )}

          {profiles.map((profile) => {
            const relationshipData = RELATIONSHIPS.find(
              (r) => r.value === profile.relationship
            );
            const isActive = profile.id === activeProfileId;

            return (
              <TouchableOpacity
                key={profile.id}
                style={[styles.profileCard, isActive && styles.activeProfileCard]}
                onPress={() => handleSetActive(profile.id)}
              >
                <View
                  style={[
                    styles.profileIcon,
                    { backgroundColor: isActive ? theme.colors.primary : theme.colors.borderLight },
                  ]}
                >
                  <Ionicons
                    name={relationshipData?.icon as any || "person"}
                    size={32}
                    color={isActive ? "white" : theme.colors.textSecondary}
                  />
                </View>
                <View style={styles.profileInfo}>
                  <View style={styles.profileHeader}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.profileRelationship}>
                    {profile.relationship}
                  </Text>
                  {profile.dateOfBirth && (
                    <Text style={styles.profileDetails}>
                      Born: {new Date(profile.dateOfBirth).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View style={styles.profileActions}>
                  <TouchableOpacity
                    onPress={() => handleEditProfile(profile)}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                  {profile.id !== "self" && (
                    <TouchableOpacity
                      onPress={() => handleDeleteProfile(profile)}
                      style={styles.actionButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={theme.colors.error}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {isFamilyCareActive && profiles.length < 5 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingProfile(null);
              setFormData({ name: "", relationship: "Self", email: "", dateOfBirth: "", notes: "" });
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Family Member</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProfile ? "Edit Profile" : "Add Family Member"}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter name"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship</Text>
                <View style={styles.relationshipGrid}>
                  {RELATIONSHIPS.map((rel) => (
                    <TouchableOpacity
                      key={rel.value}
                      style={[
                        styles.relationshipOption,
                        formData.relationship === rel.value &&
                          styles.selectedRelationship,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, relationship: rel.value })
                      }
                    >
                      <Ionicons
                        name={rel.icon as any}
                        size={24}
                        color={
                          formData.relationship === rel.value
                            ? "white"
                            : theme.colors.text
                        }
                      />
                      <Text
                        style={[
                          styles.relationshipText,
                          formData.relationship === rel.value &&
                            styles.selectedRelationshipText,
                        ]}
                      >
                        {rel.value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  placeholder="email@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.helperTextContainer}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.helperText}>
                    This family member will receive automated email alerts when a medication is missed by more than 30 minutes
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Add any notes..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddProfile}
              >
                <Text style={styles.saveButtonText}>
                  {editingProfile ? "Update Profile" : "Add Profile"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: 50,
      paddingBottom: 20,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: "white",
    },
    content: {
      flex: 1,
      padding: 20,
    },
    upgradeCard: {
      backgroundColor: theme.isDark ? "rgba(255, 152, 0, 0.15)" : "#FFF3E0",
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(255, 152, 0, 0.3)" : "#FFE0B2",
    },
    upgradeTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
      marginTop: 12,
    },
    upgradeDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 16,
    },
    upgradeButton: {
      backgroundColor: theme.colors.warning,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    upgradeButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 12,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeProfileCard: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    profileIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    profileInfo: {
      flex: 1,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginRight: 8,
    },
    activeBadge: {
      backgroundColor: theme.colors.success,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    activeBadgeText: {
      color: "white",
      fontSize: 10,
      fontWeight: "600",
    },
    profileRelationship: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    profileDetails: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    profileActions: {
      flexDirection: "row",
      gap: 8,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderStyle: "dashed",
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textArea: {
      height: 80,
      textAlignVertical: "top",
    },
    relationshipGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    relationshipOption: {
      width: "31%",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedRelationship: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    relationshipText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 4,
    },
    selectedRelationshipText: {
      color: "white",
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 12,
    },
    saveButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    helperTextContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 6,
      paddingHorizontal: 4,
    },
    helperText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    infoCard: {
      flexDirection: "row",
      backgroundColor: theme.isDark ? "rgba(26, 142, 45, 0.15)" : "#E8F5E9",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(26, 142, 45, 0.3)" : "#C8E6C9",
    },
    infoIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.isDark ? "rgba(26, 142, 45, 0.2)" : "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    infoContent: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    },
    infoDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
  });
