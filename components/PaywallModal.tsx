import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { subscribe, StripePlanType } from "../utils/stripe";
import { useTheme } from "../contexts/ThemeContext";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PLANS: { type: StripePlanType; label: string; price: string; detail: string }[] = [
  { type: "monthly", label: "Monthly", price: "$9.99", detail: "per month" },
  { type: "yearly", label: "Yearly", price: "$79.92", detail: "per year (Save 20%)" },
  { type: "lifetime", label: "Lifetime", price: "$299", detail: "one-time payment" },
];

function createPaywallStyles(theme: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    closeButton: {
      alignSelf: "flex-end",
      padding: 4,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 20,
    },
    planOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    planOptionSelected: {
      borderColor: "#1a8e2d",
      backgroundColor: theme.mode === "dark" ? "rgba(26, 142, 45, 0.2)" : "#F1F8F4",
    },
    planRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    planRadioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#1a8e2d",
    },
    planInfo: {
      flex: 1,
    },
    planLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    planDetail: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    planPrice: {
      fontSize: 18,
      fontWeight: "700",
      color: "#1a8e2d",
    },
    subscribeButton: {
      backgroundColor: "#1a8e2d",
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 12,
    },
    subscribeButtonDisabled: {
      opacity: 0.7,
    },
    subscribeButtonText: {
      color: "white",
      fontSize: 17,
      fontWeight: "700",
    },
    disclaimer: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      textAlign: "center",
      marginTop: 12,
    },
  });
}
