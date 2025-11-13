# EmailJS 400 Error Troubleshooting Guide

## The Problem
You're getting a `400 Bad Request` error when trying to send verification emails during signup, even though you've verified your configuration.

## Most Common Cause
**The verification email template ID doesn't exist in your EmailJS service.**

You're using **TWO separate EmailJS services**:
- **`service_m3bzszx`** - for verification and password reset emails
- **`service_i17lsmg`** - for booking confirmation and cancellation emails
- Public Key: `Vy3E5HLPceR3d0Pmy`

**IMPORTANT**: Verification and password reset templates must be in `service_m3bzszx`, NOT `service_i17lsmg`!

## Solution Steps

### Step 1: Check Your EmailJS Dashboard
1. Go to https://dashboard.emailjs.com/admin/template
2. Find your **verification email template**
3. **CRITICAL**: Make sure it's in the **`service_m3bzszx`** service (NOT `service_i17lsmg`)
4. Copy the **Template ID** (it should look like `template_xxxxxxx`)
5. Do the same for your password reset template

### Step 2: Update Your Environment Variables
Create or update your `.env` file in the project root:

```env
# EmailJS Configuration - TWO SEPARATE SERVICES
# Auth service: for verification and password reset
VITE_EMAILJS_AUTH_SERVICE_ID=service_m3bzszx
# Booking service: for booking confirmation and cancellation
VITE_EMAILJS_BOOKING_SERVICE_ID=service_i17lsmg
VITE_EMAILJS_PUBLIC_KEY=Vy3E5HLPceR3d0Pmy

# Email Templates - IMPORTANT: Use template IDs from the correct service
# These templates must be in service_m3bzszx:
VITE_EMAILJS_VERIFY_TEMPLATE_ID=template_YOUR_VERIFICATION_TEMPLATE_ID_HERE
VITE_EMAILJS_RESET_TEMPLATE_ID=template_YOUR_RESET_TEMPLATE_ID_HERE

# These templates must be in service_i17lsmg:
VITE_EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID=template_sl3wzej
VITE_EMAILJS_CANCELLATION_TEMPLATE_ID=template_v7z3kcj

# Support Email
VITE_SUPPORT_EMAIL=support@getaways.com
```

### Step 3: Verify Template Configuration
In your EmailJS verification template, make sure:

1. **"To Email" field** is set to: `{{to_email}}`
2. **Template is active** (not archived)
3. **Template is in the correct service** (`service_m3bzszx` for auth emails, `service_i17lsmg` for booking emails)
4. **All required template variables are defined**:
   - `{{to_email}}` - Recipient email (REQUIRED)
   - `{{to_name}}` - Recipient name
   - `{{verification_link}}` - Verification link
   - `{{user_name}}` - Full name
   - `{{first_name}}` - First name
   - `{{last_name}}` - Last name
   - `{{app_name}}` - App name
   - `{{support_email}}` - Support email
   - `{{logo_url}}` - Logo URL (optional)

### Step 4: Check Allowed Origins
1. Go to https://dashboard.emailjs.com/admin/integration
2. Find **BOTH services**:
   - `service_m3bzszx` (for auth emails)
   - `service_i17lsmg` (for booking emails)
3. Under **"Allowed Origins"** for EACH service, make sure your website URL is added
   - For local development: `http://localhost:5173` (or your dev port)
   - For production: `https://yourdomain.com`
4. Click **Save** for each service

### Step 5: Restart Your Dev Server
After updating `.env`:
1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev` or `vite`
3. Clear browser cache (Ctrl+Shift+Delete)

### Step 6: Test the Template
1. Go to your EmailJS template
2. Click **"Test"** button
3. Fill in test values:
   - `to_email`: your-test-email@gmail.com
   - `to_name`: Test User
   - `verification_link`: https://yourdomain.com/verify-email?token=test123
   - etc.
4. Send test email
5. If test fails, check the error message

## Debugging

### Check Browser Console
After trying to sign up, check the browser console for:
- `📧 EmailJS Configuration:` - Shows what values are being used
- `❌ Error sending verification email:` - Shows the actual error
- `❌ EmailJS error response:` - Shows detailed error from EmailJS

### Common Error Messages

**"Template not found"**
- Template ID doesn't exist in the service
- Solution: Use the correct template ID from your service

**"Service not found"**
- Service ID is wrong
- Solution: Verify service ID in EmailJS dashboard

**"Invalid public key"**
- Public key is incorrect
- Solution: Copy public key from EmailJS dashboard

**"Origin not allowed"**
- Your website URL isn't in allowed origins
- Solution: Add your URL to allowed origins

## Still Not Working?

1. **Double-check template ID**: 
   - Verification/password reset templates must exist in `service_m3bzszx`
   - Booking templates must exist in `service_i17lsmg`
2. **Test template directly**: Use EmailJS dashboard test feature for each template
3. **Check EmailJS status**: https://status.emailjs.com/
4. **Contact EmailJS support**: They can check their logs for your specific error

## Quick Checklist

- [ ] Verification template exists in `service_m3bzszx` (NOT `service_i17lsmg`)
- [ ] Password reset template exists in `service_m3bzszx`
- [ ] Booking templates exist in `service_i17lsmg`
- [ ] Template IDs are correct in `.env` file
- [ ] Both service IDs are set in `.env`:
  - `VITE_EMAILJS_AUTH_SERVICE_ID=service_m3bzszx`
  - `VITE_EMAILJS_BOOKING_SERVICE_ID=service_i17lsmg`
- [ ] "To Email" field uses `{{to_email}}`
- [ ] Allowed origins includes your website URL for BOTH services
- [ ] Dev server restarted after `.env` changes
- [ ] Browser cache cleared
- [ ] Template test works in EmailJS dashboard

