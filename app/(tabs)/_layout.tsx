import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "../../components/ui/Glass";
import { cardShadow, radius as R } from "../../constants/design";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { isPremium } from "../../utils/subscription";

function useTabScreenOptions() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);
  return {
    headerShown: false,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.tabBarInactive,
    tabBarBackground: () => (
      <GlassSurface radius={R.pill} style={StyleSheet.absoluteFill} />
    ),
    tabBarItemStyle: { paddingTop: 8 },
    tabBarStyle: {
      position: "absolute" as const,
      left: 16,
      right: 16,
      bottom,
      height: 64,
      borderRadius: R.pill,
      backgroundColor: Platform.OS === "android" ? theme.colors.card : "transparent",
      borderTopWidth: 0,
      paddingTop: 0,
      paddingBottom: 0,
      ...cardShadow,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const, marginBottom: 8 },
  };
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const { user, userRole, isLoading } = useAuth();
  const router = useRouter();
  const screenOptions = useTabScreenOptions();
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [premiumChecked, setPremiumChecked] = useState(false);

  useEffect(() => {
    if (userRole && userRole !== "doctor" && !premiumChecked) {
      isPremium().then(setIsPremiumUser);
      setPremiumChecked(true);
    }
  }, [userRole, premiumChecked]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (userRole === "doctor") {
    return (
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="index"
          options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="medical" size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: "Patients", tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="prescriptions"
          options={{ title: "Prescriptions", tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
        />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="analytics" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          href: isPremiumUser ? null : "/(tabs)/calendar",
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <Ionicons name="analytics" size={size} color={color} />,
          href: isPremiumUser ? "/(tabs)/analytics" : null,
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{ title: "My Doctor", tabBarIcon: ({ color, size }) => <Ionicons name="medkit" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: isPremiumUser ? "Family" : "History",
          tabBarIcon: ({ color, size }) => <Ionicons name={isPremiumUser ? "people" : "time"} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
