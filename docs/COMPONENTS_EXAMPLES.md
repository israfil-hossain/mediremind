# Premium Components - Complete Examples

## 1. Confirmation Modal with Actions

```tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PremiumModal, PremiumButton } from '../components';

function DeleteConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    // Your delete logic
    await deleteMedication();
    setLoading(false);
    setIsOpen(false);
  };

  return (
    <PremiumModal
      visible={isOpen}
      onClose={() => setIsOpen(false)}
      title="Delete Medication"
      subtitle="This action cannot be undone"
      headerIcon="warning"
      size="small"
      gradientColors={["#F44336", "#D32F2F"]}
      footerContent={
        <View style={styles.footerActions}>
          <PremiumButton
            title="Cancel"
            onPress={() => setIsOpen(false)}
            variant="ghost"
            size="medium"
            style={{ flex: 1 }}
          />
          <PremiumButton
            title="Delete"
            onPress={handleDelete}
            variant="primary"
            size="medium"
            gradientColors={["#F44336", "#D32F2F"]}
            loading={loading}
            icon="trash"
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Text style={styles.message}>
        Are you sure you want to delete this medication?
        This will remove all history and reminders.
      </Text>
    </PremiumModal>
  );
}

const styles = StyleSheet.create({
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  message: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
});
```

## 2. Success Notification Modal

```tsx
import { PremiumModal, PremiumButton } from '../components';

function SuccessModal({ visible, onClose, title, message }) {
  return (
    <PremiumModal
      visible={visible}
      onClose={onClose}
      title={title}
      headerIcon="checkmark-circle"
      size="small"
      gradientColors={["#4CAF50", "#2E7D32"]}
      footerContent={
        <PremiumButton
          title="Got it!"
          onPress={onClose}
          variant="primary"
          size="medium"
          fullWidth
        />
      }
    >
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
          {message}
        </Text>
      </View>
    </PremiumModal>
  );
}

// Usage:
<SuccessModal
  visible={showSuccess}
  onClose={() => setShowSuccess(false)}
  title="Medication Added!"
  message="Your medication has been successfully added to your schedule."
/>
```

## 3. List Selection Modal

```tsx
import { PremiumModal } from '../components';

function FrequencyPicker({ visible, onClose, onSelect }) {
  const frequencies = [
    { id: 'daily', label: 'Daily', icon: 'calendar' },
    { id: 'weekly', label: 'Weekly', icon: 'calendar-outline' },
    { id: 'monthly', label: 'Monthly', icon: 'calendar-number' },
    { id: 'custom', label: 'Custom', icon: 'settings' },
  ];

  return (
    <PremiumModal
      visible={visible}
      onClose={onClose}
      title="Select Frequency"
      subtitle="How often should you take this?"
      headerIcon="repeat"
      size="medium"
    >
      <View style={{ gap: 12 }}>
        {frequencies.map((freq) => (
          <TouchableOpacity
            key={freq.id}
            style={styles.frequencyItem}
            onPress={() => {
              onSelect(freq.id);
              onClose();
            }}
          >
            <Ionicons name={freq.icon} size={24} color="#1a8e2d" />
            <Text style={styles.frequencyLabel}>{freq.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))}
      </View>
    </PremiumModal>
  );
}

const styles = StyleSheet.create({
  frequencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    gap: 12,
  },
  frequencyLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
```

## 4. Form Modal with Multiple Buttons

```tsx
import { PremiumModal, PremiumButton } from '../components';

function EditMedicationModal({ visible, onClose }) {
  const [loading, setLoading] = useState(false);

  return (
    <PremiumModal
      visible={visible}
      onClose={onClose}
      title="Edit Medication"
      subtitle="Update your medication details"
      headerIcon="create"
      size="large"
      scrollable={true}
      footerContent={
        <View style={styles.formActions}>
          <PremiumButton
            title="Cancel"
            onPress={onClose}
            variant="outline"
            size="medium"
            style={{ flex: 1 }}
          />
          <PremiumButton
            title="Save"
            onPress={handleSave}
            variant="primary"
            size="medium"
            icon="checkmark"
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      {/* Your form fields here */}
      <View style={{ gap: 16 }}>
        <TextInput placeholder="Medication name" />
        <TextInput placeholder="Dosage" />
        {/* More fields... */}
      </View>
    </PremiumModal>
  );
}
```

