# Firebase Storage CORS Error - Troubleshooting Guide

## Error You're Seeing
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/getaways-official.appspot.com/o?name=...' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
```

This error means **Firebase Storage rules are blocking your upload**.

## Solution Steps

### Step 1: Go to Firebase Console
1. Open https://console.firebase.google.com
2. Select your project: **getaways-official**
3. Click **Storage** in the left sidebar
4. Click **Rules** tab

### Step 2: Copy and Paste These Rules EXACTLY

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /messages/{conversationId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 3: Publish Rules
1. Click the **"Publish"** button (top right)
2. Wait for confirmation that rules are published
3. **Wait 60 seconds** for rules to propagate globally

### Step 4: Verify Rules Were Saved
1. Refresh the Rules page
2. You should see your rules displayed
3. Make sure there are no syntax errors (red underlines)

### Step 5: Test Upload
1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Try uploading a file again
3. Check browser console for new errors

## Common Issues

### Issue 1: Rules Not Published
- **Solution**: Make sure you clicked "Publish" button, not just saved

### Issue 2: Rules Have Syntax Errors
- **Solution**: Check for red underlines in Firebase Console Rules editor
- Make sure all quotes match
- Make sure all braces `{}` are closed

### Issue 3: Rules Propagation Delay
- **Solution**: Wait 2-3 minutes after publishing, then hard refresh browser

### Issue 4: Wrong Firebase Project
- **Solution**: Verify you're editing rules in the correct project
- Your project ID should be: `getaways-official`

### Issue 5: User Not Authenticated
- **Solution**: Make sure you're logged in to your app
- Check that `auth.currentUser` is not null

## Alternative: Test with More Permissive Rules (Temporary)

If you want to test if rules are the issue, temporarily use this (NOT FOR PRODUCTION):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING**: This allows any authenticated user to read/write anywhere in Storage. Only use for testing!

## Verify Your Storage is Initialized

Check that your `src/lib/firebase.js` has:
```javascript
import { getStorage } from "firebase/storage";
export const storage = getStorage(app);
```

## Still Not Working?

1. Check Firebase Console → Storage → Files - do you see any files there?
2. Try uploading from Firebase Console manually - does that work?
3. Check Firebase Console → Storage → Rules - are they showing as "Published"?
4. Clear browser cache completely and try again
5. Try in Incognito/Private window
6. Check if you're using the correct Firebase project in your `.env` or config

## Need Help?

If still not working after following all steps:
1. Take a screenshot of your Firebase Storage Rules page
2. Check browser console for any other errors
3. Verify you're logged in when trying to upload

