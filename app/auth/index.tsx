import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard, GlassSurface, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useTheme } from "../../contexts/ThemeContext";
import { getCurrentUser } from "../../utils/firebase";

export default function AuthScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user) router.replace("/(tabs)");
      })
      .catch(() => {})
      .finally(() => setIsInitializing(false));
  }, []);

  const styles = createStyles(theme);

  if (isInitializing) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  const roles = [
    { key: "patient", icon: "person" as const, title: "Patient", subtitle: "Manage your own medications", color: accents.emerald, route: "/auth/signup/patient" as const },
    { key: "doctor", icon: "medkit" as const, title: "Doctor", subtitle: "For healthcare professionals", color: accents.indigo, route: "/auth/signup/doctor" as const },
  ];

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.hero}>
          <GlassSurface radius={R.xl} style={styles.logo}>
            <Ionicons name="medical" size={44} color={accents.emerald} />
          </GlassSurface>
          <Text style={styles.title}>MediRemind</Text>
          <Text style={styles.subtitle}>Your health companion</Text>
        </View>

        <Text style={styles.prompt}>I am a…</Text>

        {roles.map((role) => (
          <Pressable key={role.key} onPress={() => router.push(role.route)}>
            <GlassCard style={styles.roleCard} padding={spacing.xl}>
              <View style={[styles.roleIcon, { backgroundColor: withAlpha(role.color, 0.16) }]}>
                <Ionicons name={role.icon} size={28} color={role.color} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.lg }}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.textTertiary} />
            </GlassCard>
          </Pressable>
        ))}

        <Pressable style={styles.footer} onPress={() => router.push("/auth/login")}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.footerLink}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    container: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
    hero: { alignItems: "center", marginBottom: spacing.xxxl },
    logo: { width: 88, height: 88, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
    title: { ...typography.hero, color: theme.colors.text },
    subtitle: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.xs },
    prompt: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.lg },
    roleCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    roleIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    roleTitle: { ...typography.h1, color: theme.colors.text },
    roleSubtitle: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    footer: { alignItems: "center", marginTop: spacing.xl },
    footerText: { ...typography.body, color: theme.colors.textSecondary },
    footerLink: { color: theme.colors.primary, fontWeight: "700" },
  });
