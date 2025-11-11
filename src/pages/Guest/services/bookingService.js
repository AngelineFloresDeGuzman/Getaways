import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { deductFromWallet, hasSufficientBalance, initializeWallet } from '@/pages/Common/services/getpayService';

/**
 * Create a new booking/reservation with GetPay wallet payment
 * @param {Object} bookingData - The booking details
 * @param {string} bookingData.listingId - The listing ID
 * @param {Date} bookingData.checkInDate - Check-in date
 * @param {Date} bookingData.checkOutDate - Check-out date
 * @param {number} bookingData.guests - Number of guests
 * @param {number} bookingData.totalPrice - Total price for the stay
 * @param {boolean} bookingData.useWallet - Whether to use GetPay wallet for payment (default: true)
 * @returns {Promise<string>} - The booking ID
 */
export const createBooking = async (bookingData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to create a booking');

  const { listingId, checkInDate, checkOutDate, guests, totalPrice, useWallet = true, message } = bookingData;

  if (!listingId || !checkInDate || !checkOutDate) {
    throw new Error('Missing required booking information');
  }

  // Validate dates
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkIn < today) {
    throw new Error('Check-in date cannot be in the past');
  }

  if (checkOut <= checkIn) {
    throw new Error('Check-out date must be after check-in date');
  }

  // Check for date conflicts
  const hasConflict = await checkDateConflict(listingId, checkIn, checkOut);
  if (hasConflict) {
    throw new Error('Selected dates are not available. Please choose different dates.');
  }

  // Get listing info to extract ownerId
  const listingRef = doc(db, 'listings', listingId);
  const listingSnap = await getDoc(listingRef);
  
  if (!listingSnap.exists()) {
    throw new Error('Listing not found');
  }

  const listingData = listingSnap.data();
  const ownerId = listingData.ownerId || listingData.userId;
  
  // Calculate booking amount and guest fee
  // Guest fee is a percentage of the booking amount (default 14% like Airbnb-style service fee)
  // Guest pays: bookingAmount + guestFee
  // Admin receives: bookingAmount + guestFee (total)
  // Host receives: bookingAmount (released manually by admin after booking completion)
  // Admin keeps: guestFee
  const GUEST_FEE_PERCENTAGE = 0.14; // 14% guest service fee
  
  // If totalPrice includes the guest fee, calculate backwards
  // totalPrice = bookingAmount + guestFee
  // totalPrice = bookingAmount + (bookingAmount * 0.14)
  // totalPrice = bookingAmount * 1.14
  // bookingAmount = totalPrice / 1.14
  const bookingAmount = Math.round((totalPrice / (1 + GUEST_FEE_PERCENTAGE)) * 100) / 100;
  const guestFee = Math.round((totalPrice - bookingAmount) * 100) / 100;
  const totalAmount = bookingAmount + guestFee; // This should equal totalPrice (with rounding)
  
  const listingTitle = listingData.title || 'Accommodation';
  
  // Process payment with GetPay wallet or points if useWallet is true
  if (useWallet && totalAmount > 0) {
    // Create booking document first to get booking ID (needed for payment metadata)
    const bookingDoc = {
      guestId: user.uid,
      guestEmail: user.email,
      listingId: listingId,
      ownerId: ownerId,
      ownerEmail: listingData.ownerEmail || listingData.userEmail,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests: guests || 1,
      totalPrice: totalAmount, // Total amount guest pays (bookingAmount + guestFee)
      bookingAmount: bookingAmount, // Amount host will receive (released by admin)
      guestFee: guestFee, // Fee kept by admin
      status: 'pending', // Will remain pending until host accepts the booking request
      paymentMethod: 'getpay', // Will be updated after payment
      paymentStatus: 'processing', // Will be updated to 'paid' after successful payment
      earningsReleased: false, // Earnings not released yet (admin will release after booking completion)
      message: message || null, // Guest's message to host
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      category: listingData.category || 'accommodation',
      // Coupon information (if applied)
      couponCode: bookingData.couponCode || null,
      couponDiscount: bookingData.couponDiscount || 0,
      couponId: bookingData.couponId || null
    };

    const bookingsCollection = collection(db, 'bookings');
    const docRef = await addDoc(bookingsCollection, bookingDoc);
    const bookingId = docRef.id;

    // Check if user is a host and has points (can pay with points)
    let paymentProcessed = false;
    let remainingAmount = totalAmount;
    let paymentMethodUsed = 'getpay';
    let pointsUsed = 0;

    // Check if user has points (they're a host with points)
    try {
      const { getHostPoints, checkPointsForPayment, deductPointsForPayment } = await import('@/pages/Host/services/pointsService');
      const pointsData = await getHostPoints(user.uid);
      const currentPoints = pointsData.points || 0;

      if (currentPoints > 0) {
        // Check if they have sufficient points
        const pointsCheck = await checkPointsForPayment(user.uid, totalAmount);
        
        if (pointsCheck.hasSufficient || pointsCheck.currentPoints > 0) {
          // User has points - try to pay with points first (now we have bookingId)
          const pointsResult = await deductPointsForPayment(
            user.uid,
            totalAmount,
            'booking',
            {
              bookingId: bookingId,
              listingId: listingId,
              listingTitle: listingTitle
            }
          );

          if (pointsResult.success) {
            pointsUsed = pointsResult.pointsUsed;
            remainingAmount = pointsResult.remainingAmount;
            paymentProcessed = pointsResult.currencyAmount >= totalAmount;
            paymentMethodUsed = pointsResult.remainingAmount > 0 ? 'points_and_wallet' : 'points';
            console.log(`✅ Booking payment: ${pointsUsed} points used (₱${pointsResult.currencyAmount.toFixed(2)})`);
          }
        }
      }
    } catch (pointsError) {
      console.warn('Error checking/using points for booking:', pointsError);
      // Continue with wallet payment if points fail
    }

    // Initialize wallet if needed (for wallet payment or partial payment)
    await initializeWallet(user.uid);
    
    // Handle wallet payment (if points were insufficient or not used)
    if (!paymentProcessed || remainingAmount > 0) {
      // Check if user has sufficient wallet balance
      const hasBalance = await hasSufficientBalance(user.uid, remainingAmount);
      if (!hasBalance) {
        // Delete the booking document if payment fails
        await deleteDoc(docRef);
        throw new Error(
          paymentProcessed 
            ? `Insufficient balance. Points covered ₱${(totalAmount - remainingAmount).toFixed(2)}, but you need ₱${remainingAmount.toFixed(2)} more from your GetPay wallet.`
            : `Insufficient GetPay wallet balance. You need ₱${totalAmount.toLocaleString()} but your current balance is insufficient. Please cash in to your GetPay wallet first.`
        );
      }

      // Deduct remaining amount from wallet if points were insufficient
      if (remainingAmount > 0) {
        await deductFromWallet(
          user.uid,
          remainingAmount,
          `Booking Payment - ${listingTitle}${pointsUsed > 0 ? ' (Partial - remaining after points)' : ''}`,
          {
            bookingId: bookingId,
            listingId: listingId,
            listingTitle: listingTitle,
            category: listingData.category || 'accommodation',
            checkInDate: checkIn.toISOString(),
            checkOutDate: checkOut.toISOString(),
            guests: guests || 1,
            bookingAmount: bookingAmount,
            guestFee: guestFee,
            pointsUsed: pointsUsed > 0 ? pointsUsed : null
          }
        );
        console.log(`✅ Booking payment: ₱${remainingAmount.toFixed(2)} deducted from wallet`);
      }
    }
    
    // Update booking payment status to paid (but explicitly keep status as 'pending' for host approval)
    // Status will be changed to 'confirmed' when host accepts the booking request
    await updateDoc(docRef, {
      status: 'pending', // Explicitly keep as pending - host must approve
      paymentStatus: 'paid',
      paymentMethod: paymentMethodUsed,
      pointsUsed: pointsUsed > 0 ? pointsUsed : null,
      updatedAt: serverTimestamp()
    });
    
    // Transfer payment directly to admin's GetPay wallet (GetPay is standalone)
    // Admin receives total amount (bookingAmount + guestFee)
    // Host will receive bookingAmount later when admin manually releases earnings after booking completion
    try {
      const { addToWallet: addToAdminWallet, initializeWallet: initAdminWallet, getAdminUserId } = await import('@/pages/Common/services/getpayService');
      const adminUserId = await getAdminUserId();
      if (adminUserId) {
        await initAdminWallet(adminUserId);
        await addToAdminWallet(
          adminUserId,
          totalAmount,
          `Payment Received - Guest Booking`,
          {
            bookingId: docRef.id,
            listingId: listingId,
            listingTitle: listingTitle,
            category: listingData.category || 'accommodation',
            guestId: user.uid,
            guestEmail: user.email,
            hostId: ownerId,
            paymentType: 'booking_payment',
            bookingAmount: bookingAmount, // Amount host will receive
            guestFee: guestFee, // Fee kept by admin
            checkInDate: checkIn.toISOString(),
            checkOutDate: checkOut.toISOString()
          }
        );
        console.log('✅ Payment sent directly to admin GetPay wallet (bookingAmount + guestFee)');
      } else {
        console.warn('⚠️ Admin user ID not found - payment not credited to admin wallet');
      }
    } catch (error) {
      console.error('Error crediting admin GetPay wallet for booking payment:', error);
      // Don't fail the booking if admin wallet credit fails - this can be handled later
    }
    
    // Send message to host via messaging system (if message provided)
    // Only send after payment is successful (for "pay now" bookings)
    if (message && message.trim()) {
      try {
        await sendBookingMessageToHost(docRef.id, listingId, ownerId, message, user.uid, user.email, listingTitle);
        console.log('✅ Message sent to host via messaging system');
      } catch (error) {
        console.error('Error sending message to host:', error);
        // Don't fail the booking if message sending fails - message is still stored in booking
      }
    }
    
    console.log('✅ Booking created successfully:', docRef.id);
    return docRef.id;
  } else {
    // Create booking without payment (for free bookings or when useWallet is false)
    // This is for "pay later" bookings where payment happens at a later date
    const listingTitleForMessage = listingData.title || 'Accommodation';
    
    // Calculate booking amount and guest fee for "pay later" bookings
    // Same calculation as "pay now" bookings - totalPrice includes guest fee
    const bookingAmount = Math.round((totalPrice / (1 + GUEST_FEE_PERCENTAGE)) * 100) / 100;
    const guestFee = Math.round((totalPrice - bookingAmount) * 100) / 100;
    const totalAmount = bookingAmount + guestFee; // This should equal totalPrice (with rounding)
    
    const bookingDoc = {
      guestId: user.uid,
      guestEmail: user.email,
      listingId: listingId,
      ownerId: ownerId,
      ownerEmail: listingData.ownerEmail || listingData.userEmail,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests: guests || 1,
      totalPrice: totalAmount, // Total amount guest will pay (bookingAmount + guestFee)
      bookingAmount: bookingAmount, // Amount host will receive (released by admin)
      guestFee: guestFee, // Fee kept by admin
      status: 'pending',
      paymentMethod: 'pending',
      paymentStatus: 'pending', // Will be updated to 'paid' when payment is processed
      earningsReleased: false, // Earnings not released yet
      message: message || null, // Guest's message to host
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      category: listingData.category || 'accommodation',
      // Coupon information (if applied)
      couponCode: bookingData.couponCode || null,
      couponDiscount: bookingData.couponDiscount || 0,
      couponId: bookingData.couponId || null
    };

  const bookingsCollection = collection(db, 'bookings');
  const docRef = await addDoc(bookingsCollection, bookingDoc);
    
    // Send message to host via messaging system (if message provided)
    // Send immediately for "pay later" bookings (payment will happen later, but host should be notified)
    if (message && message.trim()) {
      try {
        await sendBookingMessageToHost(docRef.id, listingId, ownerId, message, user.uid, user.email, listingTitleForMessage);
        console.log('✅ Message sent to host via messaging system');
      } catch (error) {
        console.error('Error sending message to host:', error);
        // Don't fail the booking if message sending fails - message is still stored in booking
      }
    }
  
  console.log('✅ Booking created successfully:', docRef.id);
  return docRef.id;
  }
};

