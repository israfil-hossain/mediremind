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
  Button,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  signUpWithEmail,
} from "../../../utils/firebase";
import { createUserProfile } from "../../../utils/userManagement";
import {
  checkPendingInvitations,
  acceptInvitation,
} from "../../../utils/connections";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

function createPatientStyles(theme: any) {
  return StyleSheet.create({
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
      backgroundColor: theme.colors.card,
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
      color: theme.colors.text,
      marginTop: 15,
      marginBottom: 10,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginBottom: 15,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      marginBottom: 12,
      paddingHorizontal: 15,
      backgroundColor: theme.colors.surface,
      minHeight: 50,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
    },
    pickerLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    pickerContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -5,
      marginBottom: 15,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      margin: 5,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: "#4CAF50",
      borderColor: "#4CAF50",
    },
    chipText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    chipTextActive: {
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
      backgroundColor: theme.mode === "dark" ? "rgba(244, 67, 54, 0.1)" : "#ffebee",
      borderRadius: 8,
    },
    errorText: {
      color: "#f44336",
      marginLeft: 8,
      fontSize: 14,
      flex: 1,
    },
    datePickerModal: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    datePickerContent: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 20,
      width: "90%",
      maxWidth: 400,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 8,
    },
    datePickerTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 15,
      textAlign: "center",
    },
    datePickerButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    datePickerButton: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    datePickerConfirm: {
      backgroundColor: "#4CAF50",
    },
    datePickerButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    selectedDate: {
      fontSize: 16,
      fontWeight: "600",
      color: "#4CAF50",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    calendarDay: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      margin: 3,
      backgroundColor: theme.colors.surface,
    },
    calendarDayEmpty: {
      width: 40,
      height: 40,
      margin: 3,
    },
    calendarDaySelected: {
      backgroundColor: "#4CAF50",
    },
    calendarDayToday: {
      borderWidth: 2,
      borderColor: "#2196F3",
    },
    calendarDayText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    calendarDayTextSelected: {
      color: "white",
      fontWeight: "bold",
    },
    weekdayRow: {
      flexDirection: "row",
      marginBottom: 10,
    },
    weekday: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 5,
    },
    weekdayText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
  });
}

export default function PatientSignupScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = createPatientStyles(theme);

  // Personal Information
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Additional Information
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Generate calendar days for current month
  const generateCalendar = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

    // Add empty cells for days before month starts
    const emptyDays = Array.from({ length: firstDay }, (_, i) =>
      <View key={`empty-${i}`} style={styles.calendarDayEmpty} />
    );

    // Add days of month
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${day.toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      const isSelected = dateOfBirth === dateStr;
      const isToday = day === today.getDate();

      return (
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isSelected && styles.calendarDaySelected,
            isToday && styles.calendarDayToday,
          ]}
          onPress={() => setDateOfBirth(dateStr)}
        >
          <Text style={[
            styles.calendarDayText,
            isSelected && styles.calendarDayTextSelected,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    });

    return [...emptyDays, ...calendarDays];
  };

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

    if (!dateOfBirth.trim()) {
      setError("Date of birth is required");
      return false;
    }

    if (!gender) {
      setError("Please select your gender");
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

      // Create user profile with patient role
      await createUserProfile(user.uid, {
        role: "patient",
        name,
        email,
        phone,
        patientProfile: {
          dateOfBirth,
          gender: gender.toLowerCase(),
          address: address.trim() || undefined,
          bloodGroup: bloodGroup || undefined,
          emergencyContact: emergencyContactName.trim() || undefined,
          emergencyPhone: emergencyContactPhone.trim() || undefined,
        },
      });

      // Check for pending invitations from doctors and auto-connect
      try {
        const invitations = await checkPendingInvitations(email);
        for (const invitation of invitations) {
          await acceptInvitation(invitation.id, user.uid, email);
        }
        if (invitations.length > 0) {
          console.log(
            `✓ Auto-connected to ${invitations.length} doctor(s) via invitations`
          );
        }
      } catch (e) {
        console.warn("Error checking invitations:", e);
      }

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
              <Ionicons name="person" size={60} color="white" />
            </View>

            <Text style={styles.title}>Patient Registration</Text>
            <Text style={styles.subtitle}>Create your personal health account</Text>

            <View style={styles.card}>
              {/* Personal Information Section */}
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.sectionDivider} />

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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
                <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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
                <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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

              {/* Additional Information Section */}
              <Text style={styles.sectionTitle}>Additional Information</Text>
              <View style={styles.sectionDivider} />

              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <Text style={styles.input}>
                  {dateOfBirth || "Select Date of Birth *"}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <View style={styles.datePickerModal}>
                  <View style={styles.datePickerContent}>
                    <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
                    <View style={styles.datePickerButtons}>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.datePickerButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.selectedDate}>{dateOfBirth}</Text>
                      <TouchableOpacity
                        style={[styles.datePickerButton, styles.datePickerConfirm]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.datePickerButtonText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.weekdayRow}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <View key={index} style={styles.weekday}>
                          <Text style={styles.weekdayText}>{day}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.calendarGrid}>
                      {generateCalendar()}
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="gender-male-female" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <Text style={styles.pickerLabel}>Gender *</Text>
              </View>
              <View style={styles.pickerContainer}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.chip,
                      gender === g && styles.chipActive,
                    ]}
                    onPress={() => setGender(g)}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        gender === g && styles.chipTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Address"
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="sentences"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="water-drop" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <Text style={styles.pickerLabel}>Blood Group</Text>
              </View>
              <View style={styles.pickerContainer}>
                {BLOOD_GROUPS.map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    style={[
                      styles.chip,
                      bloodGroup === bg && styles.chipActive,
                    ]}
                    onPress={() => setBloodGroup(bg)}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        bloodGroup === bg && styles.chipTextActive,
                      ]}
                    >
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="person-add-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Emergency Contact Name"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Emergency Contact Phone"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  keyboardType="phone-pad"
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
                  <Text style={styles.buttonText}>Create Patient Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
