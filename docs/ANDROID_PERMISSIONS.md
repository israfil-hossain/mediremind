# Android Permissions Disclosure for Play Store

This document describes all Android permissions used by MediRemind and their justification for Google Play Store review.

## Required Permissions

| Permission | Justification | User Benefit |
|------------|---------------|--------------|
| `INTERNET` | Required for Firebase services, authentication, and Stripe payments | Sync data across devices, cloud backup |
| `VIBRATE` | For medication reminder notifications | Haptic feedback for medication alerts |
| `RECEIVE_BOOT_COMPLETED` | Reschedule reminders after device restart | Reminders continue working after restart |
| `WAKE_LOCK` | Keep device awake for critical reminders | Ensure reminders fire on time |

## Optional Permissions (Request at Runtime)

| Permission | Justification | User Benefit | Can Be Disabled |
|------------|---------------|--------------|-----------------|
| `POST_NOTIFICATIONS` (Android 13+) | Display medication reminder notifications | Core app functionality | Yes, but breaks app |
| `SCHEDULE_EXACT_ALARM` (Android 12+) | Schedule precise medication times | Accurate reminders | Yes, but affects accuracy |
| `READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES` | Attach prescription images to medications | Visual prescription records | Yes |
| `WRITE_EXTERNAL_STORAGE` | Save prescription images locally | Offline access to images | Yes |
| `RECORD_AUDIO` | Add voice notes to medications (future feature) | Quick medication notes | Yes |
| `CAMERA` | Take photos of prescription bottles | Easy medication entry | Yes |
| `SYSTEM_ALERT_WINDOW` | Show overlay reminders (optional feature) | Persistent reminders | Yes |

## Permissions Not Used But May Be Detected

| Permission | Why It's Included | Our Justification |
|------------|-------------------|-------------------|
| `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` | May be requested by AdMob for ads | **Not used by our app** - Only AdMob may use it for ad targeting |

## Third-Party SDK Permissions

### Firebase
- `INTERNET` - Cloud sync, authentication, analytics
- `ACCESS_NETWORK_STATE` - Check connectivity
- `WAKE_LOCK` - Background sync

### Google AdMob
- `INTERNET` - Load ads
- `ACCESS_NETWORK_STATE` - Check connectivity before loading ads

### Stripe
- `INTERNET` - Process payments securely

## Play Store Data Safety Section Responses

### Is your app collecting or sharing any of the following data types?

#### Personal Information
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email address | ✅ Yes | ❌ No | Account, authentication |
| Name or other identifiers | ✅ Yes | ❌ No | User profile (optional) |
| User IDs | ✅ Yes | ❌ No | Firebase Auth UID |

#### Health and Fitness
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Health info (medications) | ✅ Yes | ✅ Yes* | Reminders, tracking |
| *Shared only with connected doctors (user-controlled) |

#### Financial Information
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Payment info | ❌ No | ❌ No | Processed by Stripe only |

#### App Activity and Performance
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| App interactions | ✅ Yes | ✅ Yes** | Analytics |
| Crash logs | ✅ Yes | ❌ No | App stability |
| **Shared with Firebase (Google) only |

#### Device or Other Identifiers
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Device ID | ✅ Yes | ✅ Yes** | Analytics, ads |
| Advertising ID | ✅ Yes | ✅ Yes** | Ad serving |
| **Shared with Firebase/AdMob (Google) only |

### Is your app collecting or sharing data for children under 13?
- ❌ **No** - This app is not intended for children under 13

### Is your app sharing data with third parties?
| Third Party | Data Shared | Purpose |
|-------------|-------------|---------|
| Firebase (Google) | Usage data, device ID, crash logs | Analytics, app functionality |
| Google AdMob | Advertising ID, device ID | Display ads |
| Stripe | None (payment data never touches our servers) | Payment processing |
| Connected Doctors | Medication data, adherence | Doctor-patient feature (user-controlled) |

### Is your app transferring data outside the EEA?
- ✅ **Yes** - Firebase servers are global. We rely on EU-US Data Privacy Framework and Google's GDPR compliance.

### Security Practices
| Practice | Implemented |
|----------|-------------|
| Data encryption in transit | ✅ Yes (HTTPS/TLS) |
| Data encryption at rest | ✅ Yes (Firebase Firestore encryption) |
| User can request data deletion | ✅ Yes (via app settings) |
| User can revoke third-party access | ✅ Yes (remove doctor access) |

## Additional Information for Review

### App Functionality Summary
MediRemind is a medication management app that:
1. Sends timely medication reminders
2. Tracks medication adherence
3. Stores prescription information
4. (Optional) Connects patients with healthcare providers
5. Offers premium subscription via Stripe

### Data Collection Minimization
- We collect only data necessary for core functionality
- Users can choose not to provide optional information
- Location is NOT collected by our app (only potentially by AdMob for ads)

### Privacy Policy URL
- [Your hosted privacy policy URL]
- **Required:** Host the Privacy Policy from `docs/PRIVACY_POLICY.md` before submitting

## Play Store Submission Checklist

- [ ] Privacy Policy hosted and URL added to Play Console
- [ ] All permissions justified above documented in Play Console
- [ ] Content rating questionnaire completed
- [ ] Target audience set (General audience, not children)
- [ ] Data safety section completed using above information
- [ ] App category: Health & Fitness or Medical

---

**Note:** This document should be used as reference when completing the Play Console data safety section.
