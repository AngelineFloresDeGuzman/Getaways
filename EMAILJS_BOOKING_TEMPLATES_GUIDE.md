# EmailJS Booking Email Templates Setup Guide

This guide will help you create the two EmailJS email templates for booking confirmations and cancellations.

## Prerequisites

1. You need an EmailJS account (https://www.emailjs.com/)
2. You need an email service connected (Gmail, Outlook, etc.)
3. Your EmailJS Service ID and Public Key should already be configured

## Template 1: Booking Success Confirmation Email

### Step 1: Create the Template

1. Go to https://dashboard.emailjs.com/admin/template
2. Click **"Create New Template"**
3. Name it: **"Booking Success Confirmation"**
4. Set the **Template ID** (copy this - you'll need it for your `.env` file)

### Step 2: Configure the Template

**Subject Line:**
```
Booking Confirmed - {{listing_title}} | Getaways
```

**To Email Field:**
```
{{to_email}}
```

**Template Content (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header with Logo -->
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="{{logo_url}}" alt="Getaways Logo" style="max-width: 150px; height: auto;">
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0;">Booking Confirmed! 🎉</h1>
    
    <p>Hi {{to_name}},</p>
    
    <p>Great news! Your booking has been confirmed. We're excited to host you!</p>
    
    <!-- Booking Details Box -->
    <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4CAF50;">
      <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Booking Details</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking ID:</td>
          <td style="padding: 8px 0;">{{booking_id}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Listing:</td>
          <td style="padding: 8px 0;">{{listing_title}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Check-in:</td>
          <td style="padding: 8px 0;">{{check_in_date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Check-out:</td>
          <td style="padding: 8px 0;">{{check_out_date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Guests:</td>
          <td style="padding: 8px 0;">{{guests}} guest(s)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Total Amount:</td>
          <td style="padding: 8px 0; font-size: 18px; color: #4CAF50; font-weight: bold;">{{total_price}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Payment Method:</td>
          <td style="padding: 8px 0;">{{payment_method}}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin-top: 20px;">Your booking is now pending host approval. You'll receive another email once the host confirms your booking.</p>
    
    <p><strong>What's next?</strong></p>
    <ul style="padding-left: 20px;">
      <li>Wait for host confirmation</li>
      <li>Check your booking status in your account</li>
      <li>Contact the host if you have any questions</li>
    </ul>
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
    <p>Need help? Contact us at <a href="mailto:{{support_email}}" style="color: #4CAF50;">{{support_email}}</a></p>
    <p style="margin-top: 10px;">© {{app_name}} - Your trusted travel companion</p>
  </div>
  
</body>
</html>
```

### Step 3: Available Variables

The following variables are available in this template:
- `{{to_email}}` - Guest's email address
- `{{to_name}}` - Guest's first name
- `{{user_name}}` - Guest's full name
- `{{first_name}}` - Guest's first name
- `{{last_name}}` - Guest's last name
- `{{booking_id}}` - Booking ID
- `{{listing_title}}` - Name of the accommodation/listing
- `{{check_in_date}}` - Check-in date (formatted)
- `{{check_out_date}}` - Check-out date (formatted)
- `{{guests}}` - Number of guests
- `{{total_price}}` - Total price (formatted as ₱X,XXX.XX)
- `{{booking_amount}}` - Booking amount (formatted as ₱X,XXX.XX)
- `{{payment_method}}` - Payment method (GetPay Wallet, GetPay Points, or PayPal)
- `{{app_name}}` - Application name (Getaways)
- `{{support_email}}` - Support email address
- `{{logo_url}}` - Logo image URL

---

## Template 2: Booking Cancellation Email

### Step 1: Create the Template

1. Go to https://dashboard.emailjs.com/admin/template
2. Click **"Create New Template"**
3. Name it: **"Booking Cancellation"**
4. Set the **Template ID** (copy this - you'll need it for your `.env` file)

### Step 2: Configure the Template

**Subject Line:**
```
Booking Cancelled - {{listing_title}} | Getaways
```

**To Email Field:**
```
{{to_email}}
```

**Template Content (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header with Logo -->
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="{{logo_url}}" alt="Getaways Logo" style="max-width: 150px; height: auto;">
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0;">Booking Cancelled</h1>
    
    <p>Hi {{to_name}},</p>
    
    <p>We've received your cancellation request for the following booking:</p>
    
    <!-- Booking Details Box -->
    <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ff9800;">
      <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Cancelled Booking Details</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking ID:</td>
          <td style="padding: 8px 0;">{{booking_id}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Listing:</td>
          <td style="padding: 8px 0;">{{listing_title}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Check-in:</td>
          <td style="padding: 8px 0;">{{check_in_date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Check-out:</td>
          <td style="padding: 8px 0;">{{check_out_date}}</td>
        </tr>
      </table>
    </div>
    
    <!-- Refund Information Box -->
    <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <h2 style="color: #856404; margin-top: 0; font-size: 18px;">Refund Information</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Refund Type:</td>
          <td style="padding: 8px 0; color: #856404;">{{refund_type}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Refund Amount:</td>
          <td style="padding: 8px 0; font-size: 18px; color: #856404; font-weight: bold;">{{refund_amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Refund Status:</td>
          <td style="padding: 8px 0; color: #856404;">{{refund_status}}</td>
        </tr>
      </table>
      
      <p style="margin-top: 15px; color: #856404; font-size: 14px;">
        {{#if refund_pending}}
        Your refund request has been submitted and is pending admin processing. You will receive another email once your refund has been processed.
        {{else}}
        {{#if refund_processed}}
        Your refund has been processed and should appear in your account within 5-7 business days.
        {{else}}
        No refund is applicable for this cancellation.
        {{/if}}
        {{/if}}
      </p>
    </div>
    
    <p style="margin-top: 20px;">We're sorry to see you cancel your booking. If you have any questions or need assistance, please don't hesitate to contact us.</p>
    
    <p><strong>What's next?</strong></p>
    <ul style="padding-left: 20px;">
      <li>Wait for refund processing (if applicable)</li>
      <li>Check your account for refund status updates</li>
      <li>Contact support if you have questions</li>
    </ul>
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
    <p>Need help? Contact us at <a href="mailto:{{support_email}}" style="color: #4CAF50;">{{support_email}}</a></p>
    <p style="margin-top: 10px;">© {{app_name}} - Your trusted travel companion</p>
  </div>
  
</body>
</html>
```

### Step 3: Available Variables

The following variables are available in this template:
- `{{to_email}}` - Guest's email address
- `{{to_name}}` - Guest's first name
- `{{user_name}}` - Guest's full name
- `{{first_name}}` - Guest's first name
- `{{last_name}}` - Guest's last name
- `{{booking_id}}` - Booking ID
- `{{listing_title}}` - Name of the accommodation/listing
- `{{check_in_date}}` - Check-in date (formatted)
- `{{check_out_date}}` - Check-out date (formatted)
- `{{refund_amount}}` - Refund amount (formatted as ₱X,XXX.XX)
- `{{refund_type}}` - Refund type (Full Refund, Half Refund, or No Refund)
- `{{refund_status}}` - Refund status (Pending Admin Processing, Processed, or Not Applicable)
- `{{app_name}}` - Application name (Getaways)
- `{{support_email}}` - Support email address
- `{{logo_url}}` - Logo image URL

---

## Step 4: Update Your Environment Variables

After creating both templates, add the Template IDs to your `.env` file:

```env
# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID=service_i17lsmg
VITE_EMAILJS_PUBLIC_KEY=Vy3E5HLPceR3d0Pmy

# Email Templates
VITE_EMAILJS_VERIFY_TEMPLATE_ID=template_qo9q8de
VITE_EMAILJS_RESET_TEMPLATE_ID=template_btqnqws
VITE_EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID=template_sl3wzej
VITE_EMAILJS_CANCELLATION_TEMPLATE_ID=template_v7z3kcj

# Support Email
VITE_SUPPORT_EMAIL=support@getaways.com

# Logo URL (optional - will use default if not set)
VITE_LOGO_URL=https://yourdomain.com/logo.jpg
```

## Step 5: Test Your Templates

1. Go to your EmailJS dashboard
2. Click on each template
3. Click "Test" button
4. Fill in test values for the variables
5. Send a test email to yourself
6. Verify the email looks correct

## Important Notes

1. **Logo URL**: Make sure your logo is hosted on a publicly accessible URL (not a local file). You can upload it to your website or use a CDN.

2. **Email Service**: Make sure your email service (Gmail, Outlook, etc.) is properly connected in EmailJS.

3. **Template Variables**: All variables are automatically populated by the code. You don't need to manually set them when sending emails.

4. **Styling**: The templates use inline CSS for better email client compatibility. You can customize colors and styles as needed.

5. **Testing**: Always test your templates before going live to ensure they display correctly in different email clients.

## Troubleshooting

- **Emails not sending**: Check that your EmailJS service is connected and active
- **Variables not showing**: Make sure variable names match exactly (case-sensitive)
- **Logo not displaying**: Verify the logo URL is publicly accessible
- **Formatting issues**: Some email clients don't support all CSS. Test in multiple clients.

