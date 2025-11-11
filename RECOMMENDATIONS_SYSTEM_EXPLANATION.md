# Recommendations & Suggestions System - Technical Explanation

## Overview
The Getaways platform implements a **personalized recommendation system** that suggests listings to guests based on their previous booking history. The system analyzes user preferences from completed bookings and recommends similar listings that match their interests.

---

## Architecture

### Core Files
1. **`src/pages/Guest/services/recommendationsService.js`** - Main recommendation logic
2. **`src/components/Recommendations.jsx`** - UI component for displaying recommendations
3. **`src/components/SimilarListings.jsx`** - UI component for similar listings on detail pages
4. **`src/pages/Guest/services/bookingService.js`** - Fetches user booking history

---

## How It Works

### 1. **Data Collection Phase** (`getUserBookingHistory`)

**Location:** `recommendationsService.js` lines 20-59

**Process:**
- Fetches all bookings for a user using `getGuestBookings(userId)`
- Filters only **completed** or **confirmed** bookings (excludes cancelled/pending)
- For each booking, fetches the full listing details from Firestore
- Returns an array of booking objects with their associated listing data

**Example Data Structure:**
```javascript
[
  {
    booking: {
      id: "booking123",
      listingId: "listing456",
      status: "completed",
      totalPrice: 5000,
      // ... other booking fields
    },
    listing: {
      id: "listing456",
      category: "accommodation",
      locationData: { city: "Manila", province: "Metro Manila" },
      price: 5000,
      amenities: { favorites: ["WiFi", "Pool"] },
      propertyType: "apartment",
      rating: 4.5
      // ... other listing fields
    }
  }
]
```

---

### 2. **Preference Analysis Phase** (`analyzeUserPreferences`)

**Location:** `recommendationsService.js` lines 66-151

**What It Analyzes:**
The system extracts patterns from booking history to build a user preference profile:

#### **a) Category Preferences**
- Counts how many times user booked each category (accommodation, experience, service)
- Identifies the **most frequently booked category**

#### **b) Location Preferences**
- Tracks cities and provinces from previous bookings
- Creates a frequency map: `{ "Manila, Metro Manila": 3, "Cebu": 2 }`
- Identifies top 3 most-booked locations

#### **c) Price Range Analysis**
- Calculates minimum, maximum, and average price from bookings
- Creates a price range: **average ± 30%** (e.g., if average is ₱5,000, range is ₱3,500 - ₱6,500)

#### **d) Amenities Preferences**
- Extracts all amenities from booked listings (favorites, standout, safety)
- Counts frequency of each amenity
- Identifies top 5 most common amenities

#### **e) Property Type Preferences** (for accommodations)
- Tracks property types (apartment, house, villa, etc.)
- Identifies preferred property types

#### **f) Rating Preferences**
- Calculates average rating of listings user has booked
- Indicates quality expectations

**Example Preference Object:**
```javascript
{
  categories: { "accommodation": 5, "experience": 2 },
  locations: { "Manila, Metro Manila": 3, "Cebu": 2 },
  priceRange: { min: 3500, max: 6500, average: 5000 },
  amenities: { "WiFi": 4, "Pool": 3, "Parking": 2 },
  propertyTypes: { "apartment": 3, "house": 2 },
  averageRating: 4.3
}
```

---

### 3. **Recommendation Generation Phase** (`getRecommendations`)

**Location:** `recommendationsService.js` lines 159-353

**Strategy:** Multi-layered approach with 4 strategies (executed in order until limit is reached)

#### **Strategy 1: Location-Based Recommendations** (Lines 194-233)
- **Goal:** Find listings in user's preferred locations
- **Process:**
  1. Gets top 3 most-booked locations
  2. For each location, queries listings matching:
     - Same category as most-booked category
     - Active status
     - Location matches (city or province)
  3. Excludes already-booked listings
  4. Adds recommendation reason: `"Similar to your bookings in {location}"`

#### **Strategy 2: Price Range Matching** (Lines 236-267)
- **Goal:** Find listings within user's price comfort zone
- **Process:**
  1. Queries listings in preferred category
  2. Filters by price range (min to max from preferences)
  3. Excludes already-booked listings
  4. Adds reason: `"Similar price range to your previous bookings"`

