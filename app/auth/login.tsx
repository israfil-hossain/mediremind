import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, GlassSurface, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
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

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { refreshUser } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const styles = createStyles(theme);

  useEffect(() => {
    checkExistingUser();
    initializeFirebaseServices();
  }, []);

  const initializeFirebaseServices = async () => {
    try {
      await initializeFirebase();
      try {
        await configureGoogleSignIn();
      } catch {}
    } catch (e) {
      console.error("Firebase initialization error:", e);
    }
  };

  const checkExistingUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) router.replace("/(tabs)");
    } catch {} finally {
      setIsInitializing(false);
    }
  };

  const validateForm = (): boolean => {
    setError(null);
    if (!email.trim()) return setError("Email is required"), false;
    if (!email.includes("@")) return setError("Please enter a valid email address"), false;
    if (isForgotPassword) return true;
    if (!password) return setError("Password is required"), false;
    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    try {
      setIsAuthenticating(true);
      setError(null);
      const user = await signInWithEmail(email, password);
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        setError("User profile not found. Please contact support.");
        return;
      }
      await refreshUser();
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "An error occurred during sign in");
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
      Alert.alert("Email Sent", `Password reset instructions have been sent to ${email}.`, [
        { text: "OK", onPress: () => (setIsForgotPassword(false), setEmail("")) },
      ]);
    } catch (err: any) {
      const msg = err.message || "Failed to send password reset email";
      setError(msg);
      Alert.alert("Error", msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      setError(null);
      if (!isFirebaseAvailable()) {
        Alert.alert("Development Build Required", "Google Sign-In requires a development build.", [{ text: "OK" }]);
        return;
      }
      const user = await signInWithGoogle();
      if (user) {
        await refreshUser();
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isInitializing) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <GlassIconButton icon="arrow-back" onPress={() => router.back()} style={styles.back} />

          <View style={styles.hero}>
            <GlassSurface radius={R.xl} style={styles.logo}>
              <Ionicons name="medical" size={40} color={accents.emerald} />
            </GlassSurface>
            <Text style={styles.title}>{isForgotPassword ? "Reset password" : "Welcome back"}</Text>
            <Text style={styles.subtitle}>
              {isForgotPassword ? "Enter your email to receive reset instructions" : "Sign in to access your account"}
            </Text>
          </View>

          <GlassCard padding={spacing.xl}>
            <GlassField icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!isAuthenticating} containerStyle={{ marginBottom: spacing.md }} />

            {!isForgotPassword && (
              <GlassField icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!isAuthenticating} containerStyle={{ marginBottom: spacing.md }} />
            )}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={accents.rose} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <GlassButton
              label={isForgotPassword ? "Send reset email" : "Sign in"}
              onPress={isForgotPassword ? handleForgotPassword : handleSignIn}
              loading={isAuthenticating}
              style={{ marginTop: spacing.xs }}
            />

            {!isForgotPassword && (
              <>
                <Pressable style={styles.forgot} onPress={() => setIsForgotPassword(true)} disabled={isAuthenticating}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.line} />
                </View>

                <GlassButton label="Continue with Google" icon="logo-google" variant="glass" onPress={handleGoogleSignIn} disabled={isAuthenticating} />
              </>
            )}

            <Pressable
              style={styles.switch}
              onPress={() => (isForgotPassword ? (setIsForgotPassword(false), setEmail("")) : router.replace("/auth"))}
              disabled={isAuthenticating}
            >
              <Text style={styles.switchText}>{isForgotPassword ? "Back to sign in" : "Don't have an account? Sign up"}</Text>
            </Pressable>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl, paddingVertical: 80 },
    back: { position: "absolute", top: 56, left: spacing.xl, zIndex: 2 },
    hero: { alignItems: "center", marginBottom: spacing.xl },
    logo: { width: 80, height: 80, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
    title: { ...typography.title, color: theme.colors.text },
    subtitle: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
    errorBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: R.sm, backgroundColor: withAlpha(accents.rose, 0.12), marginBottom: spacing.md },
    errorText: { color: accents.rose, fontSize: 14, flex: 1 },
    forgot: { alignSelf: "flex-end", marginTop: spacing.md },
    forgotText: { color: theme.colors.textSecondary, fontSize: 14 },
    divider: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xl },
    line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
    dividerText: { marginHorizontal: spacing.md, color: theme.colors.textSecondary, fontSize: 13 },
    switch: { marginTop: spacing.xl, alignItems: "center" },
    switchText: { color: theme.colors.primary, fontSize: 14, fontWeight: "600" },
  });
