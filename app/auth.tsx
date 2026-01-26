import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  signInWithEmail,
  signUpWithEmail,
  getCurrentUser,
  sendPasswordResetEmail,
  signInWithGoogle,
  initializeFirebase,
  configureGoogleSignIn,
  isFirebaseAvailable,
} from "../utils/firebase";

const { width } = Dimensions.get("window");

export default function AuthScreen() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    checkExistingUser();
    initializeFirebaseServices();
  }, []);

  const initializeFirebaseServices = async () => {
    try {
      await initializeFirebase();
      await configureGoogleSignIn();
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
      console.error("User check error:", error);
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (isSignUp) {
      if (!displayName.trim()) {
        setError("Name is required");
        return false;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      setIsAuthenticating(true);
      setError(null);

      const user = await signUpWithEmail(email, password, displayName);

      Alert.alert("Success!", `Welcome ${user.displayName}!`, [
        {
          text: "Continue",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (err: any) {
      console.error("Sign up error:", err);
      const errorMessage = err.message || "An error occurred during sign up";
      setError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    try {
      setIsAuthenticating(true);
      setError(null);

      await signInWithEmail(email, password);

      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Sign in error:", err);
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
        `Password reset instructions have been sent to ${email}`,
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
      console.error("Forgot password error:", err);
      const errorMessage =
        err.message || "Failed to send password reset email";
      setError(errorMessage);
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
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.error("Google sign in error:", err);
      const errorMessage = err.message || "Failed to sign in with Google";
      setError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsForgotPassword(false);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsSignUp(false);
    setError(null);
    setPassword("");
    setConfirmPassword("");
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
            <View style={styles.iconContainer}>
              <Ionicons name="medical" size={80} color="white" />
            </View>

            <Text style={styles.title}>MedRemind</Text>
            <Text style={styles.subtitle}>
              Your Personal Medication Assistant
            </Text>

            <View style={styles.card}>
              <Text style={styles.welcomeText}>
                {isForgotPassword
                  ? "Reset Password"
                  : isSignUp
                  ? "Create Account"
                  : "Welcome Back"}
              </Text>
              <Text style={styles.instructionText}>
                {isForgotPassword
                  ? "Enter your email to receive password reset instructions"
                  : isSignUp
                  ? "Sign up to start managing your medications"
                  : "Sign in to access your medications"}
              </Text>

              {isSignUp && !isForgotPassword && (
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    editable={!isAuthenticating}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#666"
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
                    color="#666"
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

              {isSignUp && !isForgotPassword && (
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
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
                  isForgotPassword
                    ? handleForgotPassword
                    : isSignUp
                    ? handleSignUp
                    : handleSignIn
                }
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isForgotPassword
                      ? "Send Reset Email"
                      : isSignUp
                      ? "Sign Up"
                      : "Sign In"}
                  </Text>
                )}
              </TouchableOpacity>

              {!isForgotPassword && !isSignUp && (
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={toggleForgotPassword}
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
                onPress={isForgotPassword ? toggleForgotPassword : toggleMode}
                disabled={isAuthenticating}
              >
                <Text style={styles.switchText}>
                  {isForgotPassword
                    ? "Back to Sign In"
                    : isSignUp
                    ? "Already have an account? Sign In"
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
              Your data is stored securely{"\n"}
              and synced across devices
            </Text>
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
    backgroundColor: "white",
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
    color: "#333",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: "#f9f9f9",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: "#333",
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
    color: "#666",
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
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#666",
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  googleButtonText: {
    color: "#333",
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
    backgroundColor: "#ffebee",
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
  footerText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 30,
    lineHeight: 20,
  },
});