/**
 * Send booking message to host via messaging system
 * Creates or gets existing conversation and sends the message
 * @param {string} bookingId - The booking ID
 * @param {string} listingId - The listing ID
 * @param {string} hostId - The host's user ID
 * @param {string} message - The message text
 * @param {string} guestId - The guest's user ID
 * @param {string} guestEmail - The guest's email
 * @param {string} listingTitle - The listing title (optional)
 */
const sendBookingMessageToHost = async (bookingId, listingId, hostId, message, guestId, guestEmail, listingTitle = '') => {
  try {
    // Check if conversation already exists with this bookingId
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', guestId)
    );
    
    const existingConvs = await getDocs(q);
    let conversationId = null;
    let conversationDoc = null;
    
    // Try to find existing conversation with this bookingId
    for (const convDoc of existingConvs.docs) {
      const convData = convDoc.data();
      if (
        convData.participants.includes(hostId) &&
        convData.participants.includes(guestId) &&
        convData.participants.length === 2 &&
        convData.bookingId === bookingId
      ) {
        conversationId = convDoc.id;
        conversationDoc = convDoc;
        break;
      }
    }
    
    // If no conversation with bookingId, try to find one with listingId
    if (!conversationId) {
      for (const convDoc of existingConvs.docs) {
        const convData = convDoc.data();
        if (
          convData.participants.includes(hostId) &&
          convData.participants.includes(guestId) &&
          convData.participants.length === 2 &&
          convData.listingId === listingId
        ) {
          conversationId = convDoc.id;
          conversationDoc = convDoc;
          break;
        }
      }
    }
    
    // Create new conversation if none exists
    if (!conversationId) {
      const newConversation = {
        participants: [guestId, hostId],
        listingId: listingId,
        bookingId: bookingId,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessage: '',
        unreadCounts: {
          [guestId]: 0,
          [hostId]: 0
        }
      };
      
      const docRef = await addDoc(conversationsRef, newConversation);
      conversationId = docRef.id;
      conversationDoc = { id: docRef.id, data: () => newConversation };
    } else {
      // Update existing conversation with bookingId if not set
      const conversationRef = doc(db, 'conversations', conversationId);
      const convData = conversationDoc.data();
      if (!convData.bookingId) {
        await updateDoc(conversationRef, {
          bookingId: bookingId
        });
      }
    }
    
    // Get fresh conversation data for unread counts (need to fetch after potential update)
    const conversationRef = doc(db, 'conversations', conversationId);
    const freshConvDoc = await getDoc(conversationRef);
    if (!freshConvDoc.exists()) {
      throw new Error('Conversation not found after creation');
    }
    const freshConvData = freshConvDoc.data();
    
    // Send the message to the conversation
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageData = {
      senderId: guestId,
      text: message.trim(),
      createdAt: serverTimestamp(),
      read: false,
      type: 'booking_message' // Mark as booking-related message
    };
    
    await addDoc(messagesRef, messageData);
    
    // Update conversation last message and unread count
    const currentUnreadCount = freshConvData.unreadCounts?.[hostId] || 0;
    await updateDoc(conversationRef, {
      lastMessage: message.trim().length > 100 ? message.trim().substring(0, 100) : message.trim(), // Truncate for preview
      lastMessageAt: serverTimestamp(),
      [`unreadCounts.${hostId}`]: currentUnreadCount + 1
    });
    
    console.log('✅ Booking message sent to host in conversation:', conversationId);
  } catch (error) {
    console.error('Error sending booking message to host:', error);
    throw error;
  }
};

