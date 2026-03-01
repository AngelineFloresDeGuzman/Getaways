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
 * Award points automatically when a host publishes their FIRST listing only
 * Subsequent listings will not receive points (only milestone points apply)
 * @param {string} hostId - Host user ID
 * @param {string} listingId - Listing ID (for tracking)
 * @returns {Promise<{success: boolean, message?: string, points?: number}>}
 */
export const awardPointsForFirstListing = async (hostId, listingId = null) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, message: 'User not found' };
    }
    
    const userData = userDoc.data();
    const pointsHistory = userData.pointsHistory || [];
    
    // Check if points were already awarded for ANY listing (first listing bonus)
    // This ensures only the FIRST listing gets the 50 points bonus
    const hasAwardedFirstListing = pointsHistory.some(
      entry => entry.source === 'listing_published' && entry.reason === 'First listing published'
    );
    
    if (hasAwardedFirstListing) {
      console.log(`ℹ️ First listing points already awarded. This listing (${listingId}) will not receive points.`);
      return { 
        success: false, 
        message: 'First listing bonus already awarded. Only the first listing receives 50 points.' 
      };
    }
    
    // Also check if this specific listing already got points (prevent duplicate awards)
    if (listingId) {
      const hasAwardedForThisListing = pointsHistory.some(
        entry => entry.listingId === listingId && entry.source === 'listing_published'
      );
      
      if (hasAwardedForThisListing) {
        return { success: false, message: 'Points already awarded for this listing' };
      }
    }
    
    // This is the first listing - award 50 points
    const points = 50;
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + points;
    
    const historyEntry = {
      points: points,
      totalPoints: newPoints,
      reason: 'First listing published',
      listingId: listingId,
      timestamp: Timestamp.now(),
      type: 'auto_awarded',
      source: 'listing_published',
      canBeDeducted: true // Flag to indicate this can be deducted if listing is unpublished
    };
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });
    
    console.log(`✅ Awarded ${points} points for first listing (${listingId})`);
    return { success: true, points, newPoints };
  } catch (error) {
    // Don't throw - this is a bonus feature, shouldn't break listing publication
    return { success: false, message: error.message };
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
    if (!hostId) {
      return;
    }
    
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return;
    }
    
    const userData = userDoc.data();
    // Check if points already awarded for this review
    const alreadyAwarded = userData.pointsHistory?.some(
      entry => entry.reviewId === reviewId && entry.source === 'review_received'
    );
    
    if (alreadyAwarded) {
      return { success: false, reason: 'already_awarded' };
    }
    
    // Award points based on rating
    let points = 0;
    if (rating === 5) points = 25;
    else if (rating === 4) points = 15;
    else if (rating === 3) points = 5;
    // No points for 1-2 star ratings
    
    if (points === 0) {
      return { success: false, reason: 'rating_too_low' };
    }
    
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + points;
    
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
    
    return { success: true, points, newPoints };
  } catch (error) {
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

    return { success: true, points, newPoints };
  } catch (error) {
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
    // Don't throw - this is a bonus feature
  }
};

/**
 * Points to currency conversion rate
 * 10 points = ₱1 (PHP)
 * 1 point = ₱0.10
 */
const POINTS_TO_CURRENCY_RATE = 0.1; // 10 points = ₱1

/**
 * Deduct points/value when a listing is unpublished
 * This prevents point abuse by unpublishing and republishing listings
 * @param {string} hostId - Host user ID
 * @param {string} listingId - Listing ID that was unpublished
 * @returns {Promise<{success: boolean, deductedFrom: string, amount: number}>}
 */
