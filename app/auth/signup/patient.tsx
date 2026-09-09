import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, GlassSurface, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { acceptInvitation, checkPendingInvitations } from "../../../utils/connections";
import { signUpWithEmail } from "../../../utils/firebase";
import { createUserProfile } from "../../../utils/userManagement";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

export default function PatientSignupScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const validateForm = (): boolean => {
    setError(null);
    if (!name.trim()) return setError("Name is required"), false;
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email address"), false;
    if (!phone.trim() || phone.length < 10) return setError("Please enter a valid phone number"), false;
    if (!password || password.length < 6) return setError("Password must be at least 6 characters"), false;
    if (password !== confirmPassword) return setError("Passwords do not match"), false;
    if (!dateOfBirth.trim()) return setError("Date of birth is required"), false;
    if (!gender) return setError("Please select your gender"), false;
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const user = await signUpWithEmail(email, password, name);
      await createUserProfile(user.uid, {
        role: "patient",
        name,
        email,
        phone,
        patientProfile: {
          dateOfBirth,
          gender: gender.toLowerCase() as "male" | "female" | "other",
          address: address.trim() || undefined,
          bloodGroup: bloodGroup || undefined,
          emergencyContact: emergencyContactName.trim() || undefined,
          emergencyPhone: emergencyContactPhone.trim() || undefined,
        },
      });
      try {
        const invitations = await checkPendingInvitations(email);
        for (const invitation of invitations) await acceptInvitation(invitation.id, user.uid, email);
      } catch (e) {
        console.warn("Error checking invitations:", e);
      }
      await refreshUser();
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "An error occurred during sign up");
    } finally {
      setIsSubmitting(false);
    }
  };

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} disabled={isSubmitting} style={[styles.chip, active ? { backgroundColor: accents.emerald, borderColor: accents.emerald } : { borderColor: theme.colors.border }]}>
      <Text style={[styles.chipText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScreenBackground topInset={false}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <GlassIconButton icon="arrow-back" onPress={() => router.back()} style={styles.back} />

          <View style={styles.hero}>
            <GlassSurface radius={R.xl} style={styles.logo}>
              <Ionicons name="person" size={40} color={accents.emerald} />
            </GlassSurface>
            <Text style={styles.title}>Patient registration</Text>
            <Text style={styles.subtitle}>Create your personal health account</Text>
          </View>

          <Text style={styles.section}>Personal information</Text>
          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField icon="person-outline" placeholder="Full Name *" value={name} onChangeText={setName} autoCapitalize="words" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="mail-outline" placeholder="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="call-outline" placeholder="Phone Number *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="lock-closed-outline" placeholder="Password *" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="lock-closed-outline" placeholder="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" editable={!isSubmitting} />
          </GlassCard>

          <Text style={styles.section}>Additional information</Text>
          <GlassCard padding={spacing.lg} style={styles.block}>
            <Pressable style={[styles.dateRow, { borderColor: theme.colors.border }]} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.dateText, { color: dateOfBirth ? theme.colors.text : theme.colors.textTertiary }]}>{dateOfBirth || "Select Date of Birth *"}</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(1995, 0, 1)}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    const dd = String(date.getDate()).padStart(2, "0");
                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                    setDateOfBirth(`${dd}/${mm}/${date.getFullYear()}`);
                  }
                }}
              />
            )}

            <Text style={styles.label}>Gender *</Text>
            <View style={styles.chips}>{GENDERS.map((g) => chip(g, gender === g, () => setGender(g)))}</View>

            <Text style={styles.label}>Blood Group</Text>
            <View style={styles.chips}>{BLOOD_GROUPS.map((bg) => chip(bg, bloodGroup === bg, () => setBloodGroup(bg)))}</View>

            <GlassField icon="location-outline" placeholder="Address" value={address} onChangeText={setAddress} editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="person-add-outline" placeholder="Emergency Contact Name" value={emergencyContactName} onChangeText={setEmergencyContactName} autoCapitalize="words" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="call-outline" placeholder="Emergency Contact Phone" value={emergencyContactPhone} onChangeText={setEmergencyContactPhone} keyboardType="phone-pad" editable={!isSubmitting} />
          </GlassCard>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={accents.rose} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <GlassButton label="Create patient account" onPress={handleSignUp} loading={isSubmitting} style={{ marginTop: spacing.sm }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.xl, paddingTop: 100, paddingBottom: spacing.xxxl },
    back: { position: "absolute", top: 56, left: spacing.xl, zIndex: 2 },
    hero: { alignItems: "center", marginBottom: spacing.xl },
    logo: { width: 80, height: 80, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
    title: { ...typography.title, color: theme.colors.text, textAlign: "center" },
    subtitle: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
    section: { ...typography.h2, color: theme.colors.text, marginBottom: spacing.md, marginLeft: spacing.xs },
    block: { marginBottom: spacing.lg },
    field: { marginBottom: spacing.md },
    dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: R.md, paddingHorizontal: spacing.lg, paddingVertical: 15, marginBottom: spacing.md },
    dateText: { fontSize: 16 },
    label: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.sm },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
    chip: { paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: R.pill, borderWidth: StyleSheet.hairlineWidth },
    chipText: { fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary },
    errorBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: R.sm, backgroundColor: withAlpha(accents.rose, 0.12) },
    errorText: { color: accents.rose, fontSize: 14, flex: 1 },
  });
