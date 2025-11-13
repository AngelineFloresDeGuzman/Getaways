# Cancellation Email Template Guide for EmailJS

## Template Variables Being Sent

Your code sends these variables to EmailJS. **ALL of these must be present in your EmailJS template** (even if you don't use them all):

1. `{{to_email}}` - Recipient email address
2. `{{to_name}}` - Recipient first name
3. `{{user_name}}` - Full name (first + last)
4. `{{first_name}}` - First name
5. `{{last_name}}` - Last name
6. `{{booking_id}}` - Booking ID
7. `{{listing_title}}` - Listing/Accommodation title
8. `{{check_in_date}}` - Check-in date
9. `{{check_out_date}}` - Check-out date
10. `{{refund_amount}}` - Refund amount (formatted as "PHP 0.00")
11. `{{refund_type}}` - Refund type ("Full Refund", "Half Refund", or "No Refund")
12. `{{refund_status}}` - Refund status ("Pending Admin Processing", "Processed", or "Not Applicable")
13. `{{refund_message}}` - Pre-formatted refund message (DO NOT use conditionals - this is already formatted)
14. `{{app_name}}` - App name ("Getaways")
15. `{{support_email}}` - Support email address
16. `{{logo_url}}` - Logo URL
17. `{{reply_to}}` - Reply-to email address

## ⚠️ CRITICAL RULES FOR EMAILJS TEMPLATES

1. **NO Handlebars Conditionals**: EmailJS does NOT support `{{#if}}`, `{{#unless}}`, `{{#each}}`, etc.
2. **Use Simple Variables Only**: Only use `{{variable_name}}` format
3. **All Variables Must Exist**: Every variable you use in the template must be sent from the code
4. **No Nested Curly Braces**: Don't use `{{{{variable}}}}` or any nested braces
5. **No Special Characters in Variable Names**: Only letters, numbers, and underscores

## ✅ CORRECTED EMAILJS TEMPLATE HTML

Copy this template into your EmailJS template editor:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Cancellation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
                <img src="{{logo_url}}" alt="{{app_name}}" style="max-width: 150px; height: auto;">
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 20px; background-color: #f4f4f4;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h1 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Booking Cancellation Confirmation</h1>
                            
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear {{first_name}},
                            </p>
                            
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                This email confirms that your booking has been cancelled.
                            </p>
                            
                            <div style="background-color: #f9f9f9; border-left: 4px solid #e74c3c; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                <h2 style="color: #333333; font-size: 18px; margin: 0 0 15px 0;">Booking Details</h2>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;"><strong>Booking ID:</strong></td>
                                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{booking_id}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Listing:</strong></td>
                                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{listing_title}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Check-in Date:</strong></td>
                                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{check_in_date}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Check-out Date:</strong></td>
                                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{check_out_date}}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="background-color: #f0f8ff; border-left: 4px solid #3498db; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                <h2 style="color: #333333; font-size: 18px; margin: 0 0 15px 0;">Refund Information</h2>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;"><strong>Refund Type:</strong></td>
                                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{refund_type}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Refund Amount:</strong></td>
                                        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">{{refund_amount}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Status:</strong></td>
                                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{refund_status}}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="background-color: #fff9e6; border-left: 4px solid #f39c12; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0;">
                                    <strong>Important:</strong> {{refund_message}}
                                </p>
                            </div>
                            
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 30px 0 20px 0;">
                                If you have any questions or concerns, please don't hesitate to contact our support team.
                            </p>
                            
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                                Best regards,<br>
                                <strong>The {{app_name}} Team</strong>
                            </p>
                            
                            <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                                For support, please contact us at: <a href="mailto:{{support_email}}" style="color: #3498db; text-decoration: none;">{{support_email}}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

## 📋 HOW TO UPDATE YOUR EMAILJS TEMPLATE

1. **Log into EmailJS Dashboard**: Go to https://dashboard.emailjs.com/
2. **Navigate to Email Templates**: Click on "Email Templates" in the left sidebar
3. **Find Your Cancellation Template**: Look for the template with ID matching `EMAILJS_CANCELLATION_TEMPLATE_ID` from your `.env` file
4. **Edit the Template**: Click on the template to edit it
5. **Replace the Content**: Copy the HTML template above and paste it into the template editor
6. **Save the Template**: Click "Save" to save your changes
7. **Test the Template**: Use the "Test" button to send a test email

## 🔍 CHECKING YOUR CURRENT TEMPLATE

To see what's wrong with your current template:

1. **Check for Handlebars Conditionals**: Look for any `{{#if}}`, `{{#unless}}`, `{{#each}}`, etc. - **REMOVE ALL OF THESE**
2. **Check Variable Names**: Make sure all variable names match exactly (case-sensitive):
   - `{{refund_message}}` (not `{{refundMessage}}` or `{{refund_message}}`)
   - `{{check_in_date}}` (not `{{checkInDate}}`)
   - etc.
3. **Check for Special Characters**: Make sure there are no special characters in variable names
4. **Check for Nested Braces**: Make sure you're not using `{{{{variable}}}}` or similar

## 🐛 COMMON ERRORS TO AVOID

❌ **WRONG** - Using Handlebars conditionals:
```html
{{#if refundPending}}
  Your refund is pending.
{{/if}}
```

✅ **CORRECT** - Use the pre-formatted message:
```html
{{refund_message}}
```

❌ **WRONG** - Using camelCase:
```html
{{refundAmount}}
```

✅ **CORRECT** - Use snake_case:
```html
{{refund_amount}}
```

❌ **WRONG** - Nested braces:
```html
{{{{variable}}}}
```

✅ **CORRECT** - Simple braces:
```html
{{variable}}
```

## 📝 TEMPLATE SUBJECT LINE

Your EmailJS template should also have a subject line. Use:

```
Booking Cancellation Confirmation - {{booking_id}}
```

Or simply:

```
Your Booking Has Been Cancelled
```

## ✅ VERIFICATION CHECKLIST

Before saving your template, verify:

- [ ] No `{{#if}}`, `{{#unless}}`, `{{#each}}` conditionals
- [ ] All variables use snake_case (e.g., `{{refund_amount}}`, not `{{refundAmount}}`)
- [ ] All 17 variables listed above are either used or can be safely ignored
- [ ] No nested curly braces
- [ ] Subject line is set
- [ ] Template is saved and published

## 🧪 TESTING

After updating your template:

1. Cancel a test booking
2. Check the browser console for any errors
3. Verify the email is received
4. Check that all variables are populated correctly

If you still get the "corrupted variables" error after following this guide, check the browser console logs - they will show exactly which variable is causing the problem.

