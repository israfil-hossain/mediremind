# Family Care Email Notifications

## Overview

MediRemind's Family Care feature includes automated email notifications to ensure medication adherence and provide peace of mind for caregivers.

## How It Works

### Automated Monitoring
- **Continuous Monitoring**: The app checks for missed medications every 30 minutes when Family Care is active
- **Smart Detection**: Identifies when a scheduled medication is not taken within 30 minutes of the scheduled time
- **Instant Alerts**: Sends professional email notifications to all family members with configured email addresses

### Who Gets Notified?
- **All Family Members**: Any family member profile with an email address will receive notifications
- **Excluding the Patient**: The patient's own email (if configured) will not receive alerts about their own missed medications
- **Multiple Recipients**: All eligible family members receive the same alert simultaneously

## Email Content

Each notification email includes:

- **Patient Information**: Name of the family member who missed the medication
- **Medication Details**: Name and dosage
- **Schedule Information**: Scheduled time and date
- **Professional Formatting**: Clean, easy-to-read HTML email with MediRemind branding
- **Quick Action**: Link to open the app

### Email Example

```
Subject: ⚠️ Missed Medication Alert: John Doe

Patient: John Doe
Medication: Aspirin 100mg
Scheduled Time: 9:00 AM
Date: January 26, 2026

John Doe has not taken their medication Aspirin that was
scheduled for 9:00 AM.

Please check in with them to ensure they take their medication
as prescribed.

[Open MediRemind App]
```

## Where You'll See Information About This Feature

### 1. Family Profiles Page (`/settings/family`)

**Info Card** - Displayed at the top of the family members list:
> 📧 **Email Notifications**
>
> Family members with an email address will receive automated alerts when a medication dose is missed by more than 30 minutes. This helps ensure medication adherence and peace of mind for caregivers.

**Email Input Field** - When adding/editing a family member:
> ℹ️ This family member will receive automated email alerts when a medication is missed by more than 30 minutes

### 2. Family Care Dashboard (`History` tab when Premium)

**Info Card** - Displayed in the overview section:
> 📧 **Automated Care Alerts**
>
> Family members with email addresses receive automatic notifications when medications are missed by more than 30 minutes, ensuring timely intervention and medication adherence.

## Setting Up Email Notifications

### For Family Members

1. **Go to Profile → Family Profiles**
2. **Add or Edit a Family Member**
3. **Enter Email Address** (optional field)
4. **Save the Profile**

That's it! The family member will now automatically receive email alerts for any missed medications.

### For Developers/Admins

See [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md) for complete setup instructions including:
- Resend account setup
- API key configuration
- Custom domain setup
- Troubleshooting

## Privacy & Data Protection

- **Secure Storage**: Email addresses are stored securely in the user's own Firestore database
- **No Third-Party Sharing**: Email addresses are never shared with third parties
- **User Control**: Users can add or remove email addresses at any time
- **GDPR Compliant**: Users have full control over their family member data
- **Encrypted Transit**: All emails sent via Resend's secure infrastructure

## Benefits

### For Patients
- **Safety Net**: Multiple people watching over medication adherence
- **Independence**: Still maintains control while having support
- **Peace of Mind**: Knowing family is notified if something is missed

### For Caregivers
- **Timely Alerts**: Immediate notification of missed medications
- **Remote Monitoring**: Stay informed even when not physically present
- **Intervention Opportunity**: Can follow up quickly to ensure medication is taken
- **Reduced Anxiety**: Automated monitoring means less constant worry

### For Families
- **Shared Responsibility**: Multiple family members can be involved in care
- **Better Communication**: Automated alerts facilitate important conversations
- **Improved Outcomes**: Higher medication adherence leads to better health outcomes

## Requirements

- ✅ **Family Care Subscription**: Required for email notifications feature
- ✅ **Email Addresses**: Family members must have valid email addresses configured
- ✅ **Internet Connection**: Required for sending emails (queued if offline)
- ✅ **Resend API Key**: Must be configured in `.env` (for production deployments)

## Limitations

- **Free Tier**: 100 emails per day via Resend free plan
- **30-Minute Threshold**: Notifications sent only after 30+ minutes of missed medication
- **Check Interval**: System checks every 30 minutes (not real-time)
- **Active App Required**: Monitoring runs while app is active (future: background push notifications)

## Future Enhancements

Planned improvements:
- 🔄 **Background Push Notifications**: Native push notifications even when app is closed
- 📱 **SMS Alerts**: Text message notifications as alternative to email
- ⏰ **Customizable Thresholds**: Configure how long to wait before sending alert
- 📊 **Alert History**: View history of sent notifications
- 🔕 **Quiet Hours**: Configure times when alerts should not be sent
- 👥 **Role-Based Alerts**: Primary vs. secondary caregivers receive different alert levels

## Support

If you have questions or issues with email notifications:

1. **Check Email Configuration**: Verify email addresses are correctly entered
2. **Check Spam Folder**: Alerts may be filtered to spam initially
3. **Verify Subscription**: Ensure Family Care is active
4. **Contact Support**: support@flowentech.com

---

**Note**: Email notifications are designed to supplement, not replace, proper medical care and supervision. Always consult healthcare professionals for medical advice.