#### **Strategy 3: Amenities Matching** (Lines 269-313)
- **Goal:** Find listings with amenities user has enjoyed
- **Process:**
  1. Gets top 5 most-frequently booked amenities
  2. Queries listings in preferred category
  3. Checks if listing has at least 2 matching amenities
  4. Adds reason: `"Has amenities you've enjoyed before"`

#### **Strategy 4: High-Rated Fallback** (Lines 315-344)
- **Goal:** Fill remaining slots with quality listings
- **Process:**
  1. Queries high-rated listings (rating ≥ 4) in preferred category
  2. Orders by rating (descending)
  3. Adds reason: `"Highly rated in your preferred category"`

**Final Step:**
- Shuffles recommendations for variety
- Limits to requested count (default: 12)
- Returns array of recommended listings

---

### 4. **Fallback: Popular Recommendations** (`getPopularRecommendations`)

**Location:** `recommendationsService.js` lines 360-413

**When Used:**
- User has no booking history
- Personalized recommendations return empty
- User is not logged in

**Process:**
1. Queries all active listings
2. Tries to order by rating (descending)
3. Falls back to any active listings if index missing
4. Sorts by:
   - Rating (highest first)
   - Review count (highest first)
5. Returns top listings with reason: `"Popular choice"` or `"Available now"`

---

### 5. **Similar Listings** (`getSimilarListings`)

**Location:** `recommendationsService.js` lines 421-484

**Purpose:** Shows listings similar to the one user is currently viewing

**Process:**
1. Fetches current listing details
2. Extracts: category, city, price
3. Creates price range: current price ± 30%
4. Queries listings matching:
   - Same category
   - Active status
5. Scores by:
   - Location match: +2 points
   - Price range match: +1 point
6. Sorts by similarity score
7. Excludes current listing
8. Returns top 6 similar listings

---

## UI Integration

### **Recommendations Component** (`src/components/Recommendations.jsx`)

**Where Used:**
- Guest homepage (`src/pages/Guest/Index.jsx`)
- Bookings page (`src/pages/Guest/Bookings.jsx`)

**Behavior:**
1. Checks if user is logged in
2. If logged in: Calls `getRecommendations(userId)`
3. If no results or not logged in: Calls `getPopularRecommendations()`
4. Displays listings in a grid
5. Shows recommendation reason badge on each listing
6. Handles favorites functionality

**Props:**
- `title`: Section title (default: "Recommended for You")
- `showTitle`: Whether to show title (default: true)
- `limit`: Number of recommendations (default: 12)

### **Similar Listings Component** (`src/components/SimilarListings.jsx`)

**Where Used:**
- Listing detail pages (accommodations, experiences, services)

**Behavior:**
1. Takes `listingId` as prop
2. Calls `getSimilarListings(listingId)`
3. Displays similar listings in a grid
4. Shows "Similar Listings" section below main listing

---

## Data Flow Diagram

```
User Books Listing
    ↓
Booking Saved to Firestore (status: completed/confirmed)
    ↓
getRecommendations(userId) Called
    ↓
getUserBookingHistory(userId)
    ↓
Fetch All Completed Bookings + Listing Details
    ↓
analyzeUserPreferences(bookingHistory)
    ↓
Extract: Categories, Locations, Price Range, Amenities, Property Types
    ↓
Multi-Strategy Recommendation Query:
    ├─ Strategy 1: Location Match
    ├─ Strategy 2: Price Range Match
    ├─ Strategy 3: Amenities Match
    └─ Strategy 4: High-Rated Fallback
    ↓
Filter Out Already-Booked Listings
    ↓
Shuffle & Limit Results
    ↓
Return Recommendations Array
    ↓
Recommendations Component Displays Results
```

---

## Key Features

### ✅ **Personalization**
- Recommendations are unique to each user
- Based on actual booking behavior, not just preferences
- Learns from completed bookings only (more reliable)

### ✅ **Multi-Factor Matching**
- Not just one factor (e.g., location)
- Combines: location, price, amenities, category, rating
- Uses multiple strategies for better coverage

