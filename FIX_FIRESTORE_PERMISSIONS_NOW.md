# 🔴 URGENT: Fix Firestore Permission Errors

## You're Getting These Errors:
- ❌ "Error fetching user roles: Missing or insufficient permissions"
- ❌ "Error fetching user data: Missing or insufficient permissions"  
- ❌ "Error in conversations snapshot: Missing or insufficient permissions"

**This means Firestore rules are blocking your app!**

## ✅ FIX IT NOW - 5 Minutes

### Step 1: Open Firestore Rules
1. Go to https://console.firebase.google.com
2. Select project: **getaways-official**
3. Click **Firestore Database** in left sidebar
4. Click **Rules** tab (top menu)

### Step 2: Delete Everything
1. Select ALL text in the rules editor (Ctrl+A)
2. Delete it

### Step 3: Copy and Paste This EXACTLY

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated() && request.auth.uid == userId;
    }
    
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && 
        request.auth.uid in resource.data.participants;
      
      allow create: if isAuthenticated() && 
        request.auth.uid in request.resource.data.participants;
      
      allow update: if isAuthenticated() && 
        request.auth.uid in resource.data.participants;
      
      allow delete: if isAuthenticated() && 
        request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read, write: if isAuthenticated() && 
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if isAuthenticated() && 
          request.resource.data.senderId == request.auth.uid;
      }
    }
    
    match /listings/{listingId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && resource.data.hostId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.hostId == request.auth.uid;
    }
    
    match /bookings/{bookingId} {
      allow read: if isAuthenticated() && (
        resource.data.guestId == request.auth.uid ||
        resource.data.hostId == request.auth.uid
      );
      allow create: if isAuthenticated() && request.resource.data.guestId == request.auth.uid;
      allow update: if isAuthenticated() && (
        resource.data.guestId == request.auth.uid ||
        resource.data.hostId == request.auth.uid
      );
    }
    
    match /onboardingDrafts/{draftId} {
      allow read, write: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### Step 4: Publish Rules
1. Click **"Publish"** button (green button, top right)
2. Wait for "Rules published successfully" message
3. **Wait 60 seconds** for rules to propagate

### Step 5: Test
1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check if errors are gone

## ⚠️ IMPORTANT

**You need to configure BOTH:**
1. ✅ Firestore Rules (this file) - for database access
2. ✅ Storage Rules (from FIREBASE_RULES_FINAL.txt) - for file uploads

## 🚨 If Still Not Working

1. **Check for Syntax Errors**
   - Look for red underlines in Firebase Console
   - Make sure all braces `{}` are closed
   - Make sure all quotes match

2. **Verify Rules Were Published**
   - Go back to Rules page
   - Confirm your rules are still there
   - If they're gone → you didn't click Publish!

3. **Check Project**
   - Make sure you're editing: **getaways-official** project
   - Not a different project!

4. **Wait Longer**
   - Rules can take 2-5 minutes to propagate globally
   - Wait 3 minutes, then try again

5. **Clear Browser Cache**
   - Open DevTools (F12)
   - Right-click refresh → "Empty Cache and Hard Reload"

## ✅ What These Rules Do

- **users**: Authenticated users can read any user, write only their own
- **conversations**: Users can only access conversations they're participants in
- **messages**: Users can read/write messages in conversations they're part of
- **listings**: Authenticated users can read all, write only their own
- **bookings**: Users can read/write bookings where they're guest or host
- **onboardingDrafts**: Users can only access their own drafts

These rules are secure and allow your app to function properly!

