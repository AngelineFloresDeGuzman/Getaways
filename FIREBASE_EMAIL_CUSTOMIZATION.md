# Customize Firebase Password Reset Email (No Cloud Functions)

Since you don't want to use Cloud Functions, Firebase will send the password reset email directly. However, you can still customize it!

## How to Customize Firebase Password Reset Email

### Step 1: Go to Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project: **getaways-official**
3. Click on **Authentication** in the left menu
4. Click on **Templates** tab
5. Click on **Password reset** template

### Step 2: Customize the Email Template

You can customize:
- **Subject**: Change the email subject line
- **Body**: Customize the HTML email content
- **Action URL**: Already set to your app's reset-password page

### Step 3: Available Variables

Firebase provides these variables you can use:
- `%LINK%` - The password reset link (contains oobCode)
- `%EMAIL%` - User's email address
- `%DISPLAY_NAME%` - User's display name (if available)

### Step 4: Example Custom Template

**Subject:**
```
Reset Your Getaways Password
```

**Body HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; }
    .logo { text-align: center; margin-bottom: 30px; }
    h1 { color: #333; margin-bottom: 20px; }
    p { color: #666; line-height: 1.6; }
    .button { display: inline-block; padding: 14px 28px; background-color: #YOUR_PRIMARY_COLOR; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="YOUR_LOGO_URL" alt="Getaways" style="max-width: 200px;" />
    </div>
    <h1>Reset Your Getaways Password</h1>
    <p>Hi %DISPLAY_NAME%,</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="%LINK%" class="button">Reset Password</a>
    </p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #999; font-size: 12px;">%LINK%</p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, please ignore this email.</p>
    <div class="footer">
      <p>For support, contact us at support@getaways.com</p>
      <p>&copy; 2024 Getaways. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

### Step 5: Save and Test

1. Click **Save** after customizing
2. Test by clicking "Forgot Password" in your app
3. Check your email - it should now have your custom branding!

## Limitations

⚠️ **Note**: Without Cloud Functions, you cannot:
- Use EmailJS for password reset emails
- Get the reset link to send via a custom service
- Fully customize the email delivery method

However, Firebase's email templates are quite flexible and allow:
- ✅ Custom HTML/CSS styling
- ✅ Your logo and branding
- ✅ Custom subject and body text
- ✅ Variables for dynamic content

## Current Setup

Your app now:
1. ✅ Uses Firebase's `sendPasswordResetEmail()` - sends email directly
2. ✅ ResetPassword page handles `oobCode` from Firebase's email link
3. ✅ Uses `confirmPasswordReset()` to reset password - no backend needed!

This is the simplest approach that works entirely client-side with Firebase Authentication.

