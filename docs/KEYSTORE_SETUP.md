# Production Keystore Setup Guide for Play Store

This guide will help you generate a production keystore for signing your Android app for release on the Google Play Store.

## Why You Need a Production Keystore

- The debug keystore is for development only and **cannot** be used for Play Store
- Play Store requires apps signed with a production certificate
- **IMPORTANT:** Once you upload an app signed with a keystore, you must use the **same keystore** for all future updates
- Keep your keystore file and passwords secure and backed up

## Step 1: Generate Production Keystore

Run the following command in your project root:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/release.keystore \
  -alias mediremind-release -keyalg RSA -keysize 2048 -validity 10000
```

You will be prompted to enter:
1. **Keystore password** - Create a strong password and **save it securely**
2. **Key password** - Use the same password as the keystore (recommended)
3. **Your details**: First/Last name, Organization, City, State, Country code

**Example responses:**
```
Enter keystore password: [your-password]
Re-enter new password: [your-password]
What is your first and last name?
  [Unknown]:  FlowenTech
What is the name of your organizational unit?
  [Unknown]:  Development
What is the name of your organization?
  [Unknown]:  FlowenTech
What is the name of your City or Locality?
  [Unknown]:  [Your City]
What is the name of your State or Province?
  [Unknown]:  [Your State]
What is the two-letter country code for this unit?
  [Unknown]:  US
Is CN=FlowenTech, OU=Development, O=FlowenTech, L=[City], ST=[State], C=US correct?
  [no]:  yes
```

## Step 2: Store Keystore Passwords Securely

Create a file to store keystore properties (this file is git-ignored):

```bash
# Create the keystore properties file
cat > android/keystore.properties << 'EOF'
STORE_FILE=release.keystore
KEY_ALIAS=mediremind-release
STORE_PASSWORD=your-keystore-password-here
KEY_PASSWORD=your-keystore-password-here
EOF
```

**IMPORTANT:** `android/keystore.properties` is in `.gitignore` - never commit this file!

## Step 3: Verify Setup

The `build.gradle` file has been updated to read from `keystore.properties`. Make sure:

1. ✅ `android/app/release.keystore` exists
2. ✅ `android/keystore.properties` exists with correct passwords
3. ✅ `.gitignore` contains `*.keystore` and `keystore.properties`

## Step 4: Build Release APK/AAB

Once configured, build your release bundle:

```bash
# Build Android App Bundle (AAB) - Required for Play Store
cd android && ./gradlew bundleRelease

# OR build APK (for testing)
cd android && ./gradlew assembleRelease
```

The output will be in:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

## Step 5: Upload to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing app
3. Go to **Setup → App integrity**
4. Upload your AAB file
5. Choose your signing option:
   - **App signing by Google Play** (Recommended) - Google manages your key
   - **Manage your own signing keys** - You manage the key

## ⚠️ CRITICAL WARNINGS

1. **NEVER lose your keystore file** - If lost, you cannot update your app
2. **Back up your keystore** in multiple secure locations
3. **Document your passwords** in a secure password manager
4. **Same keystore forever** - Always use the same keystore for updates
5. **Never commit keystore** - It's already in `.gitignore`

## Keystore File Locations

| File | Location | Status |
|------|----------|--------|
| Release Keystore | `android/app/release.keystore` | Generate this |
| Keystore Properties | `android/keystore.properties` | Create this |
| Git Ignore | `.gitignore` | Already configured |

## Troubleshooting

### "Keystore file not found"
- Make sure `release.keystore` is in `android/app/` directory
- Check `keystore.properties` path is correct

### "Incorrect keystore password"
- Verify passwords in `keystore.properties` match what you set
- Make sure no extra spaces in the file

### Build fails in CI/CD
- Set environment variables for CI:
  - `KEYSTORE_PASSWORD`
  - `KEY_PASSWORD`
  - Update build.gradle to read from env vars if needed

---

**After completing these steps, your app will be ready for Play Store upload!**
