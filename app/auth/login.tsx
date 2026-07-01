import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  configureGoogleSignIn,
  getCurrentUser,
  initializeFirebase,
  isFirebaseAvailable,
  sendPasswordResetEmail,
  signInWithEmail,
  signInWithGoogle,
} from "../../utils/firebase";
import { getUserProfile } from "../../utils/userManagement";

const { width } = Dimensions.get("window");

function createLoginStyles(theme: any) {
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
      justifyContent: "center",
      alignItems: "center",
    },
    backButton: {
      position: "absolute",
      top: 50,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    iconContainer: {
      width: 120,
      height: 120,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 60,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 36,
      fontWeight: "bold",
      color: "white",
      marginBottom: 10,
      textShadowColor: "rgba(0, 0, 0, 0.2)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    subtitle: {
      fontSize: 18,
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: 40,
      textAlign: "center",
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 30,
      width: width - 40,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    welcomeText: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 10,
    },
    instructionText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 24,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      marginBottom: 15,
      paddingHorizontal: 15,
      backgroundColor: theme.colors.surface,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      paddingVertical: 15,
      fontSize: 16,
      color: theme.colors.text,
    },
    button: {
      backgroundColor: "#4CAF50",
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 12,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonIcon: {
      marginRight: 10,
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    forgotPasswordButton: {
      marginTop: 10,
      paddingVertical: 5,
      alignSelf: "flex-end",
    },
    forgotPasswordText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 20,
      width: "100%",
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: 10,
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    googleButton: {
      backgroundColor: theme.colors.card,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 12,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    googleButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    switchButton: {
      marginTop: 20,
      paddingVertical: 10,
    },
    switchText: {
      color: "#4CAF50",
      fontSize: 14,
      fontWeight: "600",
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
      padding: 10,
      backgroundColor: theme.mode === "dark" ? "rgba(244, 67, 54, 0.1)" : "#ffebee",
      borderRadius: 8,
      width: "100%",
    },
    errorText: {
      color: "#f44336",
      marginLeft: 8,
      fontSize: 14,
      flex: 1,
    },
    loadingText: {
      color: "white",
      fontSize: 16,
      marginTop: 16,
    },
  });
}

export default function LoginScreen() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { theme } = useTheme();
  const { refreshUser } = useAuth();
  const styles = createLoginStyles(theme);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    checkExistingUser();
    initializeFirebaseServices();
  }, []);

  const initializeFirebaseServices = async () => {
    try {
      await initializeFirebase();
      try {
        await configureGoogleSignIn();
      } catch (error) {
        console.log("Google Sign-In not available");
      }
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
  };

  const checkExistingUser = async () => {
    try {
      setIsInitializing(true);
      const user = await getCurrentUser();
      if (user) {
        router.replace("/(tabs)");
      }
    } catch (error) {
      // User check error
    } finally {
      setIsInitializing(false);
    }
  };

  const validateForm = (): boolean => {
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return false;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }

    // For forgot password, only email is required
    if (isForgotPassword) {
      return true;
    }

    if (!password) {
      setError("Password is required");
      return false;
    }

    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    try {
      setIsAuthenticating(true);
      setError(null);

      const user = await signInWithEmail(email, password);

      // Load user profile to ensure role is available
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        setError("User profile not found. Please contact support.");
        return;
      }

      console.log("✓ Logged in as:", profile.role);

      // Refresh the auth context so the tab layout sees the logged-in user
      // (otherwise it redirects straight back to /auth).
      await refreshUser();

      router.replace("/(tabs)");
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred during sign in";
      setError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;

    try {
      setIsAuthenticating(true);
      setError(null);

      await sendPasswordResetEmail(email);

      Alert.alert(
        "Email Sent",
        `Password reset instructions have been sent to ${email}.\n\nPlease check your spam folder if you don't receive it within a few minutes.`,
        [
          {
            text: "OK",
            onPress: () => {
              setIsForgotPassword(false);
              setEmail("");
            },
          },
        ]
      );
    } catch (err: any) {
      console.error("Forgot password error:", err.message);
      const errorMessage = err.message || "Failed to send password reset email";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      setError(null);

      if (!isFirebaseAvailable()) {
        Alert.alert(
          "Development Build Required",
          "Google Sign-In requires a development build. You cannot use this feature in Expo Go.\n\nPlease run: npx expo run:android or npx expo run:ios",
          [{ text: "OK" }]
        );
        return;
      }

      const user = await signInWithGoogle();

      if (user) {
        // Refresh the auth context so the tab layout sees the logged-in user.
        await refreshUser();
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to sign in with Google";
      setError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };


  if (isInitializing) {
    return (
      <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <Ionicons name="medical" size={80} color="white" />
            </View>

            <Text style={styles.title}>MediRemind</Text>
            <Text style={styles.subtitle}>
              {isForgotPassword
                ? "Reset your password"
                : "Sign in to access your account"}
            </Text>

            <View style={styles.card}>
              <Text style={styles.welcomeText}>
                {isForgotPassword ? "Forgot Password" : "Welcome Back"}
              </Text>
              <Text style={styles.instructionText}>
                {isForgotPassword
                  ? "Enter your email to receive password reset instructions"
                  : "Enter your credentials to continue"}
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isAuthenticating}
                />
              </View>

              {!isForgotPassword && (
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!isAuthenticating}
                  />
                </View>
              )}

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#f44336" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  isAuthenticating && styles.buttonDisabled,
                ]}
                onPress={
                  isForgotPassword ? handleForgotPassword : handleSignIn
                }
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isForgotPassword ? "Send Reset Email" : "Sign In"}
                  </Text>
                )}
              </TouchableOpacity>

              {!isForgotPassword && (
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => setIsForgotPassword(true)}
                  disabled={isAuthenticating}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              {!isForgotPassword && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.googleButton,
                      isAuthenticating && styles.buttonDisabled,
                    ]}
                    onPress={handleGoogleSignIn}
                    disabled={isAuthenticating}
                  >
                    <Ionicons
                      name="logo-google"
                      size={20}
                      color="#DB4437"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  if (isForgotPassword) {
                    setIsForgotPassword(false);
                    setEmail("");
                  } else {
                    router.replace("/auth");
                  }
                }}
                disabled={isAuthenticating}
              >
                <Text style={styles.switchText}>
                  {isForgotPassword
                    ? "Back to Sign In"
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

