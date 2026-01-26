# PremiumModal Component Usage Guide

A beautiful, customizable modal component with a premium look and feel. Features smooth animations, gradient headers, and flexible sizing options.

## Basic Usage

```tsx
import PremiumModal from "../../components/PremiumModal";

function MyComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <PremiumModal
      visible={visible}
      onClose={() => setVisible(false)}
      title="Modal Title"
      subtitle="Optional subtitle"
    >
      <Text>Your content here</Text>
    </PremiumModal>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | **required** | Controls modal visibility |
| `onClose` | `() => void` | **required** | Called when modal should close |
| `title` | `string` | `undefined` | Modal title in header |
| `subtitle` | `string` | `undefined` | Subtitle below title |
| `children` | `ReactNode` | **required** | Modal content |
| `size` | `"small" \| "medium" \| "large" \| "full"` | `"medium"` | Modal size |
| `showCloseButton` | `boolean` | `true` | Show close button in header |
| `headerIcon` | `IconName` | `undefined` | Icon to show in header |
| `headerIconColor` | `string` | `"#1a8e2d"` | Header icon color |
| `footerContent` | `ReactNode` | `undefined` | Content for footer section |
| `scrollable` | `boolean` | `true` | Enable scrolling for content |
| `useBlur` | `boolean` | `false` | Use blur effect (requires expo-blur) |
| `gradientColors` | `[string, string]` | `["#1a8e2d", "#146922"]` | Header gradient colors |

## Examples

### 1. Simple Modal

```tsx
<PremiumModal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Information"
>
  <Text>Simple content here</Text>
</PremiumModal>
```

### 2. Modal with Icon and Subtitle

```tsx
<PremiumModal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Notifications"
  subtitle="3 new notifications"
  headerIcon="notifications"
  size="medium"
>
  {/* Your notification items */}
</PremiumModal>
```

### 3. Modal with Footer Actions

```tsx
<PremiumModal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  headerIcon="warning"
  size="small"
  footerContent={
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setIsOpen(false)}
      >
        <Text>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleConfirm}
      >
        <Text>Confirm</Text>
      </TouchableOpacity>
    </View>
  }
>
  <Text>Are you sure you want to proceed?</Text>
</PremiumModal>
```

### 4. Full-Screen Modal

```tsx
<PremiumModal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Settings"
  headerIcon="settings"
  size="full"
  scrollable={true}
>
  {/* Full screen content */}
</PremiumModal>
```

### 5. Custom Gradient Colors

```tsx
<PremiumModal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Premium Feature"
  headerIcon="star"
  gradientColors={["#FF9800", "#F57C00"]}
>
  <Text>Premium content here</Text>
</PremiumModal>
```

### 6. Non-Scrollable Modal

```tsx
<PremiumModal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Quick Action"
  size="small"
  scrollable={false}
>
  <View style={{ height: 200 }}>
    {/* Fixed height content */}
  </View>
</PremiumModal>
```

## Modal Sizes

- **small**: 85% width, auto height - perfect for alerts and confirmations
- **medium**: 92% width, 70% height - good for lists and forms
- **large**: 95% width, 85% height - for detailed content
- **full**: 100% width, 100% height - full-screen experience

## Animation

The modal features:
- ✨ Smooth fade-in/out animation
- ✨ Spring-based slide and scale animations
- ✨ Backdrop overlay with configurable opacity
- ✨ Smooth entrance and exit transitions

## Best Practices

1. **Keep content organized**: Use the header, body, and footer sections appropriately
2. **Use appropriate sizes**: Choose modal size based on content amount
3. **Provide clear actions**: Use footer for action buttons
4. **Match your brand**: Customize gradient colors to match your app theme
5. **Icons enhance UX**: Use meaningful icons in headers
6. **Keep titles concise**: Short, descriptive titles work best

## Styling Content

Content inside the modal is automatically padded. You can add custom styles:

```tsx
<PremiumModal visible={isOpen} onClose={close} title="Styled Content">
  <View style={{ gap: 16 }}>
    <Text style={{ fontSize: 16, fontWeight: '600' }}>Section Title</Text>
    <Text style={{ color: '#666' }}>Description text</Text>
  </View>
</PremiumModal>
```

## Accessibility

The modal automatically:
- Handles back button on Android
- Supports status bar translucency
- Provides touch overlay for closing
- Includes hit slop for close button

## Common Use Cases

✅ Notifications list
✅ Confirmation dialogs
✅ Form submissions
✅ Settings panels
✅ Detail views
✅ Action sheets
✅ Image viewers
✅ Success/error messages