export const deductPointsForUnpublishedListing = async (hostId, listingId) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    const pointsHistory = userData.pointsHistory || [];
    
    // Log all listing_published entries for debugging
    const publishedEntries = pointsHistory.filter(entry => entry.source === 'listing_published');
    console.log(`📝 Found ${publishedEntries.length} listing_published entries:`, 
      publishedEntries.map(e => ({ listingId: e.listingId, points: e.points, reason: e.reason }))
    );
    
    // Find the points entry for this listing
    const listingPointsEntry = pointsHistory.find(
      entry => entry.listingId === listingId && 
               entry.source === 'listing_published' &&
               entry.canBeDeducted !== false
    );
    
    if (!listingPointsEntry) {
      // Check if points were awarded but maybe with different listingId format
      const anyListingPoints = pointsHistory.filter(
        entry => entry.source === 'listing_published'
      );
      
      // Check if there's already an unpublished entry (to prevent duplicate tracking)
      const hasUnpublishedEntry = pointsHistory.some(
        entry => entry.listingId === listingId && entry.source === 'listing_unpublished'
      );
      
      if (hasUnpublishedEntry) {
        console.log(`ℹ️ Already tracked as unpublished (no points to deduct)`);
        return { 
          success: true, 
          deductedFrom: 'none', 
          amount: 0, 
          message: 'Listing already tracked as unpublished (no points were awarded when published)' 
        };
      }
      
      if (anyListingPoints.length === 0) {
        // Track that this listing was unpublished (even without points) to prevent awarding points when republished
        const trackingEntry = {
          points: 0,
          totalPoints: userData.points || 0,
          reason: `Listing unpublished (no points awarded) - ${listingId}`,
          listingId: listingId,
          timestamp: Timestamp.now(),
          type: 'tracking',
          source: 'listing_unpublished',
          noPointsAwarded: true
        };
        
        await updateDoc(userRef, {
          pointsHistory: [trackingEntry, ...pointsHistory].slice(0, 50),
          lastPointsUpdate: serverTimestamp()
        });
        
        console.log(`✅ Tracked unpublished listing (no points to deduct)`);
        return { 
          success: true, 
          deductedFrom: 'none', 
          amount: 0, 
          message: 'No points were awarded for this listing (published before points system). Listing tracked to prevent points on republish.' 
        };
      } else {
        // Track that this listing was unpublished (even without points) to prevent awarding points when republished
        const trackingEntry = {
          points: 0,
          totalPoints: userData.points || 0,
          reason: `Listing unpublished (no points awarded) - ${listingId}`,
          listingId: listingId,
          timestamp: Timestamp.now(),
          type: 'tracking',
          source: 'listing_unpublished',
          noPointsAwarded: true
        };
        
        await updateDoc(userRef, {
          pointsHistory: [trackingEntry, ...pointsHistory].slice(0, 50),
          lastPointsUpdate: serverTimestamp()
        });
        
        console.log(`✅ Tracked unpublished listing (no points to deduct)`);
        return { 
          success: true, 
          deductedFrom: 'none', 
          amount: 0, 
          message: `No points awarded for listing ${listingId}. Listing tracked to prevent points on republish.` 
        };
      }
    }
    
    // Check if points were already deducted (to prevent double deduction)
    const alreadyDeducted = pointsHistory.some(
      entry => entry.listingId === listingId && 
               entry.source === 'listing_unpublished'
    );
    
    if (alreadyDeducted) {
      return { success: true, deductedFrom: 'already_deducted', amount: 0, message: 'Points already deducted for this listing' };
    }
    
    const pointsToDeduct = listingPointsEntry.points || 50; // Default to 50 if not specified
    const currencyValue = pointsToDeduct * POINTS_TO_CURRENCY_RATE;
    
    console.log(`💰 Points to deduct: ${pointsToDeduct} (currency value: ₱${currencyValue})`);
    
    // Try to deduct from points first
    const currentPoints = userData.points || 0;
    let pointsDeducted = 0;
    let walletDeducted = 0;
    let remainingDeduction = pointsToDeduct;
    
    // Step 1: Deduct from available points
    if (currentPoints > 0) {
      pointsDeducted = Math.min(currentPoints, pointsToDeduct);
      remainingDeduction = pointsToDeduct - pointsDeducted;
      } else {
      }
    
    // Step 2: If points are insufficient, deduct from GetPay wallet
    if (remainingDeduction > 0) {
      try {
        const { getWalletBalance, deductFromWallet, initializeWallet } = await import('@/pages/Common/services/getpayService');
        await initializeWallet(hostId);
        
        const walletBalance = await getWalletBalance(hostId);
        const currencyToDeduct = remainingDeduction * POINTS_TO_CURRENCY_RATE;
        
        if (walletBalance >= currencyToDeduct) {
          // Deduct from wallet (full amount)
          await deductFromWallet(
            hostId,
            currencyToDeduct,
            `Points deduction for unpublished listing`,
            {
              listingId: listingId,
              pointsDeducted: remainingDeduction,
              reason: 'listing_unpublished'
            },
            true // Skip auth check for system-level deduction
          );
          walletDeducted = remainingDeduction;
          remainingDeduction = 0;
        } else if (walletBalance > 0) {
          // Deduct partial amount from wallet
          const pointsEquivalentFromWallet = walletBalance / POINTS_TO_CURRENCY_RATE;
          await deductFromWallet(
            hostId,
            walletBalance,
            `Points deduction for unpublished listing (partial)`,
            {
              listingId: listingId,
              pointsDeducted: pointsEquivalentFromWallet,
              reason: 'listing_unpublished',
              partial: true
            },
            true // Skip auth check for system-level deduction
          );
          walletDeducted = pointsEquivalentFromWallet;
          remainingDeduction = pointsToDeduct - pointsDeducted - walletDeducted;
        }
      } catch (walletError) {
        // Continue with points deduction even if wallet deduction fails
      }
    }
    
    // Step 3: Update points (deduct what we can from points)
    const newPoints = Math.max(0, currentPoints - pointsDeducted);
    
    // Create deduction history entry
    const deductionEntry = {
      points: -pointsToDeduct,
      totalPoints: newPoints,
      reason: `Listing unpublished - ${listingId}`,
      listingId: listingId,
      timestamp: Timestamp.now(),
      type: 'auto_deducted',
      source: 'listing_unpublished',
      pointsDeducted: pointsDeducted,
      walletDeducted: walletDeducted,
      remainingDebt: remainingDeduction,
      originalPointsEntry: listingPointsEntry.points
    };
    
    // Mark the original points entry as deducted
    const updatedPointsHistory = pointsHistory.map(entry => {
      if (entry.listingId === listingId && entry.source === 'listing_published') {
        return {
          ...entry,
          deducted: true,
          deductedAt: Timestamp.now()
        };
      }
      return entry;
    });
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [deductionEntry, ...updatedPointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });
    
    // If there's remaining debt, store it for future deduction
    if (remainingDeduction > 0) {
      // Store debt information in user document
      const existingDebts = userData.pointsDebts || [];
      const debtEntry = {
        listingId: listingId,
        points: remainingDeduction,
        currencyValue: remainingDeduction * POINTS_TO_CURRENCY_RATE,
        createdAt: Timestamp.now(),
        status: 'pending'
      };
      
      await updateDoc(userRef, {
        pointsDebts: [debtEntry, ...existingDebts].slice(0, 50)
      });
    }
    
    const result = {
      success: true,
      deductedFrom: pointsDeducted > 0 ? (walletDeducted > 0 ? 'points_and_wallet' : 'points') : (walletDeducted > 0 ? 'wallet' : 'none'),
      pointsDeducted: pointsDeducted,
      walletDeducted: walletDeducted,
      remainingDebt: remainingDeduction,
      totalDeducted: pointsDeducted + walletDeducted
    };
    
    return result;
  } catch (error) {
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

/**
 * Restore points/value when a listing is republished
 * This restores the deducted points if the listing was previously unpublished
 * @param {string} hostId - Host user ID
 * @param {string} listingId - Listing ID that was republished
 * @returns {Promise<{success: boolean, restored: boolean}>}
 */
export const restorePointsForRepublishedListing = async (hostId, listingId) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    const pointsHistory = userData.pointsHistory || [];
    
    // Check if points were already awarded for this listing (even if deducted later)
    const hasAwardedForListing = pointsHistory.some(
      entry => entry.listingId === listingId && 
               entry.source === 'listing_published'
    );
    
    // Check if points were deducted for this listing
    const deductionEntry = pointsHistory.find(
      entry => entry.listingId === listingId && 
               entry.source === 'listing_unpublished'
    );
    
    // Check if listing was tracked as unpublished without points
    const noPointsEntry = deductionEntry && deductionEntry.noPointsAwarded === true;
    
    // Check if already restored
    const alreadyRestored = pointsHistory.some(
      entry => entry.listingId === listingId && 
               entry.source === 'listing_republished'
    );
    
    if (alreadyRestored) {
      return { success: true, restored: false, message: 'Points already restored for this republish' };
    }
    
    // If listing was unpublished without points (tracked but no points to restore)
    if (noPointsEntry) {
      // Don't award points on republish if it was published before points system
      return { success: true, restored: false, message: 'No points to restore (listing was published before points system)' };
    }
    
    // If points were never awarded for this listing, check if this should be the first listing
    if (!hasAwardedForListing && !deductionEntry) {
      // Try to award points (will only work if this is truly the first listing)
      const awardResult = await awardPointsForFirstListing(hostId, listingId);
      if (awardResult.success) {
        return { success: true, restored: true, pointsRestored: awardResult.points, newPoints: awardResult.newPoints };
      } else {
        // Not the first listing, so no points will be awarded
        return { success: true, restored: false, message: awardResult.message || 'This listing does not qualify for first listing bonus' };
      }
    }
    
    // If points were awarded but NOT deducted, do nothing (points are still there)
    if (hasAwardedForListing && !deductionEntry) {
      return { success: true, restored: false, message: 'Points were never deducted, no restoration needed' };
    }
    
    // Points were awarded and then deducted, so restore them
    const pointsToRestore = Math.abs(deductionEntry.points) || 50;
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + pointsToRestore;
    
    // Create restoration entry
    const restorationEntry = {
      points: pointsToRestore,
      totalPoints: newPoints,
      reason: `Listing republished - ${listingId}`,
      listingId: listingId,
      timestamp: Timestamp.now(),
      type: 'auto_restored',
      source: 'listing_republished',
      originalDeduction: deductionEntry.points
    };
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [restorationEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });
    
    // Clear any pending debts for this listing
    const pointsDebts = userData.pointsDebts || [];
    const updatedDebts = pointsDebts.filter(debt => debt.listingId !== listingId);
    
    if (updatedDebts.length !== pointsDebts.length) {
      await updateDoc(userRef, {
        pointsDebts: updatedDebts
      });
    }
    
    return { success: true, restored: true, pointsRestored: pointsToRestore, newPoints };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Cash out points to GetPay wallet
 * Converts points to currency and adds to GetPay wallet
 * @param {string} hostId - Host user ID
 * @param {number} points - Points to cash out
 * @returns {Promise<{success: boolean, currencyAmount: number, newPoints: number}>}
 */
