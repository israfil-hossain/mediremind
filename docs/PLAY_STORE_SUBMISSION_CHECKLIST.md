# Play Store Submission Checklist

This checklist covers everything needed to publish MediRemind on the Google Play Store.

## ✅ Completed Items

| Item | Status | Location |
|------|--------|----------|
| App Configuration | ✅ Done | `app.config.js` |
| Package Name | ✅ Done | `com.flowentech.mediremind` |
| Version Info | ✅ Done | v1.0.0 (version code 1) |
| App Icons | ✅ Done | `assets/images/` |
| Splash Screen | ✅ Done | Configured in app.config.js |
| Firebase Config | ✅ Done | `google-services.json` |
| Privacy Policy | ✅ Created | `docs/PRIVACY_POLICY.md` |
| Keystore Setup Guide | ✅ Created | `docs/KEYSTORE_SETUP.md` |
| Permissions Disclosure | ✅ Created | `docs/ANDROID_PERMISSIONS.md` |
| Store Assets Guide | ✅ Created | `docs/PLAY_STORE_ASSETS_GUIDE.md` |
| Release Signing Config | ✅ Done | `android/app/build.gradle` |
| .gitignore Updated | ✅ Done | Excludes keystore files |

---

## 🔧 Action Items (You Need to Do)

### Priority 1: Before You Can Build

#### 1. Generate Production Keystore
**See:** `docs/KEYSTORE_SETUP.md`

```bash
# Run this command to generate your release keystore
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/release.keystore \
  -alias mediremind-release -keyalg RSA -keysize 2048 -validity 10000

# Then create keystore.properties with your passwords
# (See KEYSTORE_SETUP.md for details)
```

⚠️ **CRITICAL:** Back up your keystore file securely. You cannot update your app without it!

#### 2. Host Your Privacy Policy
**File:** `docs/PRIVACY_POLICY.md`

You need to host this file on a website and get a URL like:
`https://yourwebsite.com/privacy`

Options:
- Add to your existing website
- Use a free hosting service (GitHub Pages, Netlify)
- Use your app's landing page

---

### Priority 2: Store Listing Assets

#### 3. Create Feature Graphic (1024x500)
**See:** `docs/PLAY_STORE_ASSETS_GUIDE.md`

Required for Play Store listing. Use Canva or similar tool.

#### 4. Capture Screenshots (2-8 screenshots)
**See:** `docs/PLAY_STORE_ASSETS_GUIDE.md`

Use an emulator or real device to capture:
- Home screen
- Add medication
- Reminders
- History
- Premium upgrade
- Dark mode

---

### Priority 3: Build & Upload

#### 5. Build Release AAB
```bash
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

#### 6. Create Play Console App
1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Enter app details:
   - App name: **MediRemind - Medicine Reminder**
   - Package name: **com.flowentech.mediremind**
   - Category: **Health & Fitness** or **Medical**
   - Free/Paid: **Free** (with in-app purchases)

#### 7. Complete Store Listing
**See:** `docs/PLAY_STORE_ASSETS_GUIDE.md` for descriptions

Fill in:
- [ ] Short description (80 chars max)
- [ ] Full description
- [ ] Contact information
- [ ] Privacy Policy URL
- [ ] Upload feature graphic
- [ ] Upload screenshots

#### 8. Complete Content Rating
Complete the questionnaire about:
- Ads: Yes (AdMob for free tier)
- Violence: No
- Sexual content: No
- Profanity: No
- Users: General audience

#### 9. Complete Data Safety Section
**Use:** `docs/ANDROID_PERMISSIONS.md`

Disclose:
- Email, name (for accounts)
- Medication data (health info)
- App activity (analytics)
- Device ID (analytics/ads)
- Third parties: Firebase, Stripe, AdMob

#### 10. Upload Your AAB
Go to **Production → Upload new AAB** and upload your bundle.

#### 11. Configure Pricing
- Free app with in-app purchases
- Premium subscription via Stripe

#### 12. Submit for Review
Click "Start rollout to production"

---

## 📋 Pre-Submission Checklist

### Technical
- [ ] Production keystore generated and backed up
- [ ] Release AAB built successfully
- [ ] App tested on at least 2 devices
- [ ] No crash bugs on launch
- [ ] Firebase working (auth, database)

### Legal
- [ ] Privacy Policy hosted online
- [ ] Privacy Policy URL ready
- [ ] Contact email configured and working
- [ ] Terms of Service (if needed)

### Store Assets
- [ ] Feature graphic (1024x500)
- [ ] At least 2 screenshots
- [ ] Short description (80 chars max)
- [ ] Full description
- [ ] App category selected

### Play Console
- [ ] App created in Play Console
- [ ] Store listing complete
- [ ] Content rating complete
- [ ] Data safety section complete
- [ ] AAB uploaded
- [ ] Pricing configured
- [ ] Signing key managed (choose "App signing by Google Play" recommended)

---

## 🚀 After Submission

### What to Expect:
1. **Review Time:** 1-7 days (typically 2-3 days)
2. **Possible Rejection:** Check your email for feedback
3. **Approval:** Your app goes live!

### Common Rejection Reasons:
- Missing Privacy Policy URL
- Permissions not justified
- Inappropriate content rating
- Crashes on launch
- Non-functional features

### Post-Launch:
- Monitor crash reports in Firebase
- Respond to user reviews
- Update app regularly
- Track analytics

---

## 📁 Documentation Files Created

| Document | Purpose |
|----------|---------|
| `docs/PRIVACY_POLICY.md` | Privacy policy content (host this) |
| `docs/KEYSTORE_SETUP.md` | Step-by-step keystore generation |
| `docs/ANDROID_PERMISSIONS.md` | Permissions disclosure for Play Console |
| `docs/PLAY_STORE_ASSETS_GUIDE.md` | Asset creation guide |
| `docs/PLAY_STORE_SUBMISSION_CHECKLIST.md` | This checklist |

---

## 🔗 Useful Links

- [Google Play Console](https://play.google.com/console)
- [Play Store Asset Specifications](https://support.google.com/googleplay/android-developer/answer/10788770)
- [Content Rating Guidelines](https://support.google.com/googleplay/android-developer/answer/188189)
- [Data Safety Form Help](https://support.google.com/googleplay/android-developer/answer/10787469)

---

## 💡 Pro Tips

1. **Test thoroughly** before submitting - you can't easily update after rejection
2. **Choose "App signing by Google Play"** - they manage your key securely
3. **Keep your keystore backed up** in multiple secure locations
4. **Monitor reviews** after launch and respond to users
5. **Start with a closed test** if you want to beta test first

---

**Good luck with your Play Store submission!** 🎉

If you have questions, refer to the documentation files in the `docs/` folder.
