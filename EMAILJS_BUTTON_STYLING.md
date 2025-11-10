# Fix Blue Button Color in EmailJS Templates

## Why Buttons Appear Blue

Email clients (Gmail, Outlook, etc.) automatically apply default blue styling to links and buttons in emails. This happens even if your template doesn't specify blue.

## Solution: Add Inline CSS to Your EmailJS Template

### For the "Verify My Account" Button

In your EmailJS template (`template_qo9q8de`), update the button HTML to include inline styles:

**Option 1: Using an `<a>` tag styled as a button:**
```html
<a href="{{verification_link}}" style="display: inline-block; padding: 12px 24px; background-color: #YOUR_COLOR; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
  Verify My Account
</a>
```

**Option 2: Using a `<div>` styled as a button (wrapped in link):**
```html
<a href="{{verification_link}}" style="text-decoration: none;">
  <div style="display: inline-block; padding: 12px 24px; background-color: #YOUR_COLOR; color: #ffffff; border-radius: 8px; font-weight: bold; font-size: 16px; text-align: center;">
    Verify My Account
  </div>
</a>
```

### Replace `#YOUR_COLOR` with your desired color:
- Primary color (if you know the hex code)
- Example: `#FF6B35` for orange
- Example: `#4A90E2` for blue (if you want blue)
- Example: `#2ECC71` for green

### Important Notes:

1. **Inline Styles Required**: Email clients strip out `<style>` tags and external CSS. You MUST use inline `style=""` attributes.

2. **Use `<a>` tags**: Buttons (`<button>`) don't work well in emails. Always use `<a>` tags styled as buttons.

3. **Full URL in href**: Make sure `{{verification_link}}` contains the full URL (it already does in our code).

### Example Template HTML:

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px;">
    <h1 style="color: #333; margin-bottom: 20px;">Verify Your Getaways Account</h1>
    <p style="color: #666; line-height: 1.6;">Hi {{user_name}},</p>
    <p style="color: #666; line-height: 1.6;">Please verify your email address by clicking the button below:</p>
    
    <!-- Button with custom color (replace #YOUR_COLOR) -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verification_link}}" style="display: inline-block; padding: 14px 28px; background-color: #YOUR_COLOR; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Verify My Account
      </a>
    </div>
    
    <p style="color: #999; font-size: 12px; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{verification_link}}" style="color: #999; word-break: break-all;">{{verification_link}}</a>
    </p>
    
    <p style="color: #666; margin-top: 30px;">
      For support, contact us at <a href="mailto:{{support_email}}" style="color: #YOUR_COLOR;">{{support_email}}</a>
    </p>
  </div>
</body>
</html>
```

### For Password Reset Template (`template_btqnqws`)

Apply the same styling approach:
```html
<a href="{{reset_link}}" style="display: inline-block; padding: 14px 28px; background-color: #YOUR_COLOR; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
  Reset Password
</a>
```

## Steps to Update Your Template:

1. Go to https://dashboard.emailjs.com/admin/template
2. Click on your template (`template_qo9q8de` for verification)
3. Edit the HTML content
4. Replace the button/link with the styled version above
5. Replace `#YOUR_COLOR` with your actual brand color
6. Save the template
7. Repeat for password reset template (`template_btqnqws`)

## Testing

After updating:
1. Send a test email from EmailJS dashboard
2. Check the email in Gmail/Outlook
3. The button should now appear in your custom color, not blue

