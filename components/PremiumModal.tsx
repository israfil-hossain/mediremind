import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";

const { width, height } = Dimensions.get("window");

export type ModalSize = "small" | "medium" | "large" | "full";

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  headerIcon?: keyof typeof Ionicons.glyphMap;
  headerIconColor?: string;
  footerContent?: React.ReactNode;
  scrollable?: boolean;
  useBlur?: boolean;
  gradientColors?: [string, string];
}

export default function PremiumModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  size = "medium",
  showCloseButton = true,
  headerIcon,
  headerIconColor,
  footerContent,
  scrollable = true,
  useBlur = false,
  gradientColors,
}: PremiumModalProps) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Use theme colors as defaults
  const finalGradientColors = gradientColors || [theme.colors.primary, theme.colors.primaryDark];
  const finalHeaderIconColor = headerIconColor || theme.colors.primary;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const getModalWidth = () => {
    switch (size) {
      case "small":
        return width * 0.85;
      case "medium":
        return width * 0.92;
      case "large":
        return width * 0.95;
      case "full":
        return width;
      default:
        return width * 0.92;
    }
  };

  const getModalHeight = () => {
    switch (size) {
      case "small":
        return "auto";
      case "medium":
        return height * 0.7;
      case "large":
        return height * 0.85;
      case "full":
        return height;
      default:
        return height * 0.7;
    }
  };

  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </View>

        <Animated.View
          style={[
            styles.modalContent,
            {
              width: getModalWidth(),
              height: getModalHeight(),
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Header with Gradient */}
          {(title || headerIcon) && (
            <LinearGradient
              colors={finalGradientColors}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.headerContent}>
                {headerIcon && (
                  <View style={styles.headerIconContainer}>
                    <Ionicons
                      name={headerIcon}
                      size={32}
                      color="white"
                    />
                  </View>
                )}
                <View style={styles.headerTextContainer}>
                  {title && <Text style={styles.modalTitle}>{title}</Text>}
                  {subtitle && (
                    <Text style={styles.modalSubtitle}>{subtitle}</Text>
                  )}
                </View>
              </View>
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.closeButtonCircle}>
                    <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              )}
            </LinearGradient>
          )}

          {/* Body */}
          {scrollable ? (
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.modalBody}>{children}</View>
          )}

          {/* Footer */}
          {footerContent && (
            <View style={styles.modalFooter}>{footerContent}</View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  overlayTouchable: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  closeButton: {
    marginLeft: 12,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
});
