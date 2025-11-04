# How Hosts Gain Points & Rewards

## Overview
Hosts can earn points through automatic activities and manual admin awards. Points are automatically calculated and added to the host's account.

## Automatic Point Earning Methods

### 1. **First Listing Published** 
- **Points:** 50 points
- **When:** Host publishes their first listing
- **One-time bonus:** Only awarded once per host

### 2. **Booking Confirmed**
- **Points:** 1 point per 100 currency units (minimum 10 points)
- **Example:** 
  - Booking of ₱5,000 = 50 points
  - Booking of ₱500 = 10 points (minimum)
- **When:** Booking status changes to "confirmed"
- **Prevents duplicates:** Points only awarded once per booking

### 3. **Positive Reviews Received**
- **5-star review:** 25 points
- **4-star review:** 15 points
- **3-star review:** 5 points
- **1-2 star reviews:** 0 points
- **When:** Guest submits a review for a completed booking
- **Prevents duplicates:** Points only awarded once per review

### 4. **Milestone Achievements**
- **Booking Milestones:**
  - 10 bookings: 100 points
  - 25 bookings: 250 points
  - 50 bookings: 500 points
  - 100 bookings: 1,000 points
  - 250 bookings: 2,500 points

- **Review Milestones:**
  - 5 reviews: 50 points
  - 10 reviews: 100 points
  - 25 reviews: 250 points
  - 50 reviews: 500 points

- **Listing Milestones:**
  - 3 listings: 150 points
  - 5 listings: 300 points
  - 10 listings: 750 points

## Manual Admin Awards

Admins can manually award or deduct points:
- **Award Points:** For exceptional performance, promotions, special events
- **Deduct Points:** For policy violations, cancellations, poor behavior

## Implementation

### Where to Call Auto-Award Functions

#### 1. When Listing is Published
```javascript
// In listing publication code (e.g., Payment.jsx after successful payment)
import { awardPointsForFirstListing } from '@/pages/Host/services/pointsService';

// After listing is published
await awardPointsForFirstListing(hostId);
```

#### 2. When Booking is Confirmed
```javascript
// In booking confirmation code
import { awardPointsForBookingConfirmed, awardMilestonePoints } from '@/pages/Host/services/pointsService';

// When booking status changes to 'confirmed'
await awardPointsForBookingConfirmed(hostId, bookingAmount, bookingId);

// Check for booking milestones
const totalBookings = await getHostTotalBookings(hostId);
if ([10, 25, 50, 100, 250].includes(totalBookings)) {
  await awardMilestonePoints(hostId, 'bookings', totalBookings);
}
```

#### 3. When Review is Submitted
```javascript
// In review creation code (e.g., reviewService.js)
import { awardPointsForReview, awardMilestonePoints } from '@/pages/Host/services/pointsService';

// After review is created
const listingDoc = await getDoc(doc(db, 'listings', listingId));
const hostId = listingDoc.data().hostId;
await awardPointsForReview(hostId, rating, reviewId);

// Check for review milestones
const totalReviews = await getHostTotalReviews(hostId);
if ([5, 10, 25, 50].includes(totalReviews)) {
  await awardMilestonePoints(hostId, 'reviews', totalReviews);
}
```

#### 4. When Multiple Listings Created
```javascript
// When listing count reaches milestones
import { awardMilestonePoints } from '@/pages/Host/services/pointsService';

const listingCount = await getHostListingCount(hostId);
if ([3, 5, 10].includes(listingCount)) {
  await awardMilestonePoints(hostId, 'listings', listingCount);
}
```

## Points History

All point transactions are recorded in `pointsHistory` array:
```javascript
{
  points: 50,                    // Points added/deducted
  totalPoints: 150,              // Total after transaction
  reason: "Booking confirmed",    // Reason for points
  bookingId: "booking_123",      // Related booking ID (if applicable)
  timestamp: Timestamp,           // When points were awarded
  type: "auto_awarded",          // "auto_awarded", "awarded", or "deducted"
  source: "booking_confirmed"     // Source of points
}
```

## Rewards System (Future Enhancement)

Points can be used for:
- Badges/Achievements
- Discounts on platform fees
- Featured listing placement
- Priority support
- Exclusive features

## Firebase Structure

Each host's user document includes:
```javascript
{
  points: 1250,                  // Current points balance
  pointsHistory: [...],          // Last 50 transactions
  lastPointsUpdate: Timestamp,   // Last update time
  rewards: []                     // Redeemed rewards (optional)
}
```

## Configuration

Point values can be adjusted in `pointsService.js`:
- `awardPointsForFirstListing()` - Change first listing points
- `awardPointsForBookingConfirmed()` - Adjust booking point calculation
- `awardPointsForReview()` - Modify review point values
- `awardMilestonePoints()` - Update milestone rewards

