import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  signUpWithEmail,
} from "../../../utils/firebase";
import { createUserProfile } from "../../../utils/userManagement";
import { useAuth } from "../../../contexts/AuthContext";

const MEDICAL_SPECIALTIES = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Pediatrician",
  "Gynecologist",
  "Orthopedic",
  "Neurologist",
  "Ophthalmologist",
  "ENT Specialist",
  "Psychiatrist",
  "Oncologist",
  "Nephrologist",
  "Gastroenterologist",
  "Endocrinologist",
  "Urologist",
  "Radiologist",
  "Anesthesiologist",
  "Surgeon",
  "Dentist",
  "Ayurveda",
  "Homeopath",
  "Other",
];

export default function DoctorSignupScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Personal Information
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Medical Information
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");

  const validateForm = (): boolean => {
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return false;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid phone number");
      return false;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (!licenseNumber.trim()) {
      setError("Medical license number is required");
      return false;
    }

    if (!specialty) {
      setError("Please select your specialty");
      return false;
    }

    if (!qualifications.trim()) {
      setError("Qualifications are required");
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Create auth user
      const user = await signUpWithEmail(email, password, name);

      // Create user profile with doctor role
      await createUserProfile(user.uid, {
        role: "doctor",
        name,
        email,
        phone,
        doctorProfile: {
          licenseNumber,
          specialty,
          qualifications: qualifications.split(",").map(q => q.trim()),
          clinicName: clinicName.trim() || undefined,
          clinicAddress: clinicAddress.trim() || undefined,
          yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
          isVerified: true,
          verificationStatus: "approved",
        },
      });

      // Refresh auth context to load new user profile
      await refreshUser();

      // Redirect directly to dashboard
      router.replace("/(tabs)");
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred during sign up";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <Ionicons name="medkit" size={60} color="white" />
            </View>

            <Text style={styles.title}>Doctor Registration</Text>
            <Text style={styles.subtitle}>Create your healthcare provider account</Text>

            <View style={styles.card}>
              {/* Personal Information Section */}
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.sectionDivider} />

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name *"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email *"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number *"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password *"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password *"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
              </View>

              {/* Medical Information Section */}
              <Text style={styles.sectionTitle}>Medical Information</Text>
              <View style={styles.sectionDivider} />

              <View style={styles.inputContainer}>
                <Ionicons name="card-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Medical License Number *"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  autoCapitalize="characters"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="medical-outline" size={20} color="#666" style={styles.inputIcon} />
                <Text style={styles.pickerLabel}>Specialty *</Text>
              </View>
              <View style={styles.pickerContainer}>
                {MEDICAL_SPECIALTIES.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={[
                      styles.specialtyChip,
                      specialty === spec && styles.specialtyChipActive,
                    ]}
                    onPress={() => setSpecialty(spec)}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.specialtyChipText,
                        specialty === spec && styles.specialtyChipTextActive,
                      ]}
                    >
                      {spec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="school-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Qualifications (e.g., MBBS, MD) *"
                  value={qualifications}
                  onChangeText={setQualifications}
                  autoCapitalize="characters"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Clinic/Hospital Name"
                  value={clinicName}
                  onChangeText={setClinicName}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Clinic Address"
                  value={clinicAddress}
                  onChangeText={setClinicAddress}
                  autoCapitalize="sentences"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Years of Experience"
                  value={yearsOfExperience}
                  onChangeText={setYearsOfExperience}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#f44336" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Create Doctor Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 30,
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#ddd",
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: "#f9f9f9",
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  pickerLabel: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
    marginBottom: 15,
  },
  specialtyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    margin: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  specialtyChipActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  specialtyChipText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  specialtyChipTextActive: {
    color: "white",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    padding: 10,
    backgroundColor: "#ffebee",
    borderRadius: 8,
  },
  errorText: {
    color: "#f44336",
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
});