## 5. Info Modal with Rich Content

```tsx
function MedicationInfoModal({ visible, onClose, medication }) {
  return (
    <PremiumModal
      visible={visible}
      onClose={onClose}
      title={medication.name}
      subtitle={medication.dosage}
      headerIcon="information-circle"
      size="large"
      gradientColors={["#2196F3", "#1976D2"]}
    >
      <View style={{ gap: 20 }}>
        <View>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <Text style={styles.sectionContent}>
            {medication.times.join(', ')}
          </Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Duration</Text>
          <Text style={styles.sectionContent}>
            {medication.duration}
          </Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.sectionContent}>
            {medication.instructions}
          </Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.sectionContent}>
            {medication.notes || 'No notes'}
          </Text>
        </View>
      </View>
    </PremiumModal>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});
```

## 6. Loading Modal

```tsx
function LoadingModal({ visible, title = "Loading..." }) {
  return (
    <PremiumModal
      visible={visible}
      onClose={() => {}} // Prevent closing
      title={title}
      size="small"
      showCloseButton={false}
      scrollable={false}
    >
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <ActivityIndicator size="large" color="#1a8e2d" />
        <Text style={{ marginTop: 16, color: '#666' }}>
          Please wait...
        </Text>
      </View>
    </PremiumModal>
  );
}
```

## 7. Image Viewer Modal

```tsx
function ImageViewerModal({ visible, onClose, imageUri, title }) {
  return (
    <PremiumModal
      visible={visible}
      onClose={onClose}
      title={title}
      size="full"
      scrollable={false}
      gradientColors={["#000", "#333"]}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={{ uri: imageUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>
    </PremiumModal>
  );
}
```

## 8. Multi-Action Bottom Sheet

```tsx
function ActionSheet({ visible, onClose, actions }) {
  return (
    <PremiumModal
      visible={visible}
      onClose={onClose}
      title="Choose Action"
      size="medium"
      scrollable={false}
    >
      <View style={{ gap: 8 }}>
        {actions.map((action, index) => (
          <PremiumButton
            key={index}
            title={action.label}
            onPress={() => {
              action.onPress();
              onClose();
            }}
            variant={action.destructive ? 'outline' : 'ghost'}
            gradientColors={action.destructive ? ['#F44336', '#D32F2F'] : undefined}
            icon={action.icon}
            iconPosition="left"
            fullWidth
          />
        ))}
      </View>
    </PremiumModal>
  );
}

// Usage:
<ActionSheet
  visible={showActions}
  onClose={() => setShowActions(false)}
  actions={[
    {
      label: 'Edit',
      icon: 'create',
      onPress: handleEdit,
    },
    {
      label: 'Share',
      icon: 'share',
      onPress: handleShare,
    },
    {
      label: 'Delete',
      icon: 'trash',
      destructive: true,
      onPress: handleDelete,
    },
  ]}
/>
```

## Common Patterns

### Modal with Loading State
```tsx
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await performAction();
    onClose();
  } finally {
    setLoading(false);
  }
};
```

### Modal with Form Validation
```tsx
const [errors, setErrors] = useState({});

const validate = () => {
  const newErrors = {};
  if (!name) newErrors.name = 'Name is required';
  if (!dosage) newErrors.dosage = 'Dosage is required';
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Nested Modals (Modal opening another modal)
```tsx
// Avoid nesting modals directly
// Instead, use state to switch between modals
const [activeModal, setActiveModal] = useState(null);

<PremiumModal visible={activeModal === 'first'} ... />
<PremiumModal visible={activeModal === 'second'} ... />
```