### ✅ **Smart Fallbacks**
- If no booking history → shows popular listings
- If query fails → tries alternative queries
- If index missing → falls back to client-side filtering

### ✅ **Exclusion Logic**
- Never recommends listings user has already booked
- Prevents duplicate recommendations
- Filters out inactive listings

### ✅ **Transparency**
- Each recommendation includes a reason
- Users understand why listings are suggested
- Examples: "Similar to your bookings in Manila", "Has amenities you've enjoyed"

---

## Example Scenarios

### **Scenario 1: New User (No Booking History)**
```
User: No bookings
→ getRecommendations() returns []
→ Falls back to getPopularRecommendations()
→ Shows top-rated active listings
→ Reason: "Popular choice" or "Available now"
```

### **Scenario 2: User with Booking History**
```
User has booked:
- 3 accommodations in Manila (₱4,000-₱6,000)
- 2 experiences in Cebu
- All had WiFi, Pool amenities

Analysis:
- Top category: accommodation
- Top location: Manila
- Price range: ₱2,800 - ₱7,800 (avg ₱5,000 ± 30%)
- Top amenities: WiFi, Pool

Recommendations:
1. Accommodations in Manila (Strategy 1)
2. Accommodations in price range ₱2,800-₱7,800 (Strategy 2)
3. Accommodations with WiFi + Pool (Strategy 3)
4. High-rated accommodations (Strategy 4)
```

### **Scenario 3: Viewing Listing Detail**
```
User viewing: "Luxury Apartment in Manila" (₱5,000)
→ getSimilarListings("listing123")
→ Finds:
  - Same category (accommodation)
  - Same city (Manila) → +2 points
  - Similar price (₱3,500-₱6,500) → +1 point
→ Sorts by similarity score
→ Shows top 6 similar listings
```

---

## Performance Considerations

### **Optimizations:**
1. **Lazy Loading:** Recommendations load only when component mounts
2. **Caching:** Could be enhanced with localStorage caching
3. **Pagination:** Uses `limit()` to control query size
4. **Error Handling:** Graceful fallbacks if queries fail
5. **Index Fallbacks:** Handles missing Firestore indexes gracefully

### **Potential Improvements:**
1. Cache user preferences to avoid re-analysis
2. Add real-time updates when new bookings complete
3. Machine learning for better matching
4. A/B testing different recommendation strategies
5. Track recommendation click-through rates

---

## Testing the System

### **To Test Personalized Recommendations:**
1. Create a guest account
2. Make at least 2-3 bookings (mark as completed)
3. Book listings with:
   - Same category (e.g., all accommodations)
   - Similar locations (e.g., all in Manila)
   - Similar price range
   - Common amenities
4. Go to homepage or bookings page
5. Check "Recommended for You" section
6. Verify recommendations match your booking patterns

### **To Test Popular Recommendations:**
1. Log out or use account with no bookings
2. Go to homepage
3. Check "Recommended for You" section
4. Should show popular/high-rated listings

### **To Test Similar Listings:**
1. View any listing detail page
2. Scroll to bottom
3. Check "Similar Listings" section
4. Verify listings are same category and similar location/price

---

## Code Locations Summary

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `getUserBookingHistory` | `recommendationsService.js` | 20-59 | Fetch user's completed bookings |
| `analyzeUserPreferences` | `recommendationsService.js` | 66-151 | Extract preferences from bookings |
| `getRecommendations` | `recommendationsService.js` | 159-353 | Generate personalized recommendations |
| `getPopularRecommendations` | `recommendationsService.js` | 360-413 | Fallback popular listings |
| `getSimilarListings` | `recommendationsService.js` | 421-484 | Find similar listings |
| `<Recommendations />` | `Recommendations.jsx` | All | Display recommendations UI |
| `<SimilarListings />` | `SimilarListings.jsx` | All | Display similar listings UI |

---

## Conclusion

The recommendation system is a **sophisticated, multi-layered approach** that:
- Learns from user behavior (completed bookings)
- Analyzes multiple preference factors
- Uses multiple matching strategies
- Provides transparent reasoning
- Has smart fallbacks for new users
- Excludes already-booked listings

This creates a personalized experience that helps users discover listings they're likely to enjoy based on their actual booking history.