/**
 * Check if there's a date conflict for a listing
 * @param {string} listingId - The listing ID
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date
 * @returns {Promise<boolean>} - True if there's a conflict, false otherwise
 */
export const checkDateConflict = async (listingId, checkIn, checkOut) => {
  try {
    const bookingsCollection = collection(db, 'bookings');
    
    // Get all bookings for this listing (we'll filter by status in JavaScript)
    // This avoids index issues and allows us to check both confirmed and pending bookings
    let querySnapshot;
      try {
        const q = query(
          bookingsCollection,
          where('listingId', '==', listingId)
        );
        querySnapshot = await getDocs(q);
    } catch (error) {
      console.error('❌ Error checking date conflict:', error);
        return true; // Err on the side of caution
    }
    
    // Check each existing booking for overlap
    // Block both 'confirmed' and 'pending' bookings to prevent double-booking
    for (const docSnap of querySnapshot.docs) {
      const booking = docSnap.data();
      
      // Only check confirmed and pending bookings (not cancelled or completed)
      // This prevents guests from booking dates that are already reserved
      if (booking.status !== 'confirmed' && booking.status !== 'pending') {
        continue;
      }
      
      const existingCheckIn = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate);
      const existingCheckOut = booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate);

      // Check for overlap: new check-in is before existing check-out AND new check-out is after existing check-in
      if (checkIn < existingCheckOut && checkOut > existingCheckIn) {
        console.log('⚠️ Date conflict detected:', {
          existing: { 
            checkIn: existingCheckIn, 
            checkOut: existingCheckOut,
            status: booking.status,
            bookingId: docSnap.id
          },
          requested: { checkIn, checkOut }
        });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking date conflict:', error);
    // If we can't check, err on the side of caution and prevent booking
    return true;
  }
};

