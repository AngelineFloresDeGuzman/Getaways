# EmailJS Verification Checklist

## ✅ Configuration Status

### EmailJS Credentials
- ✅ Public Key: `1bELJwUeoejy0Q4cQ` (configured)
- ✅ Service ID: `service_m3bzszx` (configured)
- ✅ Verification Template ID: `template_qo9q8de` (configured)
- ✅ Reset Template ID: `template_qo9q8de` (configured - same as verification)

### Code Fixes Applied
- ✅ EmailJS initialization fixed
- ✅ Firestore Timestamp handling fixed
- ✅ Error logging improved
- ✅ Validation checks added

## ⚠️ Important: Firestore Security Rules

You need to update your Firestore security rules to allow token creation and reading. Add these rules:

```javascript
match /verificationTokens/{tokenId} {
  // Allow creation when user is authenticated (during signup)
  allow create: if request.auth != null;
  // Allow reading for token verification (no auth needed for verification)
  allow read: if true; // Token verification needs to work without auth
  // Allow update to mark token as used
  allow update: if true; // Token verification needs to work without auth
}

match /passwordResetTokens/{tokenId} {
  // Allow creation when user is authenticated OR when creating reset token
  allow create: if true; // Password reset can be requested without being logged in
  // Allow reading for token verification
  allow read: if true; // Token verification needs to work without auth
  // Allow update to mark token as used
  allow update: if true; // Token verification needs to work without auth
}
```

## 📧 Email Template Variables

### Verification Email Template (`template_qo9q8de`)
Make sure your EmailJS template includes these variables:
- `{{to_name}}` - User's first name
- `{{to_email}}` - User's email address
- `{{first_name}}` - User's first name
- `{{last_name}}` - User's last name
- `{{verification_link}}` - Link to verify email (e.g., `https://yoursite.com/verify-email?token=...`)
- `{{app_name}}` - Application name (Getaways)

**Example Template:**
```
Subject: Verify Your Getaways Account

Hi {{to_name}},

Welcome to {{app_name}}! Please verify your email address by clicking the link below:

{{verification_link}}

If you didn't create an account, please ignore this email.

Thanks,
The {{app_name}} Team
```

### Password Reset Email Template (`template_qo9q8de`)
Since you're using the same template ID, make sure it can handle both verification and reset, OR create a separate template.

Variables needed:
- `{{to_name}}` - User's first name
- `{{to_email}}` - User's email address
- `{{reset_link}}` - Link to reset password (e.g., `https://yoursite.com/reset-password?token=...`)
- `{{app_name}}` - Application name (Getaways)

**Example Template:**
```
Subject: Reset Your Getaways Password

Hi {{to_name}},

You requested to reset your password. Click the link below to reset it:

{{reset_link}}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Thanks,
The {{app_name}} Team
```

## 🧪 Testing Steps

### 1. Test Email Verification
1. Sign up a new user
2. Check browser console for: "Sending verification email with params..."
3. Check EmailJS dashboard for sent emails
4. Check user's email inbox
5. Click verification link
6. Should redirect to `/verify-email?token=...`
7. Should show success message

### 2. Test Password Reset
1. Go to login page
2. Click "Forgot password?"
3. Enter email address
4. Check browser console for: "Sending password reset email with params..."
5. Check EmailJS dashboard for sent emails
6. Check user's email inbox
7. Click reset link
8. Should redirect to `/reset-password?token=...`
9. Should show password reset form

## 🔍 Debugging

If emails aren't sending, check:

1. **Browser Console** - Look for error messages
2. **EmailJS Dashboard** - Check logs at https://dashboard.emailjs.com/admin/logs
3. **Template Variables** - Ensure variable names match exactly (case-sensitive)
4. **Service Configuration** - Verify service is connected and active
5. **Firestore Rules** - Ensure tokens can be created/read
6. **Network Tab** - Check for failed API requests

## ⚠️ Known Issues

1. **Password Reset Backend**: Password reset requires a backend endpoint to actually update the password (Firebase limitation). The token verification works, but password update needs Admin SDK.

2. **Same Template ID**: Both verification and reset use `template_qo9q8de`. Consider creating separate templates for better customization.

3. **Token Expiration**: 
   - Verification tokens expire in 24 hours
   - Reset tokens expire in 1 hour

## ✅ Ready to Test

The code is now configured and should work. Test by:
1. Creating a new account
2. Requesting a password reset

Check the browser console for detailed logs of the email sending process.

