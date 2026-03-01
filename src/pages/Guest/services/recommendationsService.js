// Recommendations Service for Guests
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { getGuestBookings } from './bookingService';

/**
 * Get user's booking history for analysis
 * @param {string} userId - Guest user ID
 * @returns {Promise<Array>} Array of booking objects with listing details
 */
const getUserBookingHistory = async (userId) => {
  try {
    const bookings = await getGuestBookings(userId);
    
    // Filter only completed or confirmed bookings
    const completedBookings = bookings.filter(
      b => b.status === 'completed' || b.status === 'confirmed'
    );

    // Fetch listing details for each booking
    const bookingsWithListings = await Promise.all(
      completedBookings.map(async (booking) => {
        try {
          const listingRef = doc(db, 'listings', booking.listingId);
          const listingSnap = await getDoc(listingRef);
          
          if (listingSnap.exists()) {
            const listingData = listingSnap.data();
            return {
              booking,
              listing: {
                id: listingSnap.id,
                ...listingData
              }
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      })
    );

    return bookingsWithListings.filter(Boolean);
  } catch (error) {
    return [];
  }
};

/**
 * Analyze booking patterns to extract preferences
 * @param {Array} bookingHistory - Array of booking objects with listings
 * @returns {Object} User preferences object
 */
const analyzeUserPreferences = (bookingHistory) => {
  if (!bookingHistory || bookingHistory.length === 0) {
    return null;
  }

  const preferences = {
    categories: {},
    locations: {},
    priceRange: { min: Infinity, max: 0 },
    amenities: {},
    propertyTypes: {},
    averageRating: 0
  };

  let totalPrice = 0;
  let priceCount = 0;

  bookingHistory.forEach(({ listing, booking }) => {
    // Category preferences
    const category = listing.category || 'accommodation';
    preferences.categories[category] = (preferences.categories[category] || 0) + 1;

    // Location preferences
    const locationData = listing.locationData || {};
    const city = locationData.city || '';
    const province = locationData.province || '';
    const country = locationData.country || 'Philippines';
    
    if (city) {
      const locationKey = `${city}, ${province || country}`;
      preferences.locations[locationKey] = (preferences.locations[locationKey] || 0) + 1;
    }
    if (province) {
      preferences.locations[province] = (preferences.locations[province] || 0) + 1;
    }

    // Price range
    const price = listing.price || booking.totalPrice || 0;
    if (price > 0) {
      totalPrice += price;
      priceCount++;
      preferences.priceRange.min = Math.min(preferences.priceRange.min, price);
      preferences.priceRange.max = Math.max(preferences.priceRange.max, price);
    }

    // Amenities preferences
    const amenities = listing.amenities || {};
    const allAmenities = [
      ...(amenities.favorites || []),
      ...(amenities.standout || []),
      ...(amenities.safety || [])
    ];
    allAmenities.forEach(amenity => {
      preferences.amenities[amenity] = (preferences.amenities[amenity] || 0) + 1;
    });

    // Property type preferences (for accommodations)
    if (listing.propertyType) {
      preferences.propertyTypes[listing.propertyType] = 
        (preferences.propertyTypes[listing.propertyType] || 0) + 1;
    }

    // Average rating preference
    if (listing.rating) {
      preferences.averageRating += listing.rating;
    }
  });

  // Calculate average price
  if (priceCount > 0) {
    const avgPrice = totalPrice / priceCount;
    preferences.priceRange.average = avgPrice;
    // Set a range around average (±30%)
    preferences.priceRange.min = Math.max(0, avgPrice * 0.7);
    preferences.priceRange.max = avgPrice * 1.3;
  } else {
    preferences.priceRange = null;
  }

  // Calculate average rating
  if (bookingHistory.length > 0) {
    preferences.averageRating = preferences.averageRating / bookingHistory.length;
  }

  return preferences;
};

/**
 * Get recommendations based on user preferences
 * @param {string} userId - Guest user ID
 * @param {number} limitCount - Maximum number of recommendations (default: 12)
 * @param {string} categoryFilter - Optional category filter ('accommodation', 'experience', 'service')
 * @returns {Promise<Array>} Array of recommended listings
 */
export const getRecommendations = async (userId, limitCount = 12, categoryFilter = null) => {
  try {
    if (!userId) {
      return [];
    }

    // Get user's booking history
    const bookingHistory = await getUserBookingHistory(userId);
    
    // If no booking history, return empty (or could return popular listings)
    if (bookingHistory.length === 0) {
      return [];
    }

    // Analyze preferences
    const preferences = analyzeUserPreferences(bookingHistory);
    if (!preferences) {
      return [];
    }

    // Get top categories and locations
    // Use categoryFilter if provided, otherwise use user's most-booked category
    const topCategory = categoryFilter || Object.keys(preferences.categories)
      .sort((a, b) => preferences.categories[b] - preferences.categories[a])[0];
    
    const topLocations = Object.keys(preferences.locations)
      .sort((a, b) => preferences.locations[b] - preferences.locations[a])
      .slice(0, 3);

    // Get already booked listing IDs to exclude
    const bookedListingIds = bookingHistory.map(({ listing }) => listing.id);

    // Query for recommendations
    const recommendations = [];
    const listingsRef = collection(db, 'listings');

    // Strategy 1: Similar listings in preferred locations
    for (const location of topLocations) {
      if (recommendations.length >= limitCount) break;

      try {
        // Extract city or province from location string
        const locationParts = location.split(', ');
        const city = locationParts[0];
        
        // Query by category and location
        const q = query(
          listingsRef,
          where('category', '==', topCategory),
          where('status', '==', 'active'),
          limit(limitCount)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          if (recommendations.length >= limitCount) return;
          if (bookedListingIds.includes(doc.id)) return;

          const data = doc.data();
          const locationData = data.locationData || {};
          const listingCity = locationData.city || '';
          const listingProvince = locationData.province || '';

          // Check if location matches
          if (listingCity === city || listingProvince === city) {
            recommendations.push({
              id: doc.id,
              ...data,
              recommendationReason: `Similar to your bookings in ${location}`
            });
          }
        });
      } catch (error) {
        }
    }

    // Strategy 2: Similar category with price range match
    if (recommendations.length < limitCount && preferences.priceRange) {
      try {
        const q = query(
          listingsRef,
          where('category', '==', topCategory),
          where('status', '==', 'active'),
          limit(limitCount * 2)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          if (recommendations.length >= limitCount) return;
          if (bookedListingIds.includes(doc.id)) return;
          if (recommendations.some(r => r.id === doc.id)) return;

          const data = doc.data();
          const price = data.price || 0;
          const { min, max } = preferences.priceRange;

          // Check if price is in range
          if (price >= min && price <= max) {
            recommendations.push({
              id: doc.id,
              ...data,
              recommendationReason: 'Similar price range to your previous bookings'
            });
          }
        });
      } catch (error) {
        }
    }

    // Strategy 3: Similar amenities
    if (recommendations.length < limitCount) {
      const topAmenities = Object.keys(preferences.amenities)
        .sort((a, b) => preferences.amenities[b] - preferences.amenities[a])
        .slice(0, 5);

      try {
        const q = query(
          listingsRef,
          where('category', '==', topCategory),
          where('status', '==', 'active'),
          limit(limitCount * 3)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          if (recommendations.length >= limitCount) return;
          if (bookedListingIds.includes(doc.id)) return;
          if (recommendations.some(r => r.id === doc.id)) return;

          const data = doc.data();
          const amenities = data.amenities || {};
          const allAmenities = [
            ...(amenities.favorites || []),
            ...(amenities.standout || []),
            ...(amenities.safety || [])
          ];

          // Check if listing has similar amenities
          const matchingAmenities = topAmenities.filter(amenity => 
            allAmenities.includes(amenity)
          );

          if (matchingAmenities.length >= 2) {
            recommendations.push({
              id: doc.id,
              ...data,
              recommendationReason: `Has amenities you've enjoyed before`
            });
          }
        });
      } catch (error) {
        }
    }

    // Strategy 4: Fill remaining slots with high-rated listings in same category
    if (recommendations.length < limitCount) {
      try {
        const q = query(
          listingsRef,
          where('category', '==', topCategory),
          where('status', '==', 'active'),
          orderBy('rating', 'desc'),
          limit(limitCount * 2)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          if (recommendations.length >= limitCount) return;
          if (bookedListingIds.includes(doc.id)) return;
          if (recommendations.some(r => r.id === doc.id)) return;

          const data = doc.data();
          if (data.rating >= 4) { // Only high-rated listings
            recommendations.push({
              id: doc.id,
              ...data,
              recommendationReason: 'Highly rated in your preferred category'
            });
          }
        });
      } catch (error) {
        }
    }

    // Shuffle and limit results
    const shuffled = recommendations.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limitCount);
  } catch (error) {
    return [];
  }
};

