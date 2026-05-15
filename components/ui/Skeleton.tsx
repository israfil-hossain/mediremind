import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = "100%", height = 40, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.1)" : "#f0f0f0",
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  const { theme } = useTheme();
  const bgColor = theme.mode === "dark" ? "rgba(255,255,255,0.1)" : "#f0f0f0";
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: bgColor }]} />
        <View style={styles.headerTextContainer}>
          <View style={[styles.title, { backgroundColor: bgColor }]} />
          <View style={[styles.subtitle, { backgroundColor: bgColor }]} />
        </View>
      </View>
      <View style={[styles.bodyLine, { backgroundColor: bgColor }]} />
      <View style={[styles.bodyLine, { backgroundColor: bgColor, width: "70%" }]} />
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    height: 16,
    width: "60%",
    borderRadius: 4,
    marginBottom: 6,
  },
  subtitle: {
    height: 14,
    width: "40%",
    borderRadius: 4,
  },
  bodyLine: {
    height: 14,
    width: "100%",
    borderRadius: 4,
    marginBottom: 6,
  },
});
