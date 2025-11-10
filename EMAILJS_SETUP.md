# EmailJS Setup Guide

This application uses EmailJS for sending custom email verification and password reset emails.

## Setup Steps

### 1. Create EmailJS Account
1. Go to https://www.emailjs.com/ and create a free account
2. Verify your email address

### 2. Add Email Service
1. Go to https://dashboard.emailjs.com/admin/integration
2. Add an email service (Gmail, Outlook, etc.)
3. Follow the setup instructions for your email provider
4. Copy your **Service ID**

### 3. Create Email Templates

#### Verification Email Template
1. Go to https://dashboard.emailjs.com/admin/template
2. Create a new template named "Email Verification"
3. Use these template variables:
   - `{{to_name}}` - User's first name
   - `{{to_email}}` - User's email address
   - `{{first_name}}` - User's first name
   - `{{last_name}}` - User's last name
   - `{{verification_link}}` - Link to verify email
   - `{{app_name}}` - Application name (Getaways)

Example template:
```
Subject: Verify Your Getaways Account

Hi {{to_name}},

Welcome to {{app_name}}! Please verify your email address by clicking the link below:

{{verification_link}}

If you didn't create an account, please ignore this email.

Thanks,
The {{app_name}} Team
```

4. Copy the **Template ID**

#### Password Reset Email Template
1. Create another template named "Password Reset"
2. Use these template variables:
   - `{{to_name}}` - User's first name
   - `{{to_email}}` - User's email address
   - `{{reset_link}}` - Link to reset password
   - `{{app_name}}` - Application name (Getaways)

Example template:
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

3. Copy the **Template ID**

### 4. Get Public Key
1. Go to https://dashboard.emailjs.com/admin/account/general
2. Copy your **Public Key**

### 5. Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in your EmailJS credentials:
   ```
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   VITE_EMAILJS_VERIFY_TEMPLATE_ID=your_verify_template_id
   VITE_EMAILJS_RESET_TEMPLATE_ID=your_reset_template_id
   ```

### 6. Firestore Security Rules
Add these collections to your Firestore security rules:

```javascript
match /verificationTokens/{tokenId} {
  allow create: if request.auth != null;
  allow read, update: if request.auth != null;
}

match /passwordResetTokens/{tokenId} {
  allow create: if request.auth != null;
  allow read, update: if request.auth != null;
}
```

## Password Reset Backend Requirement

**Important**: Password reset functionality requires a backend endpoint because Firebase Auth requires authentication to update passwords. You have two options:

### Option 1: Firebase Cloud Function (Recommended)
Create a Cloud Function that uses Firebase Admin SDK to update passwords:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.resetPassword = functions.https.onCall(async (data, context) => {
  const { token, newPassword } = data;
  
  // Verify token (use your verifyPasswordResetToken function)
  // Update password using Admin SDK
  await admin.auth().updateUser(userId, { password: newPassword });
  
  return { success: true };
});
```

### Option 2: Custom Backend API
Create a REST API endpoint that:
1. Verifies the token
2. Uses Firebase Admin SDK to update the password
3. Marks the token as used

Then update `src/pages/Auth/ResetPassword.jsx` to call your API endpoint instead of the TODO comment.

## Testing

1. Sign up a new user - verification email should be sent via EmailJS
2. Click the verification link - should verify email successfully
3. Request password reset - reset email should be sent via EmailJS
4. Click reset link - should show password reset form (backend integration needed for actual reset)

## Troubleshooting

- **Emails not sending**: Check EmailJS dashboard for errors
- **Template variables not working**: Ensure variable names match exactly (case-sensitive)
- **Token verification failing**: Check Firestore security rules and token expiration
- **Password reset not working**: Implement backend endpoint as described above

