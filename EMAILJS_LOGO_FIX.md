# Fix Logo Not Showing in Email Verification

## Problem
Email clients require **absolute URLs** for images. Relative paths like `/logo.jpg` don't work in emails.

## Solution

### Step 1: Update Your EmailJS Template

In your EmailJS template (`template_qo9q8de`), replace the logo image tag with:

```html
<img src="{{logo_url}}" alt="Getaways Logo" style="max-width: 200px; height: auto;" />
```

**Important:** Make sure you're using `{{logo_url}}` (with underscores) as the variable name.

### Step 2: Ensure Logo is Accessible

The logo needs to be hosted at a publicly accessible URL. Options:

#### Option A: Use Your Production Domain (Recommended)
1. Deploy your app (or ensure `/logo.jpg` is accessible)
2. Set environment variable in `.env`:
   ```
   VITE_LOGO_URL=https://yourdomain.com/logo.jpg
   ```

#### Option B: Use a CDN
1. Upload `logo.jpg` to a CDN (e.g., Cloudinary, Imgur, Firebase Storage)
2. Set environment variable:
   ```
   VITE_LOGO_URL=https://your-cdn-url.com/logo.jpg
   ```

#### Option C: Use Firebase Storage
1. Upload `logo.jpg` to Firebase Storage
2. Get the public URL
3. Set environment variable:
   ```
   VITE_LOGO_URL=https://firebasestorage.googleapis.com/.../logo.jpg
   ```

### Step 3: Test

1. Send a test email
2. Check if the logo appears
3. If not, verify:
   - The URL is absolute (starts with `http://` or `https://`)
   - The logo file is publicly accessible
   - The `{{logo_url}}` variable is correctly used in the template

## Current Code Behavior

The code now automatically:
- Uses `VITE_LOGO_URL` if set in environment variables
- Falls back to `${window.location.origin}/logo.jpg` (e.g., `http://localhost:5173/logo.jpg` for local dev)
- Passes `logo_url` to EmailJS template as `{{logo_url}}`

## For Production

**Important:** For production, you MUST set `VITE_LOGO_URL` to your production domain:

```env
VITE_LOGO_URL=https://getaways.com/logo.jpg
```

Or use a CDN URL that's always accessible.

## Example EmailJS Template HTML

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="{{logo_url}}" alt="Getaways Logo" style="max-width: 200px; height: auto;" />
    </div>
    
    <h1 style="color: #333; margin-bottom: 20px;">Verify Your Getaways Account</h1>
    <!-- Rest of your email content -->
  </div>
</body>
</html>
```

## Troubleshooting

If logo still doesn't show:
1. Check browser console for the `logo_url` value in the email params log
2. Copy the URL and paste it in a browser to verify it's accessible
3. Make sure the EmailJS template uses `{{logo_url}}` exactly (case-sensitive)
4. Some email clients block images by default - ask recipient to "Show images"