/**
 * Get popular listings as fallback recommendations
 * @param {number} limitCount - Maximum number of listings
 * @param {string} category - Optional category filter ('accommodation', 'experience', 'service')
 * @returns {Promise<Array>} Array of popular listings
 */
export const getPopularRecommendations = async (limitCount = 12, category = null) => {
  try {
    const listingsRef = collection(db, 'listings');
    
    // Build query with optional category filter
    let q;
    try {
      if (category) {
        // Try with orderBy and category filter
        q = query(
          listingsRef,
          where('category', '==', category),
          where('status', '==', 'active'),
          orderBy('rating', 'desc'),
          limit(limitCount * 2) // Get more to filter
        );
      } else {
        // Try with orderBy only
        q = query(
          listingsRef,
          where('status', '==', 'active'),
          orderBy('rating', 'desc'),
          limit(limitCount * 2) // Get more to filter
        );
      }
      var querySnapshot = await getDocs(q);
    } catch (error) {
      // Fallback without orderBy
      if (category) {
        q = query(
          listingsRef,
          where('category', '==', category),
          where('status', '==', 'active'),
          limit(limitCount * 3)
        );
      } else {
        q = query(
          listingsRef,
          where('status', '==', 'active'),
          limit(limitCount * 3)
        );
      }
      querySnapshot = await getDocs(q);
    }

    const listings = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      // Show any active listing, prioritize high-rated ones
      listings.push({
        id: doc.id,
        ...data,
        recommendationReason: data.rating >= 4 ? 'Popular choice' : 'Available now'
      });
    });

    // Sort by rating (highest first), then by review count
    listings.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      const reviewsA = a.reviews || 0;
      const reviewsB = b.reviews || 0;
      return reviewsB - reviewsA;
    });

    return listings.slice(0, limitCount);
  } catch (error) {
    return [];
  }
};

