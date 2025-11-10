# Firebase Hosting Setup for Logo URL

## Your Firebase Project
- **Project ID**: `getaways-official`
- **Auth Domain**: `getaways-official.firebaseapp.com`

## Step 1: Check if Firebase Hosting is Deployed

### Option A: Check Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project: **getaways-official**
3. Click on **Hosting** in the left menu
4. If you see a deployed site, you'll see the URL (usually `https://getaways-official.web.app`)

### Option B: Check via Command Line
```bash
firebase hosting:sites:list
```

### Option C: Try Accessing the URL
Open in browser:
- `https://getaways-official.web.app`
- `https://getaways-official.firebaseapp.com`

If you see your app, hosting is deployed!

## Step 2: Deploy Your App (If Not Already Deployed)

If hosting is not set up yet:

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

3. **After deployment**, your logo will be accessible at:
   ```
   https://getaways-official.web.app/logo.jpg
   ```

## Step 3: Verify Logo is Accessible

After deployment, test the logo URL:
1. Open: `https://getaways-official.web.app/logo.jpg`
2. If you see the logo image, it's working!
3. If you get a 404 error, make sure `logo.jpg` is in your `public/` folder

## Step 4: Update .env File

The `.env` file has been created with:
```env
VITE_LOGO_URL=https://getaways-official.web.app/logo.jpg
```

**Important:** 
- If you have a custom domain, use that instead
- If hosting uses `.firebaseapp.com`, change it to:
  ```
  VITE_LOGO_URL=https://getaways-official.firebaseapp.com/logo.jpg
  ```

## Step 5: Restart Dev Server

After updating `.env`:
```bash
# Stop your current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## Troubleshooting

### Logo Still Not Showing?

1. **Check if logo is deployed:**
   - Visit `https://getaways-official.web.app/logo.jpg` directly
   - If 404, the logo isn't deployed

2. **Verify .env is loaded:**
   - Check browser console for the `logo_url` value
   - Should show the Firebase URL, not localhost

3. **Check EmailJS template:**
   - Make sure template uses `{{logo_url}}` (with underscores)
   - Not `/logo.jpg` or any hardcoded path

4. **Redeploy if needed:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Alternative: Use Firebase Storage

If hosting isn't set up, you can use Firebase Storage instead:

1. Go to Firebase Console → Storage
2. Upload `logo.jpg`
3. Make it publicly accessible
4. Copy the download URL
5. Update `.env`:
   ```
   VITE_LOGO_URL=https://firebasestorage.googleapis.com/.../logo.jpg
   ```