/**
 * Get all bookings for a listing
 * @param {string} listingId - The listing ID
 * @returns {Promise<Array>} - Array of booking documents
 */
export const getListingBookings = async (listingId) => {
  try {
    const bookingsCollection = collection(db, 'bookings');
    const q = query(
      bookingsCollection,
      where('listingId', '==', listingId),
      where('status', '==', 'confirmed')
    );

    const querySnapshot = await getDocs(q);
    const bookings = [];

    querySnapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return bookings;
  } catch (error) {
    console.error('Error getting listing bookings:', error);
    return [];
  }
};

/**
 * Get all bookings for a guest
 * @param {string} guestId - The guest user ID
 * @returns {Promise<Array>} - Array of booking documents
 */
export const getGuestBookings = async (guestId) => {
  try {
    const bookingsCollection = collection(db, 'bookings');
    
    // Try with orderBy first (requires composite index)
    let querySnapshot;
    try {
      const q = query(
        bookingsCollection,
        where('guestId', '==', guestId),
        orderBy('createdAt', 'desc')
      );
      querySnapshot = await getDocs(q);
    } catch (indexError) {
      // If index doesn't exist, fall back to query without orderBy
      console.warn('⚠️ Composite index not found for bookings query, falling back to query without orderBy:', indexError.message);
      
      // Check if error is about missing index
      if (indexError.code === 'failed-precondition' || indexError.message.includes('index')) {
        const q = query(
          bookingsCollection,
          where('guestId', '==', guestId)
        );
        querySnapshot = await getDocs(q);
      } else {
        throw indexError; // Re-throw if it's a different error
      }
    }

    const bookings = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const checkIn = data.checkInDate?.toDate ? data.checkInDate.toDate() : new Date(data.checkInDate);
      const checkOut = data.checkOutDate?.toDate ? data.checkOutDate.toDate() : new Date(data.checkOutDate);
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);

      bookings.push({
        id: doc.id,
        ...data,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        createdAt: createdAt
      });
    });

    // Always sort manually to ensure correct order (especially if orderBy wasn't used)
    bookings.sort((a, b) => {
      const aDate = a.createdAt || new Date(0);
      const bDate = b.createdAt || new Date(0);
      return bDate - aDate; // Descending (newest first)
    });

    return bookings;
  } catch (error) {
    console.error('❌ Error getting guest bookings:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

/**
 * Get all dates that are unavailable for a listing
 * @param {string} listingId - The listing ID
 * @returns {Promise<Array<Date>>} - Array of unavailable dates
 */
export const getUnavailableDates = async (listingId) => {
  try {
    const bookingsCollection = collection(db, 'bookings');
    
    // Get all bookings for this listing (we'll filter by status in JavaScript)
    // This avoids index issues and allows us to check both confirmed and pending bookings
    let querySnapshot;
      try {
        const q = query(
          bookingsCollection,
          where('listingId', '==', listingId)
        );
        querySnapshot = await getDocs(q);
    } catch (error) {
      console.error('❌ Error getting unavailable dates:', error);
        return [];
    }

    const unavailableDates = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    querySnapshot.forEach((doc) => {
      const booking = doc.data();
      
      // Include both confirmed and pending bookings (not cancelled or completed)
      // This prevents guests from seeing dates as available when they're already reserved
      if (booking.status !== 'confirmed' && booking.status !== 'pending') {
        console.log(`⏭️ Skipping booking ${doc.id} with status: ${booking.status}`);
        return;
      }

      console.log(`📌 Processing booking ${doc.id} with status: ${booking.status}`);

      const checkIn = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate);
      const checkOut = booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate);

      // Normalize dates to midnight for accurate comparison
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);

      console.log(`📅 Booking dates - Check-in: ${checkIn.toISOString().split('T')[0]}, Check-out: ${checkOut.toISOString().split('T')[0]}`);

      // Add all dates between check-in (inclusive) and check-out (exclusive) to unavailable dates
      // Use local date components to avoid timezone conversion issues
      const currentDate = new Date(checkIn);
      while (currentDate < checkOut) {
        const dateCopy = new Date(currentDate);
        dateCopy.setHours(0, 0, 0, 0);
        unavailableDates.push(dateCopy);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`📅 Added dates from ${checkIn.toLocaleDateString()} to ${checkOut.toLocaleDateString()} (exclusive)`);
    });

    // Remove duplicates (in case of overlapping bookings)
    // Use local date components to avoid timezone issues (match host calendar approach)
    const uniqueDateStrings = Array.from(new Set(unavailableDates.map(d => {
      let dateObj;
      if (d instanceof Date) {
        dateObj = new Date(d);
      } else {
        dateObj = new Date(d);
      }
      // Use local date components instead of toISOString() to avoid timezone shifts
      dateObj.setHours(0, 0, 0, 0);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })));
    
    // Convert back to Date objects using local timezone, ensuring they're all at midnight
    const uniqueDates = uniqueDateStrings.map(dateStr => {
      // Parse as local date (YYYY-MM-DD format)
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date;
    });
    
    console.log(`📅 Found ${unavailableDates.length} total unavailable dates (${uniqueDates.length} unique) for listing ${listingId}`);
    if (uniqueDates.length > 0) {
      // Use local date strings for consistency
      const dateStrings = uniqueDates.map(d => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });
      console.log(`📅 Unavailable date strings (local):`, dateStrings);
    } else {
      console.log('⚠️ No unavailable dates to return');
    }
    
    return uniqueDates;
  } catch (error) {
    console.error('❌ Error getting unavailable dates:', error);
    return [];
  }
};

