# Available Firebase Data for Profile Tab

Based on the codebase analysis, here are all the available data from Firebase collections that would be beneficial and accurate to display in the Profile tab:

## 1. **Users Collection** (`users/{userId}`)
**Currently Used:**
- `firstName` - First name
- `lastName` - Last name
- `email` - Email address
- `phone` - Phone number
- `location` - User location
- `bio` - User biography/description
- `profileImage` - Profile picture (base64 or URL)
- `photoURL` - Firebase Auth photo URL
- `roles` - Array of user roles (e.g., ["guest", "host"])
- `emailVerified` - Boolean indicating if email is verified
- `createdAt` - Account creation timestamp
- `updatedAt` - Last profile update timestamp

**Additional Available (from listings):**
- `residentialAddress` - Extracted from host's listings (if host)

## 2. **Bookings Collection** (`bookings`)
**For Guests (where `guestId == userId`):**
- Total booking count
- Booking status breakdown:
  - `pending` - Pending bookings
  - `confirmed` - Confirmed bookings
  - `completed` - Completed bookings
  - `cancelled` - Cancelled bookings
- Booking statistics:
  - Total spent amount (sum of `totalPrice` for completed bookings)
  - Average booking value
  - Most booked location (from listings)
  - Favorite listing category (accommodation/experience/service)
  - Booking frequency (bookings per month/year)
- Dates:
  - `checkInDate` - Check-in dates
  - `checkOutDate` - Check-out dates
  - `createdAt` - Booking creation date
  - `updatedAt` - Last booking update

**For Hosts (where `ownerId == userId`):**
- Total bookings received
- Booking status breakdown (same as above)
- Revenue statistics:
  - Total earnings (sum of `totalPrice` for confirmed/completed bookings)
  - Average booking value
  - Earnings by month/year
  - Most popular listing
- Booking trends:
  - Booking rate (bookings per month)
  - Average booking duration
  - Cancellation rate

## 3. **Listings Collection** (`listings`)
**For Hosts (where `ownerId == userId`):**
- Total listings count
- Listings by category:
  - Accommodations count
  - Experiences count
  - Services count
- Listing status:
  - Active listings
  - Draft listings
  - Published listings
- Listing performance:
  - Total views (if tracked)
  - Average rating (if reviews exist)
  - Total reviews count
- Listing details:
  - `title` - Listing titles
  - `category` - Listing categories
  - `locationData` - Location information
  - `pricing` - Pricing information
  - `photos` - Listing photos count
  - `createdAt` - Listing creation dates
  - `updatedAt` - Last listing update

## 4. **Reviews Collection** (if exists)
**For Guests:**
- Reviews written count
- Reviews by rating (1-5 stars)
- Average rating given
- Recent reviews written

**For Hosts:**
- Reviews received count
- Reviews by rating (1-5 stars)
- Average rating received
- Recent reviews received
- Review fields (if collection exists):
  - `rating` - Star rating (1-5)
  - `comment` - Review text
  - `createdAt` - Review date
  - `reviewerId` - Reviewer user ID
  - `listingId` - Listing being reviewed

## 5. **Conversations/Messages Collection** (`conversations` and `messages`)
**For Both Roles:**
- Total conversations count
- Active conversations count
- Unread messages count
- Last message timestamp
- Conversation participants

## 6. **Wishes Collection** (subcollection: `listings/{listingId}/wishes`)
**For Hosts:**
- Total wishes received
- Wishes by status:
  - `pending` - Unread wishes
  - `read` - Read wishes
  - `addressed` - Addressed wishes
- Recent wishes count
- Most wished listing

## 7. **Favorites** (LocalStorage: `favorites_{userId}`)
**For Guests:**
- Total favorites count
- Favorites by type:
  - Accommodations count
  - Experiences count
  - Services count
- Most recent favorites
- Saved date information

## 8. **onboardingDrafts Collection** (`onboardingDrafts`)
**For Hosts:**
- Draft listings count
- Incomplete listings count
- Last draft saved date

## Recommended Profile Tab Statistics Section:

### **For Guests:**
1. **Account Info:**
   - Profile picture, name, email, phone, location, bio
   - Email verification status
   - Member since date

2. **Stats Cards:**
   - Total Bookings (with status breakdown on hover)
   - Total Spent (sum of completed bookings)
   - Favorites Count
   - Reviews Written (if reviews collection exists)
   - Average Booking Value

3. **Activity Summary:**
   - Upcoming bookings count
   - Past bookings count
   - Most booked category
   - Favorite location

### **For Hosts:**
1. **Account Info:**
   - Profile picture, name, email, phone, location, bio
   - Residential address (from listings)
   - Email verification status
   - Member since date

2. **Stats Cards:**
   - Total Listings (by category breakdown)
   - Total Bookings Received
   - Total Earnings (from confirmed/completed bookings)
   - Average Rating (if reviews exist)
   - Wishes Received (with status breakdown)
   - Active Conversations

3. **Performance Summary:**
   - Booking rate (bookings per month)
   - Most popular listing
   - Earnings by month (chart data)
   - Response rate (wishes addressed)

## Additional Recommendations:

1. **Account Activity Timeline:**
   - Recent bookings
   - Recent listings created (hosts)
   - Recent reviews (if available)
   - Account milestones

2. **Achievements/Badges:**
   - First booking milestone
   - 10 bookings milestone
   - Superhost badge (high ratings, many bookings)
   - Verified account badge

3. **Quick Actions:**
   - Complete profile percentage
   - Missing information prompts
   - Verification status prompts

Note: Some collections like `reviews` may not exist yet in your Firebase. You can implement them later or use placeholder data for future features.

