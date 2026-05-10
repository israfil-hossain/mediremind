import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { isPremium } from "../../utils/subscription";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function TabsLayout() {
  const { theme } = useTheme();
  const { user, userRole, isLoading } = useAuth();
  const router = useRouter();
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [premiumChecked, setPremiumChecked] = useState(false);

  useEffect(() => {
    // Check premium status when user role changes (doctors skip premium check)
    if (userRole && userRole !== "doctor" && !premiumChecked) {
      checkPremiumStatus();
      setPremiumChecked(true);
    }
  }, [userRole, premiumChecked]);

  useEffect(() => {
    // Redirect to auth if not authenticated AND loading is complete
    if (!isLoading && !user) {
      router.replace("/auth");
    }
  }, [isLoading, user, router]);

  const checkPremiumStatus = async () => {
    const premium = await isPremium();
    setIsPremiumUser(premium);
  };

  // Show loading while checking auth
  if (isLoading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Doctor Navigation
  if (userRole === "doctor") {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBar,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            height: 75,
            paddingBottom: 15,
            paddingTop: 10,
            paddingHorizontal: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="medical" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "My Patients",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="prescriptions"
          options={{
            title: "Prescriptions",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        {/* Hide unused tabs for doctors */}
        <Tabs.Screen
          name="calendar"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            href: null,
          }}
        />
      </Tabs>
    );
  }

  // Patient Navigation
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 75,
          paddingBottom: 15,
          paddingTop: 10,
          paddingHorizontal: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
          href: isPremiumUser ? null : "/(tabs)/calendar",
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
          href: isPremiumUser ? "/(tabs)/analytics" : null,
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: "My Doctor",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: isPremiumUser ? "Family Care" : "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isPremiumUser ? "people" : "time"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
