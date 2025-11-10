import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

/**
 * Automatically mark bookings as completed if checkout date has passed + 1 day
 * This runs on admin dashboard load
 */
export const autoCompleteBookings = async () => {
  try {
    const now = new Date();
    
    const bookingsRef = collection(db, 'bookings');
    const confirmedBookingsQuery = query(
      bookingsRef,
      where('status', '==', 'confirmed')
    );
    
    const bookingsSnapshot = await getDocs(confirmedBookingsQuery);
    const updates = [];
    
    bookingsSnapshot.forEach(bookingDoc => {
      const booking = bookingDoc.data();
      let completionDate = null;
      
      // Determine completion date based on category
      if (booking.category === 'accommodation') {
        // For accommodations, use checkOutDate + 1 day
        if (booking.checkOutDate) {
          const checkOut = booking.checkOutDate?.toDate 
            ? booking.checkOutDate.toDate() 
            : new Date(booking.checkOutDate);
          completionDate = new Date(checkOut.getTime() + 24 * 60 * 60 * 1000); // +1 day after checkout
        }
      } else if (booking.category === 'experience' || booking.category === 'service') {
        // For experiences/services, use the scheduled date + 1 day
        // If no scheduled date, use checkInDate or createdAt
        let scheduledDate = null;
        if (booking.scheduledDate) {
          scheduledDate = booking.scheduledDate?.toDate 
            ? booking.scheduledDate.toDate()
            : new Date(booking.scheduledDate);
        } else if (booking.checkInDate) {
          scheduledDate = booking.checkInDate?.toDate
            ? booking.checkInDate.toDate()
            : new Date(booking.checkInDate);
        } else if (booking.createdAt) {
          scheduledDate = booking.createdAt?.toDate
            ? booking.createdAt.toDate()
            : new Date(booking.createdAt);
        }
        
        if (scheduledDate) {
          completionDate = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000); // +1 day after scheduled date
        }
      }
      
      // Auto-complete if completion date has passed (1 day after checkout/scheduled date)
      if (completionDate && completionDate <= now) {
        updates.push({
          bookingId: bookingDoc.id,
          booking
        });
      }
    });
    
    // Update all eligible bookings
    for (const update of updates) {
      await updateDoc(doc(db, 'bookings', update.bookingId), {
        status: 'completed',
        autoCompleted: true,
        autoCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true, updated: updates.length };
  } catch (error) {
    console.error('Error auto-completing bookings:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Release earnings to host for a completed booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const releaseHostEarnings = async (bookingId) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      return { success: false, message: 'Booking not found' };
    }
    
    const booking = bookingDoc.data();
    
    if (booking.status !== 'completed') {
      return { success: false, message: 'Booking must be completed before releasing earnings' };
    }
    
    if (booking.earningsReleased) {
      return { success: false, message: 'Earnings already released for this booking' };
    }
    
    // Calculate host earnings (total price - service fee)
    const totalPrice = booking.totalPrice || 0;
    const serviceFee = Math.round(totalPrice * 0.033); // 3.3% service fee
    const hostEarnings = totalPrice - serviceFee;
    
    // Update booking with earnings release info
    await updateDoc(bookingRef, {
      earningsReleased: true,
      earningsReleasedAt: serverTimestamp(),
      earningsReleasedBy: 'admin', // Can be enhanced to track admin user ID
      hostEarnings: hostEarnings,
      serviceFee: serviceFee,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: `Earnings of ${hostEarnings.toLocaleString()} released to host`,
      hostEarnings,
      serviceFee
    };
  } catch (error) {
    console.error('Error releasing host earnings:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get pending earnings (completed bookings awaiting release)
 */
export const getPendingEarnings = async () => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const completedBookingsQuery = query(
      bookingsRef,
      where('status', '==', 'completed')
    );
    
    const bookingsSnapshot = await getDocs(completedBookingsQuery);
    const pendingEarnings = [];
    
    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      
      if (!booking.earningsReleased) {
        const totalPrice = booking.totalPrice || 0;
        const serviceFee = Math.round(totalPrice * 0.033);
        const hostEarnings = totalPrice - serviceFee;
        
        // Get host info
        const hostDoc = await getDoc(doc(db, 'users', booking.ownerId));
        const hostData = hostDoc.exists() ? hostDoc.data() : {};
        
        // Get guest info
        const guestDoc = await getDoc(doc(db, 'users', booking.guestId));
        const guestData = guestDoc.exists() ? guestDoc.data() : {};
        
        // Get listing info
        const listingDoc = await getDoc(doc(db, 'listings', booking.listingId));
        const listingData = listingDoc.exists() ? listingDoc.data() : {};
        
        pendingEarnings.push({
          bookingId: bookingDoc.id,
          ...booking,
          hostName: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
          hostEmail: hostData.email,
          guestName: `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim() || guestData.email || 'Unknown',
          listingTitle: listingData.title || 'Unknown Listing',
          totalPrice,
          serviceFee,
          hostEarnings,
          completedAt: booking.autoCompletedAt || booking.updatedAt || booking.createdAt
        });
      }
    }
    
    // Sort by completion date (oldest first)
    pendingEarnings.sort((a, b) => {
      const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt);
      const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt);
      return dateA - dateB;
    });
    
    return pendingEarnings;
  } catch (error) {
    console.error('Error getting pending earnings:', error);
    return [];
  }
};

/**
 * Get released earnings summary
 */
export const getReleasedEarningsSummary = async () => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const releasedBookingsQuery = query(
      bookingsRef,
      where('earningsReleased', '==', true)
    );
    
    const bookingsSnapshot = await getDocs(releasedBookingsQuery);
    
    let totalReleased = 0;
    let totalServiceFees = 0;
    const byHost = {};
    
    // Get unique host IDs first
    const hostIds = new Set();
    bookingsSnapshot.forEach(bookingDoc => {
      const booking = bookingDoc.data();
      hostIds.add(booking.ownerId);
    });
    
    // Fetch host data
    const hostDataMap = {};
    for (const hostId of hostIds) {
      try {
        const hostDoc = await getDoc(doc(db, 'users', hostId));
        if (hostDoc.exists()) {
          const hostData = hostDoc.data();
          hostDataMap[hostId] = {
            name: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
            email: hostData.email
          };
        }
      } catch (error) {
        console.error(`Error fetching host ${hostId}:`, error);
      }
    }
    
    bookingsSnapshot.forEach(bookingDoc => {
      const booking = bookingDoc.data();
      const hostEarnings = booking.hostEarnings || 0;
      const serviceFee = booking.serviceFee || 0;
      
      totalReleased += hostEarnings;
      totalServiceFees += serviceFee;
      
      if (!byHost[booking.ownerId]) {
        byHost[booking.ownerId] = {
          hostId: booking.ownerId,
          hostName: hostDataMap[booking.ownerId]?.name || 'Unknown',
          hostEmail: hostDataMap[booking.ownerId]?.email || '',
          totalEarnings: 0,
          totalServiceFees: 0,
          bookingCount: 0
        };
      }
      
      byHost[booking.ownerId].totalEarnings += hostEarnings;
      byHost[booking.ownerId].totalServiceFees += serviceFee;
      byHost[booking.ownerId].bookingCount += 1;
    });
    
    return {
      totalReleased,
      totalServiceFees,
      byHost: Object.values(byHost)
    };
  } catch (error) {
    console.error('Error getting released earnings summary:', error);
    return { totalReleased: 0, totalServiceFees: 0, byHost: [] };
  }
};

