# Play Store Listing Assets Guide

This guide provides specifications and templates for creating all required and optional assets for your Google Play Store listing.

## Required Assets

### 1. Application Icon
**Status:** ✅ Already have

| Specification | Details |
|---------------|---------|
| Format | PNG |
| Size | 512x512 pixels |
| Transparent | No (must be solid background) |
| Current Location | `assets/images/icon.png` |

**Tip:** Your current icon should work. Consider adding a subtle gradient or health-themed design element.

---

### 2. Feature Graphic (Required)
**Status:** ❌ Need to create

| Specification | Details |
|---------------|---------|
| Format | JPG or PNG (24-bit with no alpha) |
| Size | 1024x500 pixels |
| Use | Featured in store listing, promotions |
| Content | App name, tagline, key visual |

**Design Suggestions:**
- Show app logo on left/center
- Tagline: "Never Miss Your Medication Again"
- Show pill/medication icon or clock/alarm imagery
- Use your brand colors (#E6F4FE light blue background)
- Include: App name + one key benefit

**Content Layout:**
```
+------------------------------------------+
|  [Logo]  Never Miss Your Medication       |
|           Again with MediRemind           |
|                                          |
|     [Reminder UI Preview]                 |
|     [Medication Tracking Visual]          |
+------------------------------------------+
```

---

### 3. Screenshots (Required: Minimum 2, Maximum 8)
**Status:** ❌ Need to create

| Specification | Details |
|---------------|---------|
| Format | JPG or PNG |
| Size | Minimum: 320px, Maximum: 3840px (recommended 1080x1920) |
| Aspect Ratio | 16:9 or 9:16 (portrait or landscape) |
| Text | Localized text allowed in images |

#### Recommended Screenshots (8 total)

1. **Home Screen - My Medications**
   - Caption: "Manage all your medications in one place"
   - Show: Medication list with upcoming reminders

2. **Add Medication Screen**
   - Caption: "Add medications quickly with smart reminders"
   - Show: Add/edit medication form

3. **Reminder Notification**
   - Caption: "Never miss a dose with timely notifications"
   - Show: Notification or reminder screen

4. **History/Tracking**
   - Caption: "Track your medication adherence over time"
   - Show: Calendar view or history graph

5. **Premium Upgrade**
   - Caption: "Unlock unlimited medications & more"
   - Show: Premium features screen

6. **Dark Mode**
   - Caption: "Beautiful dark mode support"
   - Show: App in dark mode

7. **Doctor-Patient Connection** (if feature is live)
   - Caption: "Stay connected with your healthcare provider"
   - Show: Doctor dashboard or patient list

8. **Prescriptions Detail**
   - Caption: "Keep your prescriptions organized"
   - Show: Prescription detail view

#### Screenshot Design Tips:
- Use actual device frames (nexus 6p, pixel 5, etc.)
- Include brief text description at top (40-60 chars max)
- Show real app UI, not mockups
- Ensure text is readable
- Use consistent style across all screenshots

---

## Optional But Recommended Assets

### 4. Promo Video
**Status:** ❌ Optional but recommended

| Specification | Details |
|---------------|---------|
| Format | MP4 or YouTube URL |
| Duration | 30 seconds to 2 minutes |
| Resolution | 1080p (1920x1080) |
| Orientation | Landscape |

**Video Script Outline:**
```
0:00 - Intro: App logo + tagline "Never Miss Your Medication"
0:05 - Problem: "Struggling to remember your medications?"
0:10 - Solution: "Meet MediRemind" + show home screen
0:15 - Features: Add medication, set reminders, tracking
0:20 - Premium: "Upgrade for unlimited medications"
0:25 - CTA: "Download MediRemind today"
```

---

### 5. Short Description (80 characters max)
```
Never miss your medication. Set reminders, track prescriptions, stay healthy!
```

**Actual:** 79 characters

---

### 6. Full Description (Up to 4000 characters)

```
Never Miss Your Medication Again! 💊

MediRemind is your personal medication assistant that helps you stay on track with your prescriptions, vitamins, and supplements.

🔔 SMART REMINDERS
• Set unlimited medication reminders
• Customize times, frequencies, and dosages
• Get notified even when your phone is locked

💊 MEDICATION MANAGEMENT
• Add prescriptions, vitamins, and supplements
• Track your medication history
• View adherence statistics and trends

📋 PRESCRIPTION TRACKING
• Store prescription details and notes
• Add photos of prescription labels
• Set refill reminders

👨‍⚕️ DOCTOR CONNECTION (Premium)
• Connect with healthcare providers
• Share medication history with your doctor
• Receive prescription updates

📊 ADHERENCE INSIGHTS
• View your medication-taking history
• Track streaks and adherence rates
• Export reports for your doctor

✨ WHY MEDIREMIND?

✅ Easy to use - Add medications in seconds
✅ Reliable - Notifications you can count on
✅ Secure - Your data is encrypted and private
✅ Beautiful - Modern, intuitive design
✅ Dark mode - Easy on the eyes

🌟 FREE FEATURES
• Up to 5 medications
• Daily reminders
• Basic history tracking (30 days)
• Ad-supported experience

👑 PREMIUM FEATURES
• Unlimited medications
• Unlimited history
• No ads
• Doctor-patient connection
• Prescription sharing
• Priority support

PRICING
• Premium Monthly: $4.99/month
• Premium Yearly: $39.99/year (33% savings)
• Payment handled securely through Stripe

PERMISSIONS EXPLAINED
• Notifications: For medication reminders
• Camera/Storage: To add prescription photos (optional)
• Internet: For cloud sync and authentication

Your health data is private and secure. We never sell your personal information.

Download MediRemind today and take control of your health! 💪

Questions? Contact us at support@flowentech.com

Privacy Policy: [Your URL]
Terms of Service: [Your URL]
```

---

### 7. Store Listing Categories

| Field | Value |
|-------|-------|
| **Application Type** | App |
| **Category** | Health & Fitness (or Medical) |
| **Content Rating** | Everyone (or Teen if ads shown) |

---

### 8. Contact Information

| Field | Value |
|-------|-------|
| **Website** | [Your website URL] |
| **Support Email** | support@flowentech.com |
| **Privacy Policy URL** | [Your hosted privacy policy URL] |

---

## Image Creation Tools

### Recommended Tools:
1. **Canva** - Free templates for Play Store graphics
2. **Figma** - Professional design tool
3. **AppScreenshot.co** - Automated screenshot generator
4. **Screenshot Maker** - Play Store asset creator

### Canva Template Search Terms:
- "Google Play Store Feature Graphic"
- "App Store Screenshot Template"
- "Mobile App Marketing Kit"

---

## Before Upload Checklist

### Graphics
- [ ] Feature graphic (1024x500) created
- [ ] At least 2 screenshots created (max 8)
- [ ] All images tested on different screen sizes
- [ ] No pixelation or compression artifacts

### Text
- [ ] App name finalized (MediRemind - Medicine Reminder)
- [ ] Short description under 80 characters
- [ ] Full description under 4000 characters
- [ ] No copyrighted material in screenshots

### Legal
- [ ] Privacy Policy hosted online
- [ ] Privacy Policy URL added to listing
- [ ] Terms of Service created (if needed)
- [ ] Contact email verified

---

## Quick Screenshot Mockup Template

```
+---------------------+
│ Never miss a dose   │  ← Title bar (white text on brand color)
│                     │
│   ┌─────────────┐   │
│   │             │   │
│   │  [APP UI]   │   │  ← Screenshot content
│   │             │   │
│   │             │   │
│   └─────────────┘   │
│                     │
│   Phone frame or    │
│   clean edges       │
+---------------------+
```

---

## Next Steps

1. **Create Feature Graphic** - Use Canva with 1024x500 template
2. **Capture Screenshots** - Use emulator or real device with screen recording
3. **Host Privacy Policy** - Upload `docs/PRIVACY_POLICY.md` to your website
4. **Create Play Console Account** - If not already done
5. **Upload Assets** - Add all assets to Play Console
6. **Complete Listing** - Fill in all descriptions and categories

---

**Design Tip:** Keep your branding consistent! Use the same colors (#E6F4FE blue), fonts, and style across all assets.
