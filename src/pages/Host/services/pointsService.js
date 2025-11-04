// Points & Rewards Service for Host Accounts
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, serverTimestamp, Timestamp, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

/**
 * Get host points from Firebase
 * @param {string} userId - Host user ID
 * @returns {Promise<{points: number, rewards: Array, history: Array}>}
 */
export const getHostPoints = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        points: userData.points || 0,
        rewards: userData.rewards || [],
        pointsHistory: userData.pointsHistory || []
      };
    }
    return { points: 0, rewards: [], pointsHistory: [] };
  } catch (error) {
    console.error('Error getting host points:', error);
    throw error;
  }
};

/**
 * Award points to a host (Admin only)
 * @param {string} hostId - Host user ID
 * @param {number} points - Points to award
 * @param {string} reason - Reason for awarding points
 * @param {string} adminId - Admin user ID who is awarding
 * @returns {Promise<void>}
 */
export const awardPointsToHost = async (hostId, points, reason, adminId) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Host not found');
    }

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + points;
    const historyEntry = {
      points: points,
      totalPoints: newPoints,
      reason: reason,
      awardedBy: adminId,
      timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for arrays
      type: 'awarded'
    };

    const pointsHistory = userData.pointsHistory || [];
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50), // Keep last 50 entries
      lastPointsUpdate: serverTimestamp()
    });

    return { success: true, newPoints };
  } catch (error) {
    console.error('Error awarding points:', error);
    throw error;
  }
};

/**
 * Deduct points from a host (Admin only)
 * @param {string} hostId - Host user ID
 * @param {number} points - Points to deduct
 * @param {string} reason - Reason for deducting points
 * @param {string} adminId - Admin user ID who is deducting
 * @returns {Promise<void>}
 */
export const deductPointsFromHost = async (hostId, points, reason, adminId) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Host not found');
    }

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;
    const newPoints = Math.max(0, currentPoints - points); // Don't go below 0
    const historyEntry = {
      points: -points,
      totalPoints: newPoints,
      reason: reason,
      deductedBy: adminId,
      timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for arrays
      type: 'deducted'
    };

    const pointsHistory = userData.pointsHistory || [];
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });

    return { success: true, newPoints };
  } catch (error) {
    console.error('Error deducting points:', error);
    throw error;
  }
};

/**
 * Get all hosts with their points (Admin only)
 * @returns {Promise<Array>}
 */
export const getAllHostsWithPoints = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('roles', 'array-contains', 'host'),
      orderBy('points', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting hosts with points:', error);
    // Fallback if index doesn't exist
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.roles && user.roles.includes('host'))
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  }
};

/**
 * Award points automatically when a host publishes their first listing
 * @param {string} hostId - Host user ID
 * @returns {Promise<void>}
 */
export const awardPointsForFirstListing = async (hostId) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    const hasAwardedFirstListing = userData.pointsHistory?.some(
      entry => entry.reason === 'First listing published'
    );
    
    if (hasAwardedFirstListing) {
      return; // Already awarded
    }
    
    const points = 50; // Points for first listing
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + points;
    
    const historyEntry = {
      points: points,
      totalPoints: newPoints,
      reason: 'First listing published',
      timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for arrays
      type: 'auto_awarded',
      source: 'listing_published'
    };
    
    const pointsHistory = userData.pointsHistory || [];
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });
    
    return { success: true, points, newPoints };
  } catch (error) {
    console.error('Error awarding points for first listing:', error);
    // Don't throw - this is a bonus feature, shouldn't break listing publication
  }
};

/**
 * Award points when a booking is confirmed
 * @param {string} hostId - Host user ID
 * @param {number} bookingAmount - Booking total amount
 * @param {string} bookingId - Booking ID
 * @returns {Promise<void>}
 */
export const awardPointsForBookingConfirmed = async (hostId, bookingAmount, bookingId) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    
    // Check if points already awarded for this booking
    const alreadyAwarded = userData.pointsHistory?.some(
      entry => entry.bookingId === bookingId && entry.source === 'booking_confirmed'
    );
    
    if (alreadyAwarded) {
      return; // Already awarded
    }
    
    // Calculate points: 1 point per 100 currency units (adjustable)
    const pointsPer100 = 1;
    const points = Math.floor(bookingAmount / 100) * pointsPer100;
    const minPoints = 10; // Minimum points for any confirmed booking
    const finalPoints = Math.max(points, minPoints);
    
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + finalPoints;
    
    const historyEntry = {
      points: finalPoints,
      totalPoints: newPoints,
      reason: `Booking confirmed (${bookingAmount.toLocaleString()} currency)`,
      bookingId: bookingId,
      timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for arrays
      type: 'auto_awarded',
      source: 'booking_confirmed'
    };
    
    const pointsHistory = userData.pointsHistory || [];
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });
    
    return { success: true, points: finalPoints, newPoints };
  } catch (error) {
    console.error('Error awarding points for booking:', error);
    // Don't throw - this is a bonus feature
  }
};

/**
 * Award points when host receives a positive review
 * @param {string} hostId - Host user ID
 * @param {number} rating - Review rating (1-5)
 * @param {string} reviewId - Review ID
 * @returns {Promise<void>}
 */