/**
 * Calculate total price for a booking
 * @param {Object} pricing - Pricing data from listing
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date
 * @param {number} guests - Number of guests
 * @returns {number} - Total price
 */
export const calculateTotalPrice = (pricing, checkIn, checkOut, guests = 1) => {
  if (!pricing || !checkIn || !checkOut) return 0;

  const weekdayPrice = pricing.weekdayPrice || pricing.basePrice || 0;
  const weekendPrice = pricing.weekendPrice || weekdayPrice;

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  let total = 0;

  const currentDate = new Date(checkInDate);
  while (currentDate < checkOutDate) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const pricePerNight = isWeekend ? weekendPrice : weekdayPrice;
    total += pricePerNight;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Apply discounts if applicable
  const discounts = pricing.discounts || {};
  const nights = Math.floor((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  
  // Apply the highest applicable discount
  if (nights >= 30 && discounts.monthly) {
    total = total * (1 - discounts.monthly / 100);
  } else if (nights >= 7 && discounts.weekly) {
    total = total * (1 - discounts.weekly / 100);
  }
  
  // Early bird discount (if booking is far enough in advance)
  if (discounts.earlyBird) {
    const daysInAdvance = Math.floor((checkInDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysInAdvance >= 30) {
      total = total * (1 - discounts.earlyBird / 100);
    }
  }
  
  // Last minute discount (if booking is soon)
  if (discounts.lastMinute) {
    const daysInAdvance = Math.floor((checkInDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysInAdvance <= 7 && daysInAdvance >= 0) {
      total = total * (1 - discounts.lastMinute / 100);
    }
  }

  return Math.round(total);
};

/**
 * Cancel a guest booking with refund logic
 * @param {string} bookingId - Booking ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const cancelBooking = async (bookingId) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to cancel a booking');
  }

  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      return { success: false, message: 'Booking not found' };
    }
    
    const booking = bookingDoc.data();
    
    // Verify this booking belongs to the current user
    if (booking.guestId !== user.uid) {
      return { success: false, message: 'You can only cancel your own bookings' };
    }
    
    // Check if booking can be cancelled (only pending or confirmed)
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return { success: false, message: `Cannot cancel booking with status: ${booking.status}` };
    }
    
    // Get listing info for transaction description
    const listingRef = doc(db, 'listings', booking.listingId);
    const listingDoc = await getDoc(listingRef);
    const listingTitle = listingDoc.exists() ? listingDoc.data().title || 'Accommodation' : 'Accommodation';
    
    // Check if booking was paid
    if (booking.paymentStatus !== 'paid') {
      // If not paid, just update status to cancelled
      await updateDoc(bookingRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: user.uid,
        updatedAt: serverTimestamp()
      });
      return { success: true, message: 'Booking cancelled successfully' };
    }
    
    // Booking was paid - calculate refund amount and mark as pending for admin processing
    const totalPrice = booking.totalPrice || 0;
    const bookingAmount = booking.bookingAmount || 0;
    const earningsReleased = booking.earningsReleased || false;
    
    let refundAmount = 0;
    let refundType = '';
    let hostRefundAmount = null;
    
    if (booking.status === 'pending') {
      // Pending booking: Full refund
      refundAmount = totalPrice;
      refundType = 'full_refund';
    } else if (booking.status === 'confirmed') {
      // Confirmed booking: Half refund
      refundAmount = Math.round((totalPrice / 2) * 100) / 100;
      refundType = 'half_refund';
      
      // If earnings were released, calculate host refund amount (half of bookingAmount)
      if (earningsReleased) {
        hostRefundAmount = Math.round((bookingAmount / 2) * 100) / 100;
      }
    }
    
    // Update booking status - mark refund as pending for admin to process
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: user.uid,
      refundPending: true,
      refundRequestedAt: serverTimestamp(),
      refundAmount: refundAmount,
      refundType: refundType,
      hostRefundAmount: hostRefundAmount,
      earningsReleased: earningsReleased,
      originalStatus: booking.status, // Store original status (pending or confirmed)
      updatedAt: serverTimestamp()
    });
    
    // Return success message indicating refund is pending admin approval
    const refundMessage = booking.status === 'pending'
      ? `Booking cancelled. A full refund of ₱${refundAmount.toLocaleString()} has been requested and will be processed by admin.`
      : `Booking cancelled. A half refund of ₱${refundAmount.toLocaleString()} has been requested and will be processed by admin.`;
    
    return { 
      success: true, 
      message: refundMessage
    };
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, message: error.message || 'Failed to cancel booking' };
  }
};