/**
 * Get recommendations for a specific listing (similar listings)
 * @param {string} listingId - Current listing ID
 * @param {number} limitCount - Maximum number of recommendations
 * @returns {Promise<Array>} Array of similar listings
 */
export const getSimilarListings = async (listingId, limitCount = 6) => {
  try {
    // Get the current listing
    const listingRef = doc(db, 'listings', listingId);
    const listingSnap = await getDoc(listingRef);
    
    if (!listingSnap.exists()) {
      return [];
    }

    const currentListing = listingSnap.data();
    const category = currentListing.category || 'accommodation';
    const locationData = currentListing.locationData || {};
    const city = locationData.city || '';
    const price = currentListing.price || 0;
    const priceRange = { min: price * 0.7, max: price * 1.3 };

    const listingsRef = collection(db, 'listings');
    const recommendations = [];

    // Query by category and location
    try {
      const q = query(
        listingsRef,
        where('category', '==', category),
        where('status', '==', 'active'),
        limit(limitCount * 2)
      );

      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        if (recommendations.length >= limitCount) return;
        if (doc.id === listingId) return; // Exclude current listing

        const data = doc.data();
        const listingLocationData = data.locationData || {};
        const listingCity = listingLocationData.city || '';
        const listingPrice = data.price || 0;

        // Prioritize by location match, then price range
        const locationMatch = listingCity === city;
        const priceMatch = listingPrice >= priceRange.min && listingPrice <= priceRange.max;

        if (locationMatch || priceMatch) {
          recommendations.push({
            id: doc.id,
            ...data,
            similarityScore: (locationMatch ? 2 : 0) + (priceMatch ? 1 : 0)
          });
        }
      });

      // Sort by similarity score
      recommendations.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
    } catch (error) {
      }

    return recommendations.slice(0, limitCount);
  } catch (error) {
    return [];
  }
};

