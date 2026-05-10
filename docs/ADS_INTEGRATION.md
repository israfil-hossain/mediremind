# AdMob Ads Integration Guide

## Overview
This app uses Google AdMob to display advertisements for free-tier users. Premium users enjoy an ad-free experience as one of their key benefits.

---

## Ad Configuration

### AdMob Setup

#### 1. Create AdMob Account
- Go to [https://apps.admob.com/](https://apps.admob.com/)
- Create an account with your Google credentials

#### 2. Create App in AdMob
- Click "Apps" → "Add App"
- Select your platform (Android/iOS)
- Enter your app details:
  - **Android**: Package name `com.flowentech.mediremind`
  - **iOS**: Bundle ID `com.flowentech.mediremind`
- Copy the **App ID** (starts with `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

#### 3. Create Ad Units

**Banner Ad Unit:**
- In AdMob, go to your app → "Ad Units"
- Click "Create Ad Unit"
- Select **Banner** ad type
- Name it: "Main Banner"
- Copy the **Ad Unit ID** (starts with `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`)

**Interstitial Ad Unit:**
- Click "Create Ad Unit" again
- Select **Interstitial** ad type
- Name it: "Full Screen Ad"
- Copy the **Ad Unit ID**

#### 4. Update Configuration Files

**app.config.js** (Already configured with test IDs):
```javascript
[
  "react-native-google-mobile-ads",
  {
    androidAppId: "ca-app-pub-3940256099942544~3347511713", // REPLACE WITH YOUR ANDROID APP ID
    iosAppId: "ca-app-pub-3940256099942544~1458002511", // REPLACE WITH YOUR IOS APP ID
  }
]
```

**utils/ads.ts** (Replace with your actual Ad Unit IDs):
```typescript
const PRODUCTION_BANNER_ID = Platform.select({
  android: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX", // YOUR BANNER ID
  ios: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
});

const PRODUCTION_INTERSTITIAL_ID = Platform.select({
  android: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX", // YOUR INTERSTITIAL ID
  ios: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
});
```

---

## Implementation Details

### Files Created/Modified

#### 1. **utils/ads.ts** - Ad Utility Functions
```typescript
// Key functions:
- shouldShowAds()          // Checks if user is premium
- getBannerAdUnitId()       // Returns banner ad ID (null if premium)
- getInterstitialAdUnitId()  // Returns interstitial ad ID (null if premium)
```

#### 2. **components/AdBanner.tsx** - Banner Ad Component
- Displays banner ads at the bottom of screens
- Automatically hides for premium users
- Uses adaptive banner size for responsive layout

**Usage:**
```tsx
import AdBanner from '../components/AdBanner';

<View style={{ flex: 1 }}>
  <YourContent />
  <AdBanner />
</View>
```

#### 3. **components/AdInterstitial.tsx** - Interstitial Ad Hook
- Hook: `useInterstitialAd()` - Manages full-screen ads
- HOC: `withInterstitialAd()` - Wraps components to show ads
- Automatically skips ads for premium users

**Usage (Hook):**
```tsx
import { useInterstitialAd } from '../components/AdInterstitial';

function MyScreen() {
  const { showAd, isReady, canShow } = useInterstitialAd();

  const handleAction = () => {
    // Show ad after user action
    showAd();
  };

  return <Button onPress={handleAction} title="Continue" />;
}
```

**Usage (HOC):**
```tsx
import { withInterstitialAd } from '../components/AdInterstitial';

function MyScreen() {
  return <View>Your content</View>;
}

// Show interstitial when screen mounts
export default withInterstitialAd(MyScreen, {
  showOnMount: true,
  delay: 500,
});
```

---

## Ad Placements

### Current Ad Placements

| Screen | Ad Type | Location | Trigger |
|--------|----------|----------|---------|
| **Home (index)** | Banner | Bottom of screen | Always visible (free users) |
| **History** | Banner | Bottom of screen | Always visible (free users) |

### Recommended Ad Placements

**Interstitial Ads (to implement):**
| Screen | Timing | Rationale |
|--------|---------|-----------|
| **Medications** | After adding medication | Natural transition point |
| **Calendar** | When viewing weekly calendar | Less intrusive |
| **Settings** | Before exporting data (free users) | Before premium feature |

---

## Premium vs Free Experience

### Free Users
- ✅ Banner ads on main screens
- ✅ Occasional interstitial ads
- ❌ No access to premium features
- ❌ 5 medication limit
- ❌ 30-day history limit

### Premium Users
- ❌ **No ads** - completely ad-free experience
- ✅ Unlimited medications
- ✅ Unlimited history
- ✅ Advanced analytics
- ✅ Data export
- ✅ All premium features

---

## Testing

### Test Mode
The app currently uses Google's **Test Ad Unit IDs**:
- **Banner**: `ca-app-pub-3940256099942544/6300978111` (Android)
- **Interstitial**: `ca-app-pub-3940256099942544/1033173712` (Android)

These IDs always show test ads and don't generate revenue.

### Testing Steps

**1. Test Free User Experience:**
```bash
# Ensure premium is OFF in .env
EXPO_PUBLIC_DEV_IS_PREMIUM=false

# Run the app
npx expo start
```
- Banner ads should appear at bottom of screens
- Ads load successfully
- No ads on premium-only screens

**2. Test Premium User Experience:**
```bash
# Enable premium in .env
EXPO_PUBLIC_DEV_IS_PREMIUM=true

# Restart the app
```
- All ads should disappear
- Clean, ad-free UI

**3. Test AdMob Integration:**
- Check console for ad load events
- Verify no errors in AdMob initialization
- Test tap interactions (with test ads)

### Production Deployment

**Before publishing:**
1. ✅ Replace test IDs with your actual AdMob IDs
2. ✅ Test on real device (not emulator)
3. ✅ Verify ads don't interfere with navigation
4. ✅ Ensure premium users see NO ads
5. ✅ Test ad frequency (not too intrusive)
6. ✅ Verify compliance with AdMob policies

---

## AdMob Best Practices

### Ad Frequency
- **Banner**: Visible on main screens (non-intrusive)
- **Interstitial**: Max 1-2 per session
- Don't show ads:
  - During medication reminders
  - When user is taking medication
  - In emergencies

### User Experience
- ✅ Ads should not block important actions
- ✅ Allow content to scroll above ads
- ✅ Premium upgrade prominently displayed
- ❌ No ads on sensitive screens (medication alerts)
- ❌ No auto-playing video ads with sound

### Revenue Optimization
- **Target**: Health & wellness keywords (configured)
- **Rating**: General audience (G-rated content)
- **Placement**: Bottom of screen (high visibility, low intrusion)
- **Premium Prompt**: Every ad is an upgrade opportunity

---

## RevenueCat Integration

Ads automatically check premium status via RevenueCat:

```typescript
// utils/ads.ts
export async function shouldShowAds(): Promise<boolean> {
  const premium = await isPremium(); // Checks RevenueCat
  return !premium; // Show ads only if not premium
}
```

When a user upgrades to Premium:
1. RevenueCat updates entitlement
2. `isPremium()` returns true
3. `shouldShowAds()` returns false
4. All ads immediately disappear

---

## Troubleshooting

### Ads Not Showing

**Check 1: Premium Status**
```typescript
import { isPremium } from './utils/subscription';

const premium = await isPremium();
console.log('User is premium:', premium); // Should be false
```

**Check 2: Ad Unit ID**
```typescript
import { getBannerAdUnitId } from './utils/ads';

const adId = await getBannerAdUnitId();
console.log('Ad Unit ID:', adId); // Should not be null
```

**Check 3: Console Logs**
- Look for "Banner ad loaded" message
- Check for AdMob errors in console

**Check 4: Test Mode**
```typescript
import { isDevelopment } from './utils/ads';

console.log('Dev mode:', isDevelopment()); // Should be true in dev
```

### Ads Showing for Premium Users

**Verify RevenueCat Entitlement:**
```typescript
import { fetchCustomerInfo, isEntitled } from './utils/revenuecat';

const info = await fetchCustomerInfo();
const hasPremium = isEntitled(info);
console.log('Has premium entitlement:', hasPremium);
```

**Check Environment Variable:**
```bash
# .env file
EXPO_PUBLIC_DEV_IS_PREMIUM=false  # Should be false in production
```

### AdMob Policy Compliance

**Common Violations to Avoid:**
- ❌ Placing ads over navigation elements
- ❌ Forcing users to click ads to use features
- ❌ Excessive ad frequency (>3 interstitials per session)
- ❌ Ads before medication reminders (critical feature)

**Safe Practices:**
- ✅ Bottom of screen placement
- ✅ After user actions (not before)
- ✅ Skip ads for premium users
- ✅ Clear way to dismiss ads

---

## Earnings & Analytics

### Tracking Revenue

**AdMob Dashboard:**
- **Impressions**: Number of ads shown
- **CTR**: Click-through rate
- **eCPM**: Revenue per 1000 impressions
- **Revenue**: Total earnings

**Key Metrics to Monitor:**
- Daily active users vs. impressions
- Premium conversion rate
- CTR by screen placement
- Fill rate (ads actually showing)

### Optimization Tips

1. **A/B Test Placements**
   - Try banner positions
   - Measure impact on UX

2. **Premium Conversion**
   - Track how many users upgrade to remove ads
   - Prominent "Upgrade to Premium" call-to-action

3. **Frequency Capping**
   - Don't show interstitial more than once per session
   - Respect user experience

---

## Configuration Checklist

### Development
- [x] Install `react-native-google-mobile-ads`
- [x] Configure app.config.js plugin
- [x] Create ad utility (`utils/ads.ts`)
- [x] Create ad components
- [x] Add ads to main screens
- [x] Test with test IDs
- [x] Verify premium check works

### Production
- [ ] Create AdMob account
- [ ] Add app to AdMob
- [ ] Create Banner Ad Unit
- [ ] Create Interstitial Ad Unit
- [ ] Replace test IDs in `utils/ads.ts`
- [ ] Replace app IDs in `app.config.js`
- [ ] Test on real device
- [ ] Submit to Google Play / App Store
- [ ] Monitor first 24 hours of performance

---

## Legal & Privacy

### GDPR Compliance
- ✅ User consent for ads (via AdMob)
- ✅ Privacy policy link in app
- ✅ No personalized ads without consent

### COPPA Compliance
- ✅ App rated for general audiences
- ✅ No data collection from minors
- ✅ AdMob configured for G-rated content

### Disclosures
- ✅ "Contains Ads" in store listing
- ✅ Premium removes ads (clear value prop)
- ✅ Privacy policy explains ad usage

---

## Additional Resources

### Documentation
- [AdMob Documentation](https://developers.google.com/admob)
- [React Native Ads SDK](https://github.com/invertase/react-native-google-mobile-ads)
- [AdMob Policy Center](https://support.google.com/admob/answer/1050579)

### Tools
- [AdMob Console](https://apps.admob.com/)
- [Google Analytics for Firebase](https://firebase.google.com/products/analytics)

---

*Last Updated: February 2026*
*Version: 1.0*
