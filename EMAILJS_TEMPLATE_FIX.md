# Fix: "The recipients address is empty" Error

## Problem
EmailJS is returning error 422: "The recipients address is empty" because the template's "To Email" field is not configured correctly.

## Solution: Configure EmailJS Template

### Step 1: Go to EmailJS Template Settings
1. Go to https://dashboard.emailjs.com/admin/template
2. Click on your verification template (`template_qo9q8de`)
3. Look for the **"To Email"** field (usually at the top of the template editor)

### Step 2: Set the "To Email" Field
In the **"To Email"** field, enter:
```
{{to_email}}
```

**Important:** This field is separate from the email body content. It's a configuration field that tells EmailJS where to send the email.

### Step 3: Do the Same for Password Reset Template
1. Go to your password reset template (`template_btqnqws`)
2. Set the **"To Email"** field to:
```
{{to_email}}
```

### Step 4: Save the Templates
Click "Save" on both templates.

## Alternative: Check Template Configuration

If you don't see a "To Email" field, your email service might be configured differently:

1. Go to https://dashboard.emailjs.com/admin/integration
2. Click on your service (`service_m3bzszx`)
3. Check if there's a "Default To Email" setting
4. If there is, make sure it's set to use a template variable or leave it empty to use `{{to_email}}` from template params

## Verification

After configuring:
1. The "To Email" field should show `{{to_email}}`
2. When you send a test email, it should use the email from `templateParams.to_email`
3. The error should be resolved

## Code Already Fixed

The code has been updated to:
- ✅ Validate email before sending
- ✅ Trim whitespace from email
- ✅ Add better error logging
- ✅ Pass `to_email` correctly in templateParams

The issue is purely a template configuration problem in the EmailJS dashboard.

