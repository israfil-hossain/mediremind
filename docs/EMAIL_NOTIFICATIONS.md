# Email Notifications Setup

MediRemind uses [Resend](https://resend.com) to send email notifications to family members when a patient misses their medication.

## Features

- **Automated Alerts**: Family members receive email notifications when medication is missed by more than 30 minutes
- **Family Care Integration**: Only active for users with Family Care subscription
- **Customizable**: Each family profile can have an optional email address
- **Beautiful Emails**: HTML-formatted emails with medication details and patient information

## Setup Instructions

### 1. Create a Resend Account

1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day on free plan)
3. Verify your email address

### 2. Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "MediRemind Production")
5. Copy the API key (starts with `re_`)

### 3. Configure Domain (Optional but Recommended)

For production use, you should configure your own domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Add your domain (e.g., `mediremind.flowentech.com`)
4. Follow the DNS configuration instructions
5. Wait for domain verification (usually takes a few minutes)

### 4. Add API Key to Your App

Add the Resend API key to your `.env` file:

\`\`\`env
RESEND_API_KEY=re_your_actual_api_key_here
\`\`\`

**Important**:
- Never commit your `.env` file to version control
- The API key is only used server-side and is not exposed to the client

### 5. Update Email Sender

If you configured a custom domain, update the sender email in:

`utils/emailNotifications.ts`:

\`\`\`typescript
from: "MediRemind <notifications@yourdomain.com>",
\`\`\`

## How It Works

### Monitoring Service

When a user signs in with Family Care subscription:

1. **Medication Monitoring Starts**: The app checks for missed medications every 30 minutes
2. **Detection Logic**: If a medication is scheduled and not taken within 30 minutes of the scheduled time
3. **Email Sent**: All family members with email addresses receive an alert

### Email Content

Each email includes:
- Patient name
- Medication name and dosage
- Scheduled time
- Date of missed dose
- Link to open the app

### Manual Testing

You can manually trigger a missed medication alert for testing:

\`\`\`typescript
import { sendMissedMedicationAlert } from '../utils/medicationMonitoring';

// Send test alert
await sendMissedMedicationAlert('medication-id', '09:00 AM');
\`\`\`

## Email Limits

### Resend Free Plan
- 100 emails per day
- 3,000 emails per month
- Perfect for testing and small deployments

### Resend Pro Plan ($20/month)
- 50,000 emails per month
- Custom domains
- Better deliverability
- Priority support

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Ensure `RESEND_API_KEY` is correctly set in `.env`
2. **Check Console Logs**: Look for error messages in the app logs
3. **Verify Email Addresses**: Make sure family profiles have valid email addresses
4. **Check Subscription**: Ensure user has Family Care subscription
5. **Check Resend Dashboard**: View logs and delivery status in Resend

### Emails Going to Spam

1. Configure SPF, DKIM, and DMARC records for your domain
2. Use a verified domain instead of the default Resend domain
3. Ensure email content doesn't trigger spam filters
4. Ask recipients to add `notifications@yourdomain.com` to their contacts

### Email Not Received

1. Check the recipient's spam folder
2. Verify the email address is correct in the family profile
3. Check Resend dashboard for delivery status
4. Ensure the recipient's email server isn't blocking Resend

## Privacy & Security

- Email addresses are stored locally and in Firestore (user's own data)
- Only family members within the same Family Care group receive notifications
- No email addresses are shared with third parties
- Emails are sent via Resend's secure infrastructure
- API key is stored server-side only (not exposed to client)

## Development Mode

During development with `EXPO_PUBLIC_DEV_IS_PREMIUM=true`:
- Family Care features are enabled automatically
- Medication monitoring starts immediately
- Test emails can be sent to verify setup
- Use test email addresses for safety

## Cost Estimate

For a typical family (5 members):
- If 1 medication is missed per day: ~30 emails/month
- If 3 medications missed per day: ~90 emails/month
- Well within free tier limits for most users

For larger deployments:
- 1,000 active families with average 2 missed meds/week: ~8,000 emails/month
- Would need Resend Pro plan ($20/month)

## Next Steps

1. ✅ Set up Resend account
2. ✅ Add API key to `.env`
3. ✅ Configure custom domain (optional)
4. ✅ Test with family profiles
5. ✅ Monitor email delivery in Resend dashboard

## Support

- Resend Documentation: [https://resend.com/docs](https://resend.com/docs)
- Resend Support: support@resend.com
- MediRemind Issues: [GitHub Issues](https://github.com/flowentech/mediremind/issues)
