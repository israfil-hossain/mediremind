# Testing Premium Features

## Option 1: Test Real Subscription Flow (Recommended)

To test the actual subscription flow with RevenueCat paywalls:

### Prerequisites
1. You must build a development build (not Expo Go):
   ```bash
   npx expo run:android
   # or
   npx expo run:ios
   ```

2. Ensure `EXPO_PUBLIC_DEV_IS_PREMIUM=false` in your `.env` file

### RevenueCat Configuration
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Navigate to your project
3. **Create Products:**
   - Go to "Products" tab
   - Create products in App Store Connect / Google Play Console first
   - Import them into RevenueCat

4. **Create Offering:**
   - Go to "Offerings" tab
   - Create a new offering (or use the "default" offering)
   - Add your subscription products to the offering
   - Mark it as "Current"

5. **Test Subscription:**
   - Use sandbox/test accounts:
     - **iOS**: Create a sandbox user in App Store Connect
     - **Android**: Use a test account in Google Play Console
   - Open the app and navigate to Premium screen
   - Tap "View Plans & Start Trial"
   - The RevenueCat paywall will appear
   - Complete the test purchase

### Sandbox Testing
- **iOS Sandbox:**
  - Settings > App Store > Sandbox Account
  - Sign in with your test account

- **Android Test:**
  - Add your Google account to license testers in Play Console
  - Install via internal testing track

---

## Option 2: Quick Development Testing (Bypass Subscription) ✅ RECOMMENDED FOR TESTING

To quickly test premium features without going through the subscription flow:

1. Set `EXPO_PUBLIC_DEV_IS_PREMIUM=true` in `.env` (already set by default)
2. Restart the development server
3. All premium features will be enabled automatically:
   - ✅ All menu items will be clickable (not disabled)
   - ✅ No premium badges shown
   - ✅ Unlimited medications
   - ✅ Unlimited history
   - ✅ All premium features accessible
4. You'll see console logs: `🔧 [DEV] Premium override enabled via EXPO_PUBLIC_DEV_IS_PREMIUM`

### When to Use Each Method:
- **Option 1** (Real subscription): Test the complete user journey, paywall UI, purchase flow
- **Option 2** (Dev override): ✅ **Quick testing of premium feature functionality** (Recommended for development)

---

## Troubleshooting

### "Paywall not presented" error
- Make sure you're using a development build (not Expo Go)
- Verify products are configured in RevenueCat Dashboard
- Check that an offering is marked as "Current"
- Ensure your API key is correct in `.env`

### "No offerings available"
- Products must be created in App Store Connect / Play Console first
- Import products into RevenueCat
- Add products to an offering
- Mark the offering as current

### Testing Free vs Premium
To test the free user experience:
1. Set `EXPO_PUBLIC_DEV_IS_PREMIUM=false`
2. Don't purchase a subscription
3. You'll see medication limits, upgrade prompts, history limits, etc.

---

## Current API Key
The app is using: `EXPO_PUBLIC_REVENUECAT_API_KEY` from `.env`

Check which key is active:
- Production keys start with: `appl_` (iOS) or `goog_` (Android)
- Test keys start with: `test_`

You can verify in the app logs when it starts:
```
Initializing RevenueCat (Development Build)
Using API key: sk_cbEfJYR...
```
