# Premium UI Components

A collection of beautiful, reusable UI components with premium styling for the Medicine Reminder app.

## Components

### 🎨 PremiumModal
A fully customizable modal component with gradient headers, smooth animations, and flexible sizing.

**Features:**
- ✨ Smooth fade, slide, and scale animations
- 🎨 Gradient headers with customizable colors
- 📏 Multiple size options (small, medium, large, full)
- 🔄 Scrollable content support
- 🎯 Optional header icons
- 📱 Footer action area
- 🎭 Backdrop overlay

[View detailed documentation](../docs/PREMIUM_MODAL_USAGE.md)

**Quick Example:**
```tsx
import { PremiumModal } from '../components';

<PremiumModal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Notifications"
  subtitle="3 new items"
  headerIcon="notifications"
  size="medium"
>
  <Text>Your content here</Text>
</PremiumModal>
```

---

### 🔘 PremiumButton
A versatile button component with multiple variants and styles.

**Features:**
- 🎨 Multiple variants (primary, secondary, outline, ghost)
- 📏 Three sizes (small, medium, large)
- ⚡ Loading states
- 🎯 Icon support (left/right positioning)
- 🌈 Gradient backgrounds
- ♿ Accessibility support

**Variants:**
- `primary` - Gradient background button (default)
- `secondary` - Solid gray background
- `outline` - Transparent with colored border
- `ghost` - Transparent, no border

**Quick Example:**
```tsx
import { PremiumButton } from '../components';

<PremiumButton
  title="Save Changes"
  onPress={handleSave}
  variant="primary"
  size="medium"
  icon="checkmark"
  iconPosition="left"
  loading={isSaving}
/>
```

---

## Usage

### Import Components

```tsx
// Import individual components
import { PremiumModal, PremiumButton } from '../components';

// Or import with custom names
import PremiumModal from '../components/PremiumModal';
import PremiumButton from '../components/PremiumButton';
```

### Styling Philosophy

All components follow these design principles:
- 🎨 **Consistent Branding**: Green gradient theme (#1a8e2d to #146922)
- ✨ **Smooth Animations**: Spring-based, natural feeling transitions
- 📱 **Mobile-First**: Optimized for touch interactions
- ♿ **Accessible**: Proper touch targets and feedback
- 🎯 **Customizable**: Easy to override colors and styles

### Color Palette

Primary gradient:
- Start: `#1a8e2d`
- End: `#146922`

Common use cases:
- Success: `#4CAF50`
- Warning: `#FF9800`
- Error: `#F44336`
- Info: `#2196F3`

---

## Creating New Components

When adding new premium components:

1. **Follow the naming convention**: `Premium[ComponentName].tsx`
2. **Use TypeScript**: Strongly type all props
3. **Add animations**: Use Animated API for smooth transitions
4. **Make it customizable**: Allow color, size, and style overrides
5. **Export from index**: Add to `components/index.ts`
6. **Document it**: Add usage examples and prop tables

### Component Template

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PremiumComponentProps {
  // Your props here
}

export default function PremiumComponent({}: PremiumComponentProps) {
  return (
    <View style={styles.container}>
      {/* Your component */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Your styles
  },
});
```

---

## Best Practices

1. **Reuse these components** instead of creating new modals or buttons
2. **Keep customization consistent** with the app's design system
3. **Test on both iOS and Android** before committing
4. **Consider accessibility** - add proper labels and touch targets
5. **Optimize performance** - use React.memo() for heavy components

---

## Future Components

Planned components:
- [ ] PremiumCard
- [ ] PremiumInput
- [ ] PremiumPicker
- [ ] PremiumToast
- [ ] PremiumBadge
- [ ] PremiumSwitch

---

## Contributing

When adding new components:
1. Create the component file in `/components`
2. Add TypeScript types
3. Export from `index.ts`
4. Add documentation
5. Test thoroughly
6. Submit for review
