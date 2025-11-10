# Quick Fix: Logo Not Showing in Email

## Step 1: Check Console Logs

When you send a verification email, check your browser console. You should see:
```
logo_url: "http://localhost:5173/logo.jpg"
```

**If you see `localhost`, that's the problem!** Email clients cannot access `localhost` URLs.

## Step 2: Quick Solutions

### Option A: Use a Free Image Hosting Service (Fastest)

1. Go to https://imgur.com/upload or https://postimages.org/
2. Upload your `logo.jpg` file
3. Copy the direct image URL (should look like `https://i.imgur.com/xxxxx.jpg`)
4. Add to your `.env` file:
   ```
   VITE_LOGO_URL=https://your-image-url-here.jpg
   ```
5. Restart your dev server

### Option B: Use Firebase Storage (If you have Firebase)

1. Upload `logo.jpg` to Firebase Storage
2. Make it publicly accessible
3. Copy the public URL
4. Add to `.env`:
   ```
   VITE_LOGO_URL=https://firebasestorage.googleapis.com/.../logo.jpg
   ```

### Option C: Deploy to Production

If you have a deployed site:
1. Make sure `/logo.jpg` is accessible on your production domain
2. Add to `.env`:
   ```
   VITE_LOGO_URL=https://your-production-domain.com/logo.jpg
   ```

## Step 3: Update EmailJS Template

**CRITICAL:** Make sure your EmailJS template uses `{{logo_url}}`:

1. Go to https://dashboard.emailjs.com/admin/template
2. Open template `template_qo9q8de`
3. Find the logo `<img>` tag
4. Make sure it says:
   ```html
   <img src="{{logo_url}}" alt="Getaways Logo" />
   ```
5. **NOT** `/logo.jpg` or any hardcoded path
6. Save the template

## Step 4: Test

1. Restart your dev server (if you changed `.env`)
2. Send a test email
3. Check console - logo_url should now show a public URL
4. Check email - logo should appear

## Common Issues

### Issue: Template not updated
- **Symptom:** Logo still missing even with correct URL
- **Fix:** Make sure EmailJS template uses `{{logo_url}}` exactly (case-sensitive)

### Issue: localhost URL
- **Symptom:** Console shows `http://localhost:5173/logo.jpg`
- **Fix:** Use Option A, B, or C above to get a public URL

### Issue: Image blocked by email client
- **Symptom:** Logo shows broken image icon
- **Fix:** Ask recipient to click "Show images" or "Display images" in their email client

### Issue: Wrong variable name
- **Symptom:** Logo URL is correct but not showing
- **Fix:** Check template uses `{{logo_url}}` (with underscores), not `{{logoUrl}}` or `{{logo-url}}`

