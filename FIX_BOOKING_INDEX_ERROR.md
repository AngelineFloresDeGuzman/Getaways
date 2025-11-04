# Fix: Booking Index Error

## Problem
When clicking "Request Booking" button, you get this error:
```
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/...
```

## Root Cause
Firestore requires a composite index for queries that:
- Filter by one field (`guestId`)
- Order by another field (`createdAt`)

This is a performance optimization by Firestore.

## Solution

### Option 1: Create the Index (Recommended for Production)
1. Click the link in the error message (Firebase provides it automatically)
2. Or go to: Firebase Console → Firestore Database → Indexes
3. Click "Create Index" and use:
   - Collection: `bookings`
   - Fields to index:
     - `guestId` (Ascending)
     - `createdAt` (Descending)
4. Wait for the index to build (usually 1-5 minutes)

### Option 2: Code Already Handles It (Current Implementation)
The code has been updated to:
- Try the query with `orderBy` first
- If the index doesn't exist, automatically fall back to query without `orderBy`
- Sort the results in JavaScript instead
- This works immediately without waiting for index creation

## What Changed

The `getGuestBookings()` function now:
1. Tries to query with `orderBy('createdAt', 'desc')` first
2. If it fails due to missing index, catches the error
3. Falls back to query without `orderBy`
4. Sorts results manually in JavaScript
5. Returns empty array on any other errors (prevents UI crashes)

## Testing

After the fix:
1. Click "Request Booking" button
2. Should work without errors (even if index isn't created yet)
3. Bookings will still be sorted correctly (newest first)
4. If you see a warning in console about index, that's normal - it's using the fallback

## Long-term Recommendation

For better performance, create the composite index in Firebase Console. The fallback works but is slower for large datasets.

