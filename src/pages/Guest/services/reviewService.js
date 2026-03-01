import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Create a new review
 * @param {Object} reviewData - The review data
 * @param {string} reviewData.listingId - The listing ID
 * @param {string} reviewData.bookingId - The booking ID
 * @param {number} reviewData.rating - Rating (1-5)
 * @param {string} reviewData.comment - Review comment
 * @returns {Promise<string>} - The review ID
 */
export const createReview = async (reviewData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to create a review');

  const { listingId, bookingId, rating, comment } = reviewData;

  if (!listingId || !bookingId || !rating || !comment) {
    throw new Error('Missing required review information');
  }

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Check if review already exists for this booking
  const existingReview = await getReviewByBookingId(bookingId);
  if (existingReview) {
    throw new Error('You have already reviewed this booking');
  }

  // Get user profile data
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  // Get booking data to verify ownership
  const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
  if (!bookingDoc.exists()) {
    throw new Error('Booking not found');
  }

  const bookingData = bookingDoc.data();
  if (bookingData.guestId !== user.uid) {
    throw new Error('You can only review your own bookings');
  }

  if (bookingData.status !== 'completed') {
    throw new Error('You can only review completed bookings');
  }

  // Get listing data
  const listingDoc = await getDoc(doc(db, 'listings', listingId));
  if (!listingDoc.exists()) {
    throw new Error('Listing not found');
  }

  const listingData = listingDoc.data();

  // Create review document
  const reviewDoc = {
    listingId: listingId,
    bookingId: bookingId,
    reviewerId: user.uid,
    reviewerName: userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}` 
      : userData.firstName || userData.email || 'Anonymous',
    reviewerEmail: user.email,
    reviewerImage: userData.profileImage || userData.photoURL || null,
    rating: rating,
    comment: comment,
    listingTitle: listingData.title || listingData.data?.title || 'Untitled Listing',
    listingCategory: listingData.category || 'accommodation',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Add review to reviews collection
  const reviewsCollection = collection(db, 'reviews');
  const reviewRef = await addDoc(reviewsCollection, reviewDoc);

  // Update listing's average rating and review count
  await updateListingRating(listingId);

  // Mark booking as reviewed
  await updateDoc(doc(db, 'bookings', bookingId), {
    reviewed: true,
    reviewedAt: serverTimestamp(),
  });

  // Award points to host for positive review
  try {
    const hostId = listingData.ownerId || listingData.hostId;
    if (!hostId) {
      return reviewRef.id; // Return early if no hostId
    }
    
    if (rating >= 3) {
      const { awardPointsForReview, awardMilestonePoints } = await import('@/pages/Host/services/pointsService');
      const pointsResult = await awardPointsForReview(hostId, rating, reviewRef.id);
      // Check for review milestones
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const reviewsCollection = collection(db, 'reviews');
        
        // Get all listings by this host to count total reviews
        const listingsCollection = collection(db, 'listings');
        const hostListingsQuery = query(
          listingsCollection,
          where('ownerId', '==', hostId)
        );
        const hostListingsSnapshot = await getDocs(hostListingsQuery);
        const hostListingIds = hostListingsSnapshot.docs.map(doc => doc.id);
        
        if (hostListingIds.length > 0) {
          // Firestore 'in' query limit is 10, so we need to batch if there are more
          let totalReviews = 0;
          for (let i = 0; i < hostListingIds.length; i += 10) {
            const batch = hostListingIds.slice(i, i + 10);
            const allHostReviewsQuery = query(
              reviewsCollection,
              where('listingId', 'in', batch)
            );
            const allHostReviewsSnapshot = await getDocs(allHostReviewsQuery);
            totalReviews += allHostReviewsSnapshot.size;
          }
          
          if ([5, 10, 25, 50].includes(totalReviews)) {
            await awardMilestonePoints(hostId, 'reviews', totalReviews);
          }
        }
      } catch (milestoneError) {
        // Don't block if milestone check fails
      }
    } else {
      console.log('ℹ️ Review points: Rating too low (', rating, '), no points awarded');
    }
  } catch (pointsError) {
    // Don't block review creation if points fail
  }

  return reviewRef.id;
};

/**
 * Get reviews for a listing
 * @param {string} listingId - The listing ID
 * @returns {Promise<Array>} - Array of review documents
 */
export const getListingReviews = async (listingId) => {
  try {
    const reviewsCollection = collection(db, 'reviews');
    const q = query(
      reviewsCollection,
      where('listingId', '==', listingId)
    );

    const querySnapshot = await getDocs(q);
    const reviews = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      });
    });

    // Sort by createdAt descending (newest first)
    reviews.sort((a, b) => {
      const aDate = a.createdAt || new Date(0);
      const bDate = b.createdAt || new Date(0);
      return bDate - aDate;
    });

    return reviews;
  } catch (error) {
    return [];
  }
};

/**
 * Get reviews by a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of review documents
 */
export const getUserReviews = async (userId) => {
  try {
    const reviewsCollection = collection(db, 'reviews');
    const q = query(
      reviewsCollection,
      where('reviewerId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const reviews = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      });
    });

    // Sort by createdAt descending
    reviews.sort((a, b) => {
      const aDate = a.createdAt || new Date(0);
      const bDate = b.createdAt || new Date(0);
      return bDate - aDate;
    });

    return reviews;
  } catch (error) {
    return [];
  }
};

/**
 * Get review by booking ID
 * @param {string} bookingId - The booking ID
 * @returns {Promise<Object|null>} - Review document or null
 */
export const getReviewByBookingId = async (bookingId) => {
  try {
    const reviewsCollection = collection(db, 'reviews');
    const q = query(
      reviewsCollection,
      where('bookingId', '==', bookingId)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const reviewDoc = querySnapshot.docs[0];
    const data = reviewDoc.data();
    
    return {
      id: reviewDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    };
  } catch (error) {
    return null;
  }
};

/**
 * Update listing's average rating and review count
 * @param {string} listingId - The listing ID
 */
export const updateListingRating = async (listingId) => {
  try {
    const reviews = await getListingReviews(listingId);
    
    if (reviews.length === 0) {
      // Reset rating if no reviews
      await updateDoc(doc(db, 'listings', listingId), {
        rating: 0,
        reviews: 0,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal

    // Update listing
    await updateDoc(doc(db, 'listings', listingId), {
      rating: roundedRating,
      reviews: reviews.length,
      updatedAt: serverTimestamp(),
    });

    } catch (error) {
    }
};

/**
 * Get review statistics for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Review statistics
 */
export const getUserReviewStats = async (userId) => {
  try {
    const reviews = await getUserReviews(userId);
    
    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    const ratingDistribution = reviews.reduce((acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1;
      return acc;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

    return {
      totalReviews: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  } catch (error) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }
};

