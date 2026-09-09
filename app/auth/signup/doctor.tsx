import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, GlassSurface, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { signUpWithEmail } from "../../../utils/firebase";
import { createUserProfile } from "../../../utils/userManagement";

const MEDICAL_SPECIALTIES = [
  "General Physician", "Cardiologist", "Dermatologist", "Pediatrician", "Gynecologist", "Orthopedic",
  "Neurologist", "Ophthalmologist", "ENT Specialist", "Psychiatrist", "Oncologist", "Nephrologist",
  "Gastroenterologist", "Endocrinologist", "Urologist", "Radiologist", "Anesthesiologist", "Surgeon",
  "Dentist", "Ayurveda", "Homeopath", "Other",
];

export default function DoctorSignupScreen() {
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
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");

  const validateForm = (): boolean => {
    setError(null);
    if (!name.trim()) return setError("Name is required"), false;
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email address"), false;
    if (!phone.trim() || phone.length < 10) return setError("Please enter a valid phone number"), false;
    if (!password || password.length < 6) return setError("Password must be at least 6 characters"), false;
    if (password !== confirmPassword) return setError("Passwords do not match"), false;
    if (!licenseNumber.trim()) return setError("Medical license number is required"), false;
    if (!specialty) return setError("Please select your specialty"), false;
    if (!qualifications.trim()) return setError("Qualifications are required"), false;
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const user = await signUpWithEmail(email, password, name);
      await createUserProfile(user.uid, {
        role: "doctor",
        name,
        email,
        phone,
        doctorProfile: {
          licenseNumber,
          specialty,
          qualifications: qualifications.split(",").map((q) => q.trim()),
          clinicName: clinicName.trim() || undefined,
          clinicAddress: clinicAddress.trim() || undefined,
          yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
          isVerified: true,
          verificationStatus: "approved",
        },
      });
      await refreshUser();
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "An error occurred during sign up");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenBackground topInset={false}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <GlassIconButton icon="arrow-back" onPress={() => router.back()} style={styles.back} />

          <View style={styles.hero}>
            <GlassSurface radius={R.xl} style={styles.logo}>
              <Ionicons name="medkit" size={40} color={accents.indigo} />
            </GlassSurface>
            <Text style={styles.title}>Doctor registration</Text>
            <Text style={styles.subtitle}>Create your healthcare provider account</Text>
          </View>

          <Text style={styles.section}>Personal information</Text>
          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField icon="person-outline" placeholder="Full Name *" value={name} onChangeText={setName} autoCapitalize="words" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="mail-outline" placeholder="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="call-outline" placeholder="Phone Number *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="lock-closed-outline" placeholder="Password *" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="lock-closed-outline" placeholder="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" editable={!isSubmitting} />
          </GlassCard>

          <Text style={styles.section}>Medical information</Text>
          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField icon="card-outline" placeholder="Medical License Number *" value={licenseNumber} onChangeText={setLicenseNumber} autoCapitalize="characters" editable={!isSubmitting} containerStyle={styles.field} />
            <Text style={styles.label}>Specialty *</Text>
            <View style={styles.chips}>
              {MEDICAL_SPECIALTIES.map((spec) => {
                const active = specialty === spec;
                return (
                  <Pressable key={spec} onPress={() => setSpecialty(spec)} disabled={isSubmitting} style={[styles.chip, active ? { backgroundColor: accents.indigo, borderColor: accents.indigo } : { borderColor: theme.colors.border }]}>
                    <Text style={[styles.chipText, active && { color: "#fff" }]}>{spec}</Text>
                  </Pressable>
                );
              })}
            </View>
            <GlassField icon="school-outline" placeholder="Qualifications (e.g., MBBS, MD) *" value={qualifications} onChangeText={setQualifications} autoCapitalize="characters" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="business-outline" placeholder="Clinic/Hospital Name" value={clinicName} onChangeText={setClinicName} autoCapitalize="words" editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="location-outline" placeholder="Clinic Address" value={clinicAddress} onChangeText={setClinicAddress} editable={!isSubmitting} containerStyle={styles.field} />
            <GlassField icon="time-outline" placeholder="Years of Experience" value={yearsOfExperience} onChangeText={setYearsOfExperience} keyboardType="numeric" editable={!isSubmitting} />
          </GlassCard>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={accents.rose} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <GlassButton label="Create doctor account" color={accents.indigo} onPress={handleSignUp} loading={isSubmitting} style={{ marginTop: spacing.sm }} />
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
    label: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.sm },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
    chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: R.pill, borderWidth: StyleSheet.hairlineWidth },
    chipText: { fontSize: 12, fontWeight: "600", color: theme.colors.textSecondary },
    errorBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: R.sm, backgroundColor: withAlpha(accents.rose, 0.12) },
    errorText: { color: accents.rose, fontSize: 14, flex: 1 },
  });
