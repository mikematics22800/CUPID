# Twilio SMS Setup Guide for CUPID App

## Issue Description
You're encountering a Twilio authentication error (Error 20003) when trying to send OTP codes for phone login. This indicates that your Twilio account is not properly configured in Supabase.

## Solution Steps

### 1. Check Your Supabase Project Settings

1. **Go to your Supabase Dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Sign in to your account
   - Select your CUPID project

2. **Navigate to Authentication Settings**
   - Go to **Authentication** → **Settings**
   - Scroll down to **SMS Provider** section

3. **Configure Twilio Settings**
   - **SMS Provider**: Select "Twilio"
   - **Account SID**: Enter your Twilio Account SID
   - **Auth Token**: Enter your Twilio Auth Token
   - **Message Service ID** (optional): Enter your Twilio Messaging Service SID

### 2. Get Your Twilio Credentials

If you don't have a Twilio account or credentials:

1. **Create a Twilio Account**
   - Go to [twilio.com](https://twilio.com)
   - Sign up for a free account
   - Verify your email and phone number

2. **Get Your Credentials**
   - Go to **Console** → **Dashboard**
   - Copy your **Account SID** and **Auth Token**
   - These are found in the "Account Info" section

3. **Get a Phone Number** (Optional but Recommended)
   - Go to **Phone Numbers** → **Manage** → **Buy a number**
   - Purchase a phone number for SMS capabilities
   - This is required for production use

### 3. Alternative: Use Email-Only Authentication

If you want to temporarily disable phone authentication:

1. **In Supabase Dashboard**
   - Go to **Authentication** → **Settings**
   - Under **SMS Provider**, select "None"
   - Save changes

2. **Update Your App**
   - The phone login button will still work but will show an error
   - Users can still register and login with email

### 4. Test Your Configuration

1. **Restart Your App**
   ```bash
   npx expo start --clear
   ```

2. **Test Phone Login**
   - Try logging in with a valid phone number
   - Check the console for any error messages
   - Verify that the phone number is properly formatted

### 5. Common Issues and Solutions

#### Issue: "Error 20003 - Authenticate"
- **Cause**: Invalid Twilio credentials
- **Solution**: Double-check your Account SID and Auth Token in Supabase

#### Issue: "Phone number format invalid"
- **Cause**: Phone number not in international format
- **Solution**: Ensure phone numbers start with country code (e.g., +1 for US)

#### Issue: "Rate limit exceeded"
- **Cause**: Too many SMS attempts
- **Solution**: Wait a few minutes before trying again

#### Issue: "Insufficient credits"
- **Cause**: Twilio account has no credits
- **Solution**: Add credits to your Twilio account

### 6. Environment Variables (Optional)

If you want to configure Twilio credentials via environment variables:

1. **Create/Update your `.env` file**:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   ```

2. **Note**: Supabase handles Twilio configuration server-side, so these environment variables are mainly for reference.

### 7. Production Considerations

For production deployment:

1. **Use a Dedicated Twilio Phone Number**
   - Purchase a dedicated number for your app
   - Configure it in your Twilio console

2. **Set Up Webhooks** (Optional)
   - Configure webhooks for delivery status
   - Monitor SMS delivery success rates

3. **Implement Rate Limiting**
   - Add client-side rate limiting
   - Prevent abuse of SMS functionality

### 8. Troubleshooting

If you're still having issues:

1. **Check Supabase Logs**
   - Go to **Logs** in your Supabase dashboard
   - Look for authentication-related errors

2. **Verify Twilio Account Status**
   - Ensure your Twilio account is active
   - Check for any account restrictions

3. **Test with Different Phone Numbers**
   - Try with verified phone numbers
   - Test with different country codes

4. **Contact Support**
   - If issues persist, contact Supabase support
   - Provide error logs and configuration details

## Quick Fix Summary

1. **Immediate Fix**: Configure Twilio credentials in Supabase Authentication settings
2. **Alternative**: Disable SMS provider and use email-only authentication
3. **Long-term**: Set up proper Twilio account with dedicated phone number

The updated code now includes better error handling and phone number formatting to help prevent these issues in the future. 