# Billing Error Fix & Subscription Testing Guide

## The Problem

You're seeing this error:
```
[RevenueCat] 🤖‼️ PurchasesError(code=PurchaseNotAllowedError,
underlyingErrorMessage=Billing is not available in this device.
DebugMessage: Billing service unavailable on device..
ErrorCode: BILLING_UNAVAILABLE)
```

## Why This Happens

Google Play Billing is unavailable because:

1. **You're using Expo Go** - Expo Go doesn't support native in-app purchases
2. **Emulator without Play Store** - Your Android emulator doesn't have Google Play Store installed
3. **Physical device without Play Store** - Device doesn't have Google Play services
4. **Development build not created** - RevenueCat requires native code integration

## ✅ What We Fixed

Added proper error handling in:
- `app/premium.tsx` - Premium screen paywall button
- `components/PaywallModal.tsx` - Paywall modal component
- `contexts/AuthContext.tsx` - Auth sign-in flow

Now the app will:
- ✅ Gracefully handle billing unavailability
- ✅ Show helpful error messages
- ✅ Not crash or get stuck in loading loops
- ✅ Allow users to continue using the app

## How to Test Subscriptions

### Option 1: Development Build (Recommended for Testing)

```bash
# Create a development build for Android
npx expo run:android

# Or for iOS
npx expo run:ios
```

**Requirements:**
- Physical device with Google Play Store installed (recommended)
- OR Android emulator with Google Play Store (Google Play edition)
- macOS with Xcode for iOS

### Option 2: Development Mode (Without Real Purchases)

Set `EXPO_PUBLIC_DEV_IS_PREMIUM=true` in your `.env` file:

```env
EXPO_PUBLIC_DEV_IS_PREMIUM=true
```

This simulates premium access without needing billing. **Perfect for development!**

### Option 3: Test in Production

After deploying to production, you can test real purchases with:
- Test tracks in Google Play Console
- License testers in Google Play Console
- promo codes for free testing

## Setting Up RevenueCat Products

### Step 1: Create Products in App Stores

**Google Play Console:**
1. Go to your app → Subscriptions
2. Create 3 subscription products:
   - `$rc_monthly` - Monthly subscription ($9.99/month)
   - `$rc_annual` - Yearly subscription ($95.88/year)
   - `$rc_lifetime` - Lifetime in-app purchase ($299 one-time)

**Apple App Store Connect:**
1. Go to Subscriptions → Create
2. Create the same 3 products with matching Product IDs

### Step 2: Configure in RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your project → Products
3. Add the products from Step 1
4. Go to Offerings
5. Create an offering named `default`
6. Add all 3 products to the offering

## Testing Checklist

- [ ] Development build created (`npx expo run:android`)
- [ ] Physical device with Google Play Store
- [ ] Products configured in RevenueCat Dashboard
- [ ] Offering created with all 3 products
- [ ] Can open paywall without errors
- [ ] Can complete test purchase
- [ ] Premium features unlock after purchase
- [ ] Subscription persists across app restarts

## Error Messages You'll See

### In Expo Go:
```
"Billing Not Available

In-app purchases are not available in Expo Go.

To test subscriptions:
1. Create a development build: npx expo run:android
2. Use a device with Google Play Store installed
```

### On Emulator without Play Store:
```
"Billing Not Available

Google Play Billing is not available on this device.

This could be because:
• Google Play Store is not installed
• Device doesn't support in-app purchases
• Running on an emulator without Play Store

To test purchases, use a physical device with Google Play Store."
```

## Quick Start for Development

**Fastest way to test premium features:**

1. Set `EXPO_PUBLIC_DEV_IS_PREMIUM=true` in `.env`
2. Restart Expo: `npx expo start --clear`
3. Login/signup
4. All premium features unlocked!

This bypasses RevenueCat entirely and lets you test the UI/UX.

## Production Deployment

When you're ready to go live:

1. Set `EXPO_PUBLIC_DEV_IS_PREMIUM=false` (or remove the line)
2. Ensure RevenueCat products are configured
3. Build for production: `eas build --platform android`
4. Deploy to Google Play Console
5. Test with real purchases in internal test track

## Need Help?

- [RevenueCat Docs](https://www.revenuecat.com/docs)
- [Expo Payments Guide](https://docs.expo.dev/guides/in-app-purchases/)
- [Google Play Billing Docs](https://developer.android.com/google/play/billing)

## Summary

✅ **Billing error is now handled gracefully**
✅ **App won't crash when billing is unavailable**
✅ **Users can still use the app without subscriptions**
✅ **Development mode available for quick testing**

The error you saw is **normal in development** - it just means you need to either:
- Use `EXPO_PUBLIC_DEV_IS_PREMIUM=true` for development
- Create a proper development build to test real purchases
- Test in production after deployment
