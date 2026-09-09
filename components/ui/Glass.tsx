import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { accents, blobs, cardShadow, radius as R, spacing, withAlpha } from "../../constants/design";
import { useTheme } from "../../contexts/ThemeContext";

const LIQUID = isLiquidGlassAvailable();

interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  glass?: "regular" | "clear";
  tint?: string;
  intensity?: number;
}

export function GlassSurface({
  children,
  style,
  radius = R.lg,
  glass = "regular",
  tint,
  intensity = 36,
}: GlassSurfaceProps) {
  const { theme } = useTheme();

  const border = {
    borderWidth: 1,
    borderColor: theme.isDark ? withAlpha("#FFFFFF", 0.14) : withAlpha("#FFFFFF", 0.9),
  };

  if (LIQUID) {
    return (
      <GlassView
        glassEffectStyle={glass}
        tintColor={tint}
        colorScheme={theme.isDark ? "dark" : "light"}
        style={[{ borderRadius: radius, overflow: "hidden" }, style]}
      >
        {children}
      </GlassView>
    );
  }

  // Android can't do real blur here, so use a clean near-opaque panel (no BlurView
  // quirks). The fill is on the view itself so it covers edge-to-edge with no inset ghost.
  if (Platform.OS === "android") {
    return (
      <View
        style={[
          {
            borderRadius: radius,
            overflow: "hidden",
            backgroundColor: tint ?? (theme.isDark ? withAlpha("#233043", 0.96) : withAlpha("#FFFFFF", 0.96)),
            ...border,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={theme.isDark ? "dark" : "light"}
      style={[
        {
          borderRadius: radius,
          overflow: "hidden",
          ...border,
          // Tint on the BlurView itself so it fills the whole surface.
          backgroundColor: tint ?? (theme.isDark ? withAlpha("#1E293B", 0.58) : withAlpha("#FFFFFF", 0.72)),
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

interface GlassCardProps extends GlassSurfaceProps {
  padding?: number;
}

// Style keys that position the card as a box belong on the outer (shadow) wrapper;
// everything else (flexDirection, alignItems, gap, …) must reach the inner content
// so children laid out in a row actually render in a row.
const OUTER_KEYS = new Set([
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical",
  "width", "minWidth", "maxWidth", "height", "minHeight", "maxHeight",
  "flex", "flexBasis", "flexGrow", "flexShrink", "alignSelf",
  "position", "top", "left", "right", "bottom", "zIndex",
]);

export function GlassCard({ children, style, padding = spacing.xl, radius = R.lg, ...rest }: GlassCardProps) {
  const { theme } = useTheme();
  const flat = StyleSheet.flatten(style) || {};
  const outer: Record<string, any> = {};
  const inner: Record<string, any> = {};
  for (const key of Object.keys(flat)) {
    (OUTER_KEYS.has(key) ? outer : inner)[key] = (flat as any)[key];
  }
  // Android draws a rectangular elevation shadow unless the shadow view has an opaque
  // rounded background — without this the card gets a "ghost" rectangle behind it.
  const shadowBg = Platform.OS === "android" ? theme.colors.card : "transparent";
  return (
    <View style={[{ borderRadius: radius, backgroundColor: shadowBg }, cardShadow, outer]}>
      <GlassSurface radius={radius} style={[{ padding }, inner]} {...rest}>
        {children}
      </GlassSurface>
    </View>
  );
}

interface GlassButtonProps {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "glass" | "ghost";
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function GlassButton({
  label,
  onPress,
  icon,
  variant = "primary",
  color = accents.emerald,
  disabled,
  loading,
  style,
  textStyle,
}: GlassButtonProps) {
  const { theme } = useTheme();
  const content = (isLight: boolean) => (
    <View style={styles.btnRow}>
      {loading ? (
        <ActivityIndicator color={isLight ? "#fff" : theme.colors.text} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isLight ? "#fff" : theme.colors.text}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text style={[styles.btnText, { color: isLight ? "#fff" : theme.colors.text }, textStyle]}>{label}</Text>
        </>
      )}
    </View>
  );

  if (variant === "primary") {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [{ opacity: pressed ? 0.9 : disabled ? 0.5 : 1 }, style]}>
        <LinearGradient
          colors={[withAlpha(color, 1), withAlpha(color, 0.82)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btnBase, { borderRadius: R.pill }, cardShadow]}
        >
          {content(true)}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === "ghost") {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.btnBase, { opacity: pressed ? 0.6 : 1 }, style]}>
        {content(false)}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}>
      <GlassSurface radius={R.pill} style={styles.btnBase}>
        {content(false)}
      </GlassSurface>
    </Pressable>
  );
}

interface GlassIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function GlassIconButton({ icon, onPress, size = 22, color, style }: GlassIconButtonProps) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, style]}>
      <GlassSurface radius={R.pill} style={styles.iconBtn}>
        <Ionicons name={icon} size={size} color={color ?? theme.colors.text} />
      </GlassSurface>
    </Pressable>
  );
}

interface GlassFieldProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
}

export function GlassField({ icon, containerStyle, style, ...rest }: GlassFieldProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.field,
        { backgroundColor: theme.isDark ? withAlpha("#FFFFFF", 0.06) : withAlpha("#FFFFFF", 0.85), borderColor: theme.colors.border },
        containerStyle,
      ]}
    >
      {icon && <Ionicons name={icon} size={20} color={theme.colors.textSecondary} style={{ marginRight: spacing.md }} />}
      <TextInput
        style={[{ flex: 1, fontSize: 16, color: theme.colors.text, paddingVertical: 14 }, style]}
        placeholderTextColor={theme.colors.textTertiary}
        {...rest}
      />
    </View>
  );
}

interface ScreenBackgroundProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  const { theme } = useTheme();
  const c = theme.isDark ? blobs.dark : blobs.light;
  const op = theme.isDark ? 0.45 : 0.34;
  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.blob, styles.blobA, { backgroundColor: withAlpha(c[0], op) }]} />
        <View style={[styles.blob, styles.blobB, { backgroundColor: withAlpha(c[1], op) }]} />
        <View style={[styles.blob, styles.blobC, { backgroundColor: withAlpha(c[2], op) }]} />
        {/* Diffuse the color blobs into a soft ambient wash so edges never read as hard circles. */}
        <BlurView intensity={theme.isDark ? 40 : 50} tint={theme.isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "700" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: R.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  blob: { position: "absolute", width: 420, height: 420, borderRadius: 420 },
  blobA: { top: -160, right: -120 },
  blobB: { top: 200, left: -180 },
  blobC: { bottom: -160, right: -100 },
});
