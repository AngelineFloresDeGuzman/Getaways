# Firebase Storage Setup Guide

## Problem: CORS Error When Uploading Photos

If you're seeing a CORS error like:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' has been blocked by CORS policy
```

This means Firebase Storage security rules need to be configured.

## Solution: Set Up Firebase Storage Security Rules

### Step 1: Deploy Storage Rules via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **getaways-official**
3. Click on **Storage** in the left sidebar
4. Click on the **Rules** tab
5. Copy and paste the following rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload files to their own listings folder
    match /listings/{listingId}/{fileName} {
      // Allow read access to anyone (for viewing listings)
      allow read: if true;
      
      // Allow write access only to authenticated users
      allow write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024  // 10MB max file size
        && request.resource.contentType.matches('image/.*');  // Only images
      
      // Allow delete only to authenticated users
      allow delete: if request.auth != null;
    }
    
    // Default: deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click **Publish**

### Step 2: Deploy Storage Rules via Command Line (Alternative)

If you have Firebase CLI installed:

1. Make sure you're logged in:
   ```bash
   firebase login
   ```

2. Deploy the storage rules:
   ```bash
   firebase deploy --only storage
   ```

### Step 3: Verify Storage is Enabled

1. In Firebase Console, go to **Storage**
2. Make sure Storage is enabled (if not, click "Get Started")
3. Choose your storage location (preferably close to your users)
4. Start in **production mode** (we'll use security rules, not test mode)

## What These Rules Do:

- ✅ **Authenticated users** can upload images to `listings/{listingId}/` folders
- ✅ **Anyone** can read/view uploaded images (for displaying listings)
- ✅ **10MB max file size** per image
- ✅ **Only image files** allowed (jpeg, png, gif, webp, etc.)
- ✅ **All other paths** are blocked for security

## Testing:

After deploying the rules, try uploading a photo again. The CORS error should be resolved.

## Troubleshooting:

### Still getting CORS error?

1. **Check authentication**: Make sure the user is logged in
   ```javascript
   console.log('User:', auth.currentUser);
   ```

2. **Check file size**: Make sure images are under 10MB

3. **Check file type**: Make sure you're uploading image files only

4. **Clear browser cache**: Sometimes cached rules cause issues

5. **Check Firebase Console**: Verify rules were published successfully

### Need more permissive rules for testing?

For testing only, you can temporarily use:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **Warning**: This is less secure. Only use for development!

## Production Recommendations:

1. **Add owner verification**: Only allow users to upload to their own listings
2. **Add file type restrictions**: Only allow specific image formats
3. **Add size limits**: Prevent abuse by limiting file sizes
4. **Monitor usage**: Check Firebase Console for unusual upload patterns

---

**Note**: The `storage.rules` file in your project root contains the rules. Deploy it using Firebase CLI or copy it to the Firebase Console.

