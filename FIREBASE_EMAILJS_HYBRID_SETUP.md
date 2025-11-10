# Firebase + EmailJS Hybrid Password Reset Setup

## Overview

This setup combines Firebase Authentication (for secure password reset) with EmailJS (for custom branded emails).

**How it works:**
1. ✅ Firebase generates the secure password reset link (using Admin SDK)
2. ✅ EmailJS sends your custom branded email with that link
3. ✅ User clicks link → Firebase validates and resets password
4. ✅ No Cloud Functions needed for password reset logic!

## Step 1: Deploy Cloud Function

You need ONE minimal Cloud Function to generate the reset link:

### 1.1 Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
firebase login
```

### 1.2 Initialize Functions (if not already done)
```bash
cd functions
npm install
```

### 1.3 Deploy the Function
```bash
firebase deploy --only functions
```

The function `generatePasswordResetLink` will be deployed and available.

## Step 2: Update EmailJS Template

In your EmailJS password reset template (`template_btqnqws`):

1. Use `{{reset_link}}` in your email HTML
2. The link will look like: `https://your-domain.com/reset-password?oobCode=...&mode=resetPassword`
3. Make sure the "To Email" field uses `{{to_email}}`

Example template HTML:
```html
<a href="{{reset_link}}" style="...">Reset Password</a>
```

## Step 3: How It Works

### Flow:
1. **User clicks "Forgot Password"**
   - Code calls Cloud Function `generatePasswordResetLink`
   - Function uses Firebase Admin SDK to generate secure reset link
   - Link contains `oobCode` parameter

2. **EmailJS sends custom email**
   - Reset link is passed to EmailJS template as `{{reset_link}}`
   - Your custom branded email is sent

3. **User clicks link**
   - ResetPassword page extracts `oobCode` from URL
   - Uses Firebase's `confirmPasswordReset()` to reset password
   - No backend needed - works entirely client-side!

## Step 4: Testing

1. Click "Forgot Password" in login
2. Check console logs:
   - ✅ Reset link generated
   - ✅ Email sent via EmailJS
3. Check email inbox
4. Click reset link
5. Enter new password
6. Password is reset!

## Troubleshooting

### Error: "functions/not-found"
- **Fix**: Deploy the Cloud Function: `firebase deploy --only functions`

### Error: "Invalid reset link"
- **Fix**: Make sure EmailJS template uses `{{reset_link}}` exactly (not modified)

### Reset link doesn't work
- **Fix**: Check that ResetPassword.jsx extracts `oobCode` from URL correctly

## Benefits

✅ **Secure**: Firebase handles all password reset logic  
✅ **Custom**: EmailJS sends your branded email  
✅ **Simple**: Only one small Cloud Function needed  
✅ **No Backend**: Password reset itself works client-side  

## Files Changed

- `functions/index.js` - Cloud Function to generate reset link
- `src/pages/Auth/LogIn.jsx` - Calls function, sends via EmailJS
- `src/lib/emailService.js` - Updated to accept Firebase reset link
- `src/pages/Auth/ResetPassword.jsx` - Already uses Firebase's `confirmPasswordReset()`