export const awardPointsForReview = async (hostId, rating, reviewId) => {
  try {
    console.log('🎯 awardPointsForReview: Starting', { hostId, rating, reviewId });
    
    if (!hostId) {
      console.error('❌ awardPointsForReview: No hostId provided');
      return;
    }
    
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('❌ awardPointsForReview: User document does not exist for hostId:', hostId);
      return;
    }
    
    const userData = userDoc.data();
    console.log('✅ awardPointsForReview: User document found, current points:', userData.points || 0);
    
    // Check if points already awarded for this review
    const alreadyAwarded = userData.pointsHistory?.some(
      entry => entry.reviewId === reviewId && entry.source === 'review_received'
    );
    
    if (alreadyAwarded) {
      console.log('ℹ️ awardPointsForReview: Points already awarded for this review');
      return { success: false, reason: 'already_awarded' };
    }
    
    // Award points based on rating
    let points = 0;
    if (rating === 5) points = 25;
    else if (rating === 4) points = 15;
    else if (rating === 3) points = 5;
    // No points for 1-2 star ratings
    
    if (points === 0) {
      console.log('ℹ️ awardPointsForReview: Rating too low, no points awarded');
      return { success: false, reason: 'rating_too_low' };
    }
    
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + points;
    
    console.log('🎯 awardPointsForReview: Updating points', {
      currentPoints,
      pointsToAdd: points,
      newPoints
    });
    
    const historyEntry = {
      points: points,
      totalPoints: newPoints,
      reason: `Received ${rating}-star review`,
      reviewId: reviewId,
      timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for arrays
      type: 'auto_awarded',
      source: 'review_received'
    };
    
    const pointsHistory = userData.pointsHistory || [];
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });
    
    console.log('✅ awardPointsForReview: Points updated successfully', {
      points,
      newPoints
    });
    
    return { success: true, points, newPoints };
  } catch (error) {
    console.error('❌ Error awarding points for review:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error; // Re-throw to see the actual error
  }
};

/**
 * Award birthday points if today is the host's birthday
 * @param {string} hostId - Host user ID
 * @param {string} birthday - Birthday string in format YYYY-MM-DD or Date object
 * @returns {Promise<{success: boolean, points?: number, message?: string}>}
 */
export const awardBirthdayPoints = async (hostId, birthday) => {
  try {
    if (!birthday) {
      return { success: false, message: 'No birthday set' };
    }

    // Parse birthday to get month and day
    let birthdayDate;
    if (typeof birthday === 'string') {
      // Format: YYYY-MM-DD
      const parts = birthday.split('-');
      if (parts.length !== 3) {
        return { success: false, message: 'Invalid birthday format' };
      }
      birthdayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else if (birthday.toDate) {
      // Firestore Timestamp
      birthdayDate = birthday.toDate();
    } else if (birthday instanceof Date) {
      birthdayDate = birthday;
    } else if (birthday.seconds) {
      // Timestamp object
      birthdayDate = new Date(birthday.seconds * 1000);
    } else {
      return { success: false, message: 'Invalid birthday format' };
    }

    // Get today's date (month and day only, ignore year)
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    const birthdayMonth = birthdayDate.getMonth();
    const birthdayDay = birthdayDate.getDate();

    // Check if today matches birthday (month and day)
    if (todayMonth !== birthdayMonth || todayDay !== birthdayDay) {
      return { success: false, message: 'Not birthday today' };
    }

    // Check if already awarded today
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, message: 'User not found' };
    }

    const userData = userDoc.data();
    
    // Check if birthday points were already awarded today
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const alreadyAwarded = userData.pointsHistory?.some(
      entry => entry.source === 'birthday' && 
               entry.timestamp && 
               (entry.timestamp.toDate ? entry.timestamp.toDate().toISOString().split('T')[0] : 
                (entry.timestamp.seconds ? new Date(entry.timestamp.seconds * 1000).toISOString().split('T')[0] : '')) === todayString
    );

    if (alreadyAwarded) {
      return { success: false, message: 'Birthday points already awarded today' };
    }

    // Award birthday points (500 points for birthday)
    const points = 500;
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + points;

    const historyEntry = {
      points: points,
      totalPoints: newPoints,
      reason: 'Happy Birthday! 🎉',
      timestamp: Timestamp.now(),
      type: 'auto_awarded',
      source: 'birthday'
    };

    const pointsHistory = userData.pointsHistory || [];

    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });

    console.log('✅ Birthday points awarded:', { points, newPoints });

    return { success: true, points, newPoints };
  } catch (error) {
    console.error('❌ Error awarding birthday points:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Award milestone points (e.g., 10 bookings, 50 bookings, etc.)
 * @param {string} hostId - Host user ID
 * @param {string} milestoneType - Type of milestone ('bookings', 'reviews', 'listings')
 * @param {number} milestoneCount - The milestone number reached
 * @returns {Promise<void>}
 */
export const awardMilestonePoints = async (hostId, milestoneType, milestoneCount) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    
    // Define milestones and their points
    const milestones = {
      bookings: {
        10: 100,
        25: 250,
        50: 500,
        100: 1000,
        250: 2500
      },
      reviews: {
        5: 50,
        10: 100,
        25: 250,
        50: 500
      },
      listings: {
        3: 150,
        5: 300,
        10: 750
      }
    };
    
    const milestonePoints = milestones[milestoneType]?.[milestoneCount];
    if (!milestonePoints) return;
    
    // Check if already awarded for this milestone
    const milestoneKey = `${milestoneType}_${milestoneCount}`;
    const alreadyAwarded = userData.pointsHistory?.some(
      entry => entry.milestoneKey === milestoneKey
    );
    
    if (alreadyAwarded) return;
    
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + milestonePoints;
    
    const historyEntry = {
      points: milestonePoints,
      totalPoints: newPoints,
      reason: `Milestone: ${milestoneCount} ${milestoneType}`,
      milestoneKey: milestoneKey,
      timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for arrays
      type: 'auto_awarded',
      source: 'milestone'
    };
    
    const pointsHistory = userData.pointsHistory || [];
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });
    
    return { success: true, points: milestonePoints, newPoints };
  } catch (error) {
    console.error('Error awarding milestone points:', error);
    // Don't throw - this is a bonus feature
  }
};

