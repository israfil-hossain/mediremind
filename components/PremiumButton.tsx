import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "small" | "medium" | "large";

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  gradientColors?: [string, string];
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function PremiumButton({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  gradientColors,
  fullWidth = false,
  style,
}: PremiumButtonProps) {
  const { theme } = useTheme();

  // Use theme colors as defaults
  const finalGradientColors = gradientColors || [theme.colors.primary, theme.colors.primaryDark];
  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return { paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, iconSize: 18 };
      case "medium":
        return { paddingVertical: 14, paddingHorizontal: 24, fontSize: 16, iconSize: 20 };
      case "large":
        return { paddingVertical: 18, paddingHorizontal: 32, fontSize: 18, iconSize: 24 };
    }
  };

  const sizeStyles = getSizeStyles();
  const styles = createStyles(theme);

  const getTextColor = () => {
    if (variant === "outline" || variant === "ghost") {
      return finalGradientColors[0];
    }
    if (variant === "secondary") {
      return theme.colors.text;
    }
    return "white";
  };

  const renderContent = () => {
    const textColor = getTextColor();
    const IconComponent = icon ? (
      <Ionicons
        name={icon}
        size={sizeStyles.iconSize}
        color={textColor}
        style={iconPosition === "left" ? styles.iconLeft : styles.iconRight}
      />
    ) : null;

    return (
      <>
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <>
            {icon && iconPosition === "left" && IconComponent}
            <Text
              style={[
                styles.buttonText,
                { fontSize: sizeStyles.fontSize, color: textColor },
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === "right" && IconComponent}
          </>
        )}
      </>
    );
  };

  if (variant === "primary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          style,
        ]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={finalGradientColors}
          style={[
            styles.gradient,
            {
              paddingVertical: sizeStyles.paddingVertical,
              paddingHorizontal: sizeStyles.paddingHorizontal,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === "secondary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          styles.secondaryButton,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
          },
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          style,
        ]}
        activeOpacity={0.8}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  if (variant === "outline") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          styles.outlineButton,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            borderColor: finalGradientColors[0],
          },
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          style,
        ]}
        activeOpacity={0.8}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  // Ghost variant
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles.ghostButton,
        {
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: "hidden",
  },
  fullWidth: {
    width: "100%",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: theme.colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButton: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
