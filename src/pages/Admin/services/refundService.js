import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

/**
 * Get pending refunds (cancelled bookings with refundPending: true)
 */
export const getPendingRefunds = async () => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const cancelledBookingsQuery = query(
      bookingsRef,
      where('status', '==', 'cancelled'),
      where('refundPending', '==', true)
    );
    
    const bookingsSnapshot = await getDocs(cancelledBookingsQuery);
    const pendingRefunds = [];
    
    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      
      // Get guest info
      const guestDoc = await getDoc(doc(db, 'users', booking.guestId));
      const guestData = guestDoc.exists() ? guestDoc.data() : {};
      
      // Get host info
      const hostDoc = await getDoc(doc(db, 'users', booking.ownerId));
      const hostData = hostDoc.exists() ? hostDoc.data() : {};
      
      // Get listing info
      const listingDoc = await getDoc(doc(db, 'listings', booking.listingId));
      const listingData = listingDoc.exists() ? listingDoc.data() : {};
      
      pendingRefunds.push({
        bookingId: bookingDoc.id,
        ...booking,
        guestName: `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim() || guestData.email || 'Unknown',
        guestEmail: guestData.email || booking.guestEmail,
        hostName: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
        hostEmail: hostData.email || booking.ownerEmail,
        listingTitle: listingData.title || 'Unknown Listing',
        refundRequestedAt: booking.refundRequestedAt || booking.cancelledAt || booking.updatedAt
      });
    }
    
    // Sort by refund request date (oldest first)
    pendingRefunds.sort((a, b) => {
      const dateA = a.refundRequestedAt?.toDate ? a.refundRequestedAt.toDate() : new Date(a.refundRequestedAt);
      const dateB = b.refundRequestedAt?.toDate ? b.refundRequestedAt.toDate() : new Date(b.refundRequestedAt);
      return dateA - dateB;
    });
    
    return pendingRefunds;
  } catch (error) {
    return [];
  }
};

/**
 * Process refund for a cancelled booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const processRefund = async (bookingId) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      return { success: false, message: 'Booking not found' };
    }
    
    const booking = bookingDoc.data();
    
    if (booking.status !== 'cancelled') {
      return { success: false, message: 'Booking is not cancelled' };
    }
    
    if (!booking.refundPending) {
      return { success: false, message: 'Refund is not pending for this booking' };
    }
    
    if (booking.paymentStatus !== 'paid') {
      // If not paid, just mark refund as processed
      await updateDoc(bookingRef, {
        refundPending: false,
        refundProcessed: true,
        refundProcessedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, message: 'Refund marked as processed (booking was not paid)' };
    }
    
    // Booking was paid - process refund
    const refundAmount = booking.refundAmount || 0;
    const refundType = booking.refundType || 'full_refund';
    const earningsReleased = booking.earningsReleased || false;
    const hostRefundAmount = booking.hostRefundAmount || null;
    const bookingAmount = booking.bookingAmount || 0;
    
    if (refundAmount <= 0) {
      return { success: false, message: 'Invalid refund amount' };
    }
    
    // Import GetPay service functions
    const { 
      addToWallet, 
      deductFromWallet, 
      initializeWallet, 
      getWalletBalance
    } = await import('@/pages/Common/services/getpayService');
    
    // Initialize wallets
    await initializeWallet(booking.ownerId);
    await initializeWallet(booking.guestId);
    
    // Get listing info for transaction description
    const listingRef = doc(db, 'listings', booking.listingId);
    const listingDoc = await getDoc(listingRef);
    const listingTitle = listingDoc.exists() ? listingDoc.data().title || 'Accommodation' : 'Accommodation';
    
    // Refunds now come from host wallet (hosts received earnings when booking was confirmed)
    // Check host balance before refunding to guest
    const hostBalance = await getWalletBalance(booking.ownerId);
    
    if (hostBalance < refundAmount) {
      console.error(`❌ Host has insufficient balance (₱${hostBalance.toLocaleString()}) to refund ₱${refundAmount.toLocaleString()}`);
      return { 
        success: false, 
        message: `Unable to process refund. Host has insufficient balance (₱${hostBalance.toLocaleString()}). Please ask host to add funds to their wallet.` 
      };
    }
    
    // Deduct from host wallet (host received earnings when booking was confirmed)
    await deductFromWallet(
      booking.ownerId,
      refundAmount,
      `Refund - Cancelled Booking (${refundType === 'full_refund' ? 'Full' : 'Half'})`,
      {
        bookingId: bookingId,
        listingId: booking.listingId,
        listingTitle: listingTitle,
        guestId: booking.guestId,
        guestEmail: booking.guestEmail,
        paymentType: 'booking_cancellation_refund',
        refundType: refundType,
        earningsReleased: earningsReleased
      },
      true // skipAuthCheck for admin system operations
    );
    
    // Add to guest wallet
    await addToWallet(
      booking.guestId,
      refundAmount,
      `Refund - Cancelled Booking - ${listingTitle} (${refundType === 'full_refund' ? 'Full' : 'Half'})`,
      {
        bookingId: bookingId,
        listingId: booking.listingId,
        listingTitle: listingTitle,
        hostId: booking.ownerId,
        hostEmail: booking.ownerEmail,
        paymentType: 'booking_cancellation_refund',
        refundType: refundType,
        originalStatus: booking.originalStatus || 'pending'
      }
    );
    
    // Update booking status
    await updateDoc(bookingRef, {
      refundPending: false,
      refundProcessed: true,
      refundProcessedAt: serverTimestamp(),
      refundProcessedBy: 'admin',
      updatedAt: serverTimestamp()
    });
    
    const refundMessage = refundType === 'full_refund'
      ? `Full refund of ₱${refundAmount.toLocaleString()} has been processed and added to guest's wallet (deducted from host wallet).`
      : `Half refund of ₱${refundAmount.toLocaleString()} has been processed and added to guest's wallet (deducted from host wallet).`;
    
    return { 
      success: true, 
      message: refundMessage
    };
    
  } catch (error) {
    return { success: false, message: error.message || 'Failed to process refund' };
  }
};