export const cashOutPoints = async (hostId, points) => {
  try {
    if (points <= 0) {
      return { success: false, error: 'Points amount must be greater than 0' };
    }

    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;

    if (currentPoints < points) {
      return { 
        success: false, 
        error: `Insufficient points. You have ${currentPoints} points but need ${points} points.` 
      };
    }

    // Convert points to currency (10 points = ₱1)
    const currencyAmount = points * POINTS_TO_CURRENCY_RATE;
    const newPoints = currentPoints - points;

    // Deduct from admin wallet and add to host wallet
    const { 
      addToWallet, 
      initializeWallet, 
      deductFromWallet,
      getAdminUserId 
    } = await import('@/pages/Common/services/getpayService');
    
    // Get admin user ID
    const adminUserId = await getAdminUserId();
    if (!adminUserId) {
      return { success: false, error: 'Admin user not found. Cannot process points cash out.' };
    }
    
    // Initialize wallets if needed
    await initializeWallet(adminUserId);
    await initializeWallet(hostId);
    
    // Check admin balance before deducting
    const { getWalletBalance } = await import('@/pages/Common/services/getpayService');
    const adminBalance = await getWalletBalance(adminUserId);
    
    if (adminBalance < currencyAmount) {
      return { 
        success: false, 
        error: `Insufficient admin balance. Admin has ₱${adminBalance.toFixed(2)} but needs ₱${currencyAmount.toFixed(2)}. Please contact support.` 
      };
    }
    
    // Deduct from admin wallet first
    await deductFromWallet(
      adminUserId,
      currencyAmount,
      `Points Cash Out - Host Payment (${points} points = ₱${currencyAmount.toFixed(2)})`,
      {
        hostId: hostId,
        hostEmail: userData.email,
        pointsCashedOut: points,
        conversionRate: POINTS_TO_CURRENCY_RATE,
        paymentType: 'points_cashout'
      },
      true // skipAuthCheck for system operations
    );
    
    // Then add to host wallet
    await addToWallet(
      hostId,
      currencyAmount,
      `Points cashed out (${points} points)`,
      {
        pointsCashedOut: points,
        conversionRate: POINTS_TO_CURRENCY_RATE,
        reason: 'points_cashout'
      }
    );

    // Deduct points from user
    const historyEntry = {
      points: -points,
      totalPoints: newPoints,
      reason: `Points cashed out to GetPay wallet (${points} points = ₱${currencyAmount.toFixed(2)})`,
      timestamp: Timestamp.now(),
      type: 'cashout',
      source: 'points_cashout',
      currencyAmount: currencyAmount
    };

    const pointsHistory = userData.pointsHistory || [];
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });

    console.log(`✅ Cashed out ${points} points (₱${currencyAmount.toFixed(2)}) for host ${hostId}`);
    return { success: true, currencyAmount, newPoints };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Deduct points for payment (subscription or booking)
 * @param {string} hostId - Host user ID
 * @param {number} amount - Payment amount in currency
 * @param {string} reason - Payment reason (e.g., 'subscription', 'booking')
 * @param {Object} metadata - Additional metadata (bookingId, listingId, etc.)
 * @returns {Promise<{success: boolean, pointsUsed: number, currencyAmount: number, newPoints: number, remainingAmount: number}>}
 */
