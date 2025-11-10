# Firebase Storage CORS Configuration

## ⚠️ IMPORTANT: CORS Must Be Configured Before Photo Uploads Will Work

The CORS errors you're seeing occur because Firebase Storage needs to be configured to accept requests from your local development server.

## Quick Setup (Choose One Method):

### Method 1: Using Setup Scripts (Easiest)

**On Windows:**
```cmd
setup-cors.bat
```

**On Mac/Linux:**
```bash
chmod +x setup-cors.sh
./setup-cors.sh
```

### Method 2: Manual Setup with gsutil

1. **Install Google Cloud SDK** (if not installed):
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use package manager:
     ```bash
     # macOS
     brew install google-cloud-sdk
     
     # Windows
     # Download installer from the link above
     ```

2. **Authenticate**:
   ```bash
   gcloud auth login
   ```

3. **Set Project** (if needed):
   ```bash
   gcloud config set project getaways-official
   ```

4. **Apply CORS Configuration**:
   ```bash
   gsutil cors set cors.json gs://getaways-official.appspot.com
   ```

### Method 3: Using Firebase CLI

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login**:
   ```bash
   firebase login
   ```

3. **Use gsutil** (Firebase CLI uses gsutil under the hood):
   ```bash
   gsutil cors set cors.json gs://getaways-official.appspot.com
   ```

### Method 4: Firebase Console (Advanced)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `getaways-official`
3. Go to **Storage** → **Settings** → **CORS**
4. Upload or paste the contents of `cors.json`

## Verify CORS Configuration

After setting up CORS, verify it's working:

```bash
gsutil cors get gs://getaways-official.appspot.com
```

You should see the CORS configuration from `cors.json`.

## The CORS Configuration

The `cors.json` file allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative dev port)
- `https://getaways-official.firebaseapp.com` (Firebase hosting)

It allows these HTTP methods:
- GET, POST, PUT, DELETE, HEAD

## Troubleshooting

**If you see "permission denied" errors:**
- Make sure you're authenticated: `gcloud auth login`
- Make sure you have Storage Admin permissions in Firebase Console

**If CORS errors persist after configuration:**
1. Clear browser cache and reload
2. Verify CORS is set: `gsutil cors get gs://getaways-official.appspot.com`
3. Check that your origin matches exactly (including `http://` vs `https://`)

**If you don't have gsutil:**
- Install Google Cloud SDK (includes gsutil)
- Or use Firebase Console method (Method 4)

## After Configuration

Once CORS is configured:
1. **Refresh your browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. Try uploading photos again
3. CORS errors should be resolved

## Current Status

If you're seeing CORS errors, CORS is **not yet configured**. Follow one of the methods above to configure it.

