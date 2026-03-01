import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

// Fixed 10% commission deducted from host earnings
export const HOST_COMMISSION_PERCENTAGE = 0.10;

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
    
    // Get booking amount (what guest paid - no service fee)
    // bookingAmount is stored when booking is created
    // For old bookings, use totalPrice as fallback (should equal bookingAmount since no guest fees)
    const bookingAmount = booking.bookingAmount || booking.totalPrice || 0;
    
    // Admin keeps 10% commission from bookingAmount
    // Host receives 90% of bookingAmount
    const adminCommission = Math.round((bookingAmount * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
    const hostEarnings = Math.round((bookingAmount * (1 - HOST_COMMISSION_PERCENTAGE)) * 100) / 100;
    
    // Transfer bookingAmount from admin's GetPay wallet to host's GetPay wallet
    try {
      const { 
        deductFromWallet: deductFromAdminWallet, 
        addToWallet: addToHostWallet, 
        initializeWallet,
        getAdminUserId 
      } = await import('@/pages/Common/services/getpayService');
      
      // Get admin user ID
      const adminUserId = await getAdminUserId();
      if (!adminUserId) {
        return { success: false, message: 'Admin user not found' };
      }
      
      // Initialize wallets if needed
      await initializeWallet(adminUserId);
      await initializeWallet(booking.ownerId);
      
      // Get listing info for transaction description
      const listingRef = doc(db, 'listings', booking.listingId);
      const listingDoc = await getDoc(listingRef);
      const listingTitle = listingDoc.exists() ? listingDoc.data().title || 'Accommodation' : 'Accommodation';
      
      // Deduct hostEarnings (90% of bookingAmount) from admin's wallet
      await deductFromAdminWallet(
        adminUserId,
        hostEarnings,
        `Earnings Release - Host Payment (10% commission: ₱${adminCommission.toFixed(2)})`,
        {
          bookingId: bookingId,
          listingId: booking.listingId,
          listingTitle: listingTitle,
          hostId: booking.ownerId,
          hostEmail: booking.ownerEmail,
          paymentType: 'host_earnings_release'
        },
        true // skipAuthCheck for admin system operations
      );
      
      // Add hostEarnings (90% of bookingAmount) to host's wallet
      await addToHostWallet(
        booking.ownerId,
        hostEarnings,
        `Earnings from Booking - ${listingTitle}`,
        {
          bookingId: bookingId,
          listingId: booking.listingId,
          listingTitle: listingTitle,
          guestId: booking.guestId,
          guestEmail: booking.guestEmail,
          paymentType: 'host_earnings',
          checkInDate: booking.checkInDate?.toDate ? booking.checkInDate.toDate().toISOString() : (typeof booking.checkInDate === 'string' ? booking.checkInDate : new Date(booking.checkInDate).toISOString()),
          checkOutDate: booking.checkOutDate?.toDate ? booking.checkOutDate.toDate().toISOString() : (typeof booking.checkOutDate === 'string' ? booking.checkOutDate : new Date(booking.checkOutDate).toISOString())
        }
      );
      
      console.log(`✅ Released ₱${hostEarnings.toLocaleString()} to host's GetPay wallet (Admin commission: ₱${adminCommission.toFixed(2)})`);
    } catch (walletError) {
      return { success: false, message: `Failed to transfer earnings: ${walletError.message}` };
    }
    
    // Update booking with earnings release info
    await updateDoc(bookingRef, {
      earningsReleased: true,
      earningsReleasedAt: serverTimestamp(),
      earningsReleasedBy: 'admin', // Can be enhanced to track admin user ID
      earningsReleasePending: false, // Clear pending flag
      hostEarnings: hostEarnings,
      adminCommission: adminCommission, // Store admin commission (10%)
      bookingAmount: bookingAmount, // Store booking amount for record keeping
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: `Earnings of ₱${hostEarnings.toLocaleString()} released to host's GetPay wallet (10% commission: ₱${adminCommission.toFixed(2)})`,
      hostEarnings,
      adminCommission
    };
  } catch (error) {
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
      
      // Only show bookings that are pending earnings release
      if (booking.earningsReleasePending && !booking.earningsReleased) {
        // Get bookingAmount (what guest paid - no service fee)
        // For old bookings, use totalPrice as fallback
        const bookingAmount = booking.bookingAmount || booking.totalPrice || 0;
        
        // Admin keeps 10% commission from bookingAmount
        // Host receives 90% of bookingAmount
        const adminCommission = Math.round((bookingAmount * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
        const hostEarnings = Math.round((bookingAmount * (1 - HOST_COMMISSION_PERCENTAGE)) * 100) / 100;
        
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
          bookingAmount: bookingAmount,
          adminCommission: adminCommission,
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
        }
    }
    
    bookingsSnapshot.forEach(bookingDoc => {
      const booking = bookingDoc.data();
      const hostEarnings = booking.hostEarnings || 0;
      const adminCommission = booking.adminCommission || 0; // 10% commission (admin's earnings)
      
      totalReleased += hostEarnings;
      totalServiceFees += adminCommission; // Track 10% commission (admin's earnings)
      
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
      byHost[booking.ownerId].totalServiceFees += adminCommission; // Track 10% commission
      byHost[booking.ownerId].bookingCount += 1;
    });
    
    return {
      totalReleased,
      totalServiceFees,
      byHost: Object.values(byHost)
    };
  } catch (error) {
    return { totalReleased: 0, totalServiceFees: 0, byHost: [] };
  }
};

/**
 * Get earnings release history from wallet transactions
 * @param {string} adminUserId - Admin user ID
 * @returns {Promise<Array>} - Array of earnings release transactions
 */
export const getEarningsReleaseHistory = async (adminUserId) => {
  try {
    if (!adminUserId) {
      return [];
    }

    const { getWalletTransactions } = await import('@/pages/Common/services/getpayService');
    const transactions = await getWalletTransactions(adminUserId, 1000); // Get more transactions to filter
    
    console.log('📋 Transaction types:', transactions.map(t => ({ type: t.type, paymentType: t.metadata?.paymentType })));
    
    // Filter for earnings release transactions (type: 'payment' with paymentType: 'host_earnings_release')
    const earningsReleases = transactions.filter(t => {
      const isPayment = t.type === 'payment';
      const isEarningsRelease = t.metadata?.paymentType === 'host_earnings_release';
      const matches = isPayment && isEarningsRelease;
      
      if (isPayment && !isEarningsRelease) {
        }
      
      return matches;
    });
    
    // Sort by date (newest first)
    earningsReleases.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB - dateA;
    });
    
    return earningsReleases;
  } catch (error) {
    return [];
  }
};