export const deductPointsForPayment = async (hostId, amount, reason, metadata = {}) => {
  try {
    if (amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0' };
    }

    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;

    // Convert currency to points (10 points = ₱1)
    const pointsNeeded = Math.ceil(amount / POINTS_TO_CURRENCY_RATE); // Round up to ensure full payment
    const pointsUsed = Math.min(currentPoints, pointsNeeded);
    const currencyPaid = pointsUsed * POINTS_TO_CURRENCY_RATE;
    const remainingAmount = Math.max(0, amount - currencyPaid);
    const newPoints = currentPoints - pointsUsed;

    if (pointsUsed === 0) {
      return { 
        success: false, 
        error: `Insufficient points. You need ${pointsNeeded} points (₱${amount.toFixed(2)}) but have ${currentPoints} points.` 
      };
    }

    // Deduct points from user
    const historyEntry = {
      points: -pointsUsed,
      totalPoints: newPoints,
      reason: `Points used for ${reason} (${pointsUsed} points = ₱${currencyPaid.toFixed(2)})`,
      timestamp: Timestamp.now(),
      type: 'payment',
      source: `points_payment_${reason}`,
      currencyAmount: currencyPaid,
      paymentAmount: amount,
      remainingAmount: remainingAmount,
      metadata: metadata
    };

    const pointsHistory = userData.pointsHistory || [];
    
    await updateDoc(userRef, {
      points: newPoints,
      pointsHistory: [historyEntry, ...pointsHistory].slice(0, 50),
      lastPointsUpdate: serverTimestamp()
    });

    console.log(`✅ Deducted ${pointsUsed} points (₱${currencyPaid.toFixed(2)}) for ${reason} for host ${hostId}`);
    return { 
      success: true, 
      pointsUsed, 
      currencyAmount: currencyPaid, 
      newPoints, 
      remainingAmount 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Check if user has sufficient points for payment
 * @param {string} hostId - Host user ID
 * @param {number} amount - Payment amount in currency
 * @returns {Promise<{hasSufficient: boolean, currentPoints: number, pointsNeeded: number, currencyAmount: number}>}
 */
export const checkPointsForPayment = async (hostId, amount) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { hasSufficient: false, currentPoints: 0, pointsNeeded: 0, currencyAmount: 0 };
    }

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;

    // Convert currency to points (10 points = ₱1)
    const pointsNeeded = Math.ceil(amount / POINTS_TO_CURRENCY_RATE);
    const hasSufficient = currentPoints >= pointsNeeded;
    const currencyAmount = Math.min(currentPoints * POINTS_TO_CURRENCY_RATE, amount);

    return { 
      hasSufficient, 
      currentPoints, 
      pointsNeeded, 
      currencyAmount 
    };
  } catch (error) {
    return { hasSufficient: false, currentPoints: 0, pointsNeeded: 0, currencyAmount: 0 };
  }
};

