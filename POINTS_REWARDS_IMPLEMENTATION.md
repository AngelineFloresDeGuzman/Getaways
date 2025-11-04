# Points & Rewards System Implementation Guide

## Overview
This guide explains how to implement and use the Points & Rewards system for Host accounts that can be managed by Admins.

## Firebase Structure

### User Document Structure
Add these fields to the `users` collection:

```javascript
{
  points: 0,                    // Current points balance
  pointsHistory: [              // History of point transactions
    {
      points: 100,              // Points added/deducted
      totalPoints: 100,          // Total after transaction
      reason: "Excellent host performance",
      awardedBy: "admin_user_id",
      timestamp: Timestamp,
      type: "awarded"            // "awarded" or "deducted"
    }
  ],
  lastPointsUpdate: Timestamp,
  rewards: []                    // Array of redeemed rewards (optional)
}
```

## Implementation Steps

### 1. Update Firebase Security Rules

Add rules to allow admins to update points:

```javascript
match /users/{userId} {
  // Allow users to read their own data
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Allow admins to update points
  allow update: if request.auth != null && (
    request.auth.uid == userId ||
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin']))
  ) && (
    // Users can update their own data except points
    request.auth.uid == userId && !request.resource.data.diff(resource.data).affectedKeys().hasOnly(['points', 'pointsHistory', 'lastPointsUpdate']) ||
    // Admins can update points
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin']) && 
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['points', 'pointsHistory', 'lastPointsUpdate'])
  );
}
```

### 2. Admin Dashboard Integration

Add a "Points & Rewards Management" section to the Admin Dashboard:

**File: `src/pages/Admin/AdminDashboard.jsx`**

Add a new section or create a separate page:
- List all hosts with their points
- Search/filter hosts
- Award/Deduct points modal
- Points history view

### 3. Host Dashboard Integration

Display points in the Host Dashboard:

**File: `src/pages/Host/HostDashboard.jsx`**

Add points display:
- Points balance card
- Points history section
- Rewards redemption (if applicable)

### 4. Service Functions

The service file `src/pages/Host/services/pointsService.js` provides:
- `getHostPoints(userId)` - Get host's points and history
- `awardPointsToHost(hostId, points, reason, adminId)` - Award points (Admin)
- `deductPointsFromHost(hostId, points, reason, adminId)` - Deduct points (Admin)
- `getAllHostsWithPoints()` - Get all hosts with points (Admin)

## Usage Examples

### Admin Awarding Points:
```javascript
import { awardPointsToHost } from '@/pages/Host/services/pointsService';

// In Admin component
const handleAwardPoints = async () => {
  try {
    await awardPointsToHost(
      selectedHostId,
      100,
      "Excellent performance this month",
      currentAdminId
    );
    toast.success('Points awarded successfully!');
  } catch (error) {
    toast.error('Failed to award points');
  }
};
```

### Host Viewing Points:
```javascript
import { getHostPoints } from '@/pages/Host/services/pointsService';

// In Host Dashboard
const [pointsData, setPointsData] = useState({ points: 0, pointsHistory: [] });

useEffect(() => {
  const loadPoints = async () => {
    if (user?.uid) {
      const data = await getHostPoints(user.uid);
      setPointsData(data);
    }
  };
  loadPoints();
}, [user]);
```

## Firebase Indexes Required

If you want to query hosts by points, create a composite index:

**Collection:** `users`
**Fields:**
- `roles` (Array)
- `points` (Descending)

Index URL will be provided by Firebase when you try to run the query.

## Next Steps

1. Add the UI components to Admin Dashboard for managing points
2. Add points display to Host Dashboard
3. Create Firebase indexes if needed
4. Update Firebase security rules
5. Test the implementation with admin and host accounts

