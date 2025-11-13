import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { deductFromWallet, hasSufficientBalance, initializeWallet } from '@/pages/Common/services/getpayService';
import { sendCancellationEmail } from '@/lib/emailService';

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

  const { listingId, checkInDate, checkOutDate, guests, totalPrice, bookingAmount: providedBookingAmount, guestFee: providedGuestFee, useWallet = true, message, paymentProvider, paymentMethod, paypalOrderId, paypalTransactionId } = bookingData;

  if (!listingId || !checkInDate || !checkOutDate) {
    throw new Error('Missing required booking information');
  }

  // Validate dates - convert to Date objects and normalize to midnight
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);
  
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
  
  // Use provided bookingAmount and guestFee if available (from BookingRequest page)
  // Otherwise, calculate from totalPrice (backward compatibility)
  // Guest fee is a percentage of the booking amount (default 14% like Airbnb-style service fee)
  // Guest pays: bookingAmount + guestFee
  // Admin receives: bookingAmount + guestFee (total)
  // Host receives: bookingAmount (released manually by admin after booking completion)
  // Admin keeps: guestFee
  const GUEST_FEE_PERCENTAGE = 0.14; // 14% guest service fee
  
  let bookingAmount;
  let guestFee;
  let totalAmount;
  
  if (providedBookingAmount !== undefined && providedGuestFee !== undefined) {
    // Use exact values provided from BookingRequest page
    bookingAmount = Math.round(providedBookingAmount * 100) / 100;
    guestFee = Math.round(providedGuestFee * 100) / 100;
    totalAmount = Math.round((bookingAmount + guestFee) * 100) / 100;
    // Ensure totalAmount matches totalPrice (with rounding tolerance)
    if (Math.abs(totalAmount - totalPrice) > 0.01) {
      console.warn('⚠️ Price mismatch: totalAmount from breakdown does not match totalPrice. Using totalPrice.');
      totalAmount = Math.round(totalPrice * 100) / 100;
    }
  } else {
    // Fallback: calculate from totalPrice (backward compatibility)
    // If totalPrice includes the guest fee, calculate backwards
    // totalPrice = bookingAmount + guestFee
    // totalPrice = bookingAmount + (bookingAmount * 0.14)
    // totalPrice = bookingAmount * 1.14
    // bookingAmount = totalPrice / 1.14
    bookingAmount = Math.round((totalPrice / (1 + GUEST_FEE_PERCENTAGE)) * 100) / 100;
    guestFee = Math.round((totalPrice - bookingAmount) * 100) / 100;
    totalAmount = Math.round((bookingAmount + guestFee) * 100) / 100;
  }
  
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
  paymentProvider: paymentProvider || 'getpay', // 'getpay' or 'paypal'
  paymentMethod: 'pending', // Always pending until host confirms
  paymentStatus: 'pending', // Will be updated to 'paid' after successful payment
      earningsReleased: false, // Earnings not released yet (admin will release after booking completion)
      message: message || null, // Guest's message to host
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      category: listingData.category || 'accommodation',
      // Coupon information (if applied)
      couponCode: bookingData.couponCode || null,
      couponDiscount: bookingData.couponDiscount || 0,
      couponId: bookingData.couponId || null,
      // PayPal payment information (if PayPal was used)
      paypalOrderId: paypalOrderId || null, // PayPal order ID from authorization
      paypalTransactionId: paypalTransactionId || null // PayPal transaction ID if payment was captured
    };

    const bookingsCollection = collection(db, 'bookings');
    const docRef = await addDoc(bookingsCollection, bookingDoc);
    const bookingId = docRef.id;

    // Check payment availability but DO NOT deduct yet - payment will only be deducted when host confirms
    let paymentMethodUsed = 'wallet';
    let pointsUsed = 0;
    let remainingAmount = totalAmount;
    let canPayWithPoints = false;

    // Check if user has points (they're a host with points) - but don't deduct yet
    try {
      const { getHostPoints, checkPointsForPayment } = await import('@/pages/Host/services/pointsService');
      const pointsData = await getHostPoints(user.uid);
      const currentPoints = pointsData.points || 0;

      if (currentPoints > 0) {
        // Check if they have sufficient points (but don't deduct yet)
        const pointsCheck = await checkPointsForPayment(user.uid, totalAmount);
        
        if (pointsCheck.hasSufficient || pointsCheck.currentPoints > 0) {
          canPayWithPoints = true;
          // Calculate how much points would cover
          const POINTS_TO_CURRENCY_RATE = 0.1; // 10 points = ₱1
          const pointsNeeded = Math.ceil(totalAmount / POINTS_TO_CURRENCY_RATE);
          const pointsAvailable = Math.min(currentPoints, pointsNeeded);
          const currencyFromPoints = pointsAvailable * POINTS_TO_CURRENCY_RATE;
          remainingAmount = Math.max(0, totalAmount - currencyFromPoints);
          pointsUsed = pointsAvailable;
          paymentMethodUsed = remainingAmount > 0 ? 'points_and_wallet' : 'points';
          console.log(`ℹ️ Points available: ${pointsAvailable} (₱${currencyFromPoints.toFixed(2)}), remaining from wallet: ₱${remainingAmount.toFixed(2)}`);
        }
      }
    } catch (pointsError) {
      console.warn('Error checking points for booking:', pointsError);
      // Continue with wallet payment check if points check fails
    }

    // Initialize wallet if needed (for balance check)
    await initializeWallet(user.uid);
    
    // Check wallet balance but DO NOT deduct yet - payment will only be deducted when host confirms
    if (remainingAmount > 0) {
      // Check if user has sufficient wallet balance (but don't deduct yet)
      const hasBalance = await hasSufficientBalance(user.uid, remainingAmount);
      if (!hasBalance) {
        // Delete the booking document if balance is insufficient
        await deleteDoc(docRef);
        throw new Error(
          canPayWithPoints
            ? `Insufficient balance. Points would cover ₱${(totalAmount - remainingAmount).toFixed(2)}, but you need ₱${remainingAmount.toFixed(2)} more in your GetPay wallet.`
            : `Insufficient GetPay wallet balance. You need ₱${totalAmount.toLocaleString()} but your current balance is insufficient. Please cash in to your GetPay wallet first.`
        );
      }

      // Store payment info in booking for later processing when host confirms
      // Payment will be deducted when host confirms the booking
      console.log(`ℹ️ Payment will be processed when host confirms booking. Required: ₱${remainingAmount.toFixed(2)}`);
    }
    
    // Payment will NOT be deducted here. It will be deducted only when host confirms the booking.
    // Update booking with payment method info (but keep paymentStatus as 'pending')
    await updateDoc(docRef, {
      paymentMethod: paymentMethodUsed,
      pointsUsed: pointsUsed > 0 ? pointsUsed : null,
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0
    });
    // Notify host of booking request (send email or notification)
    try {
      // Create notification for host in Firestore
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        recipientId: ownerId,
        type: 'booking_request',
        title: 'New Booking Request',
        message: `${user.displayName || user.email} requested a booking for "${listingTitle}" from ${checkIn.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} to ${checkOut.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} for ${guests || 1} guest(s).`,
        bookingId: docRef.id,
        listingId,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (notifyError) {
      console.error('Error notifying host of booking request:', notifyError);
    }
    
    // Payment will NOT be transferred to admin wallet here.
    // Payment will only be deducted from guest and added to admin wallet when host confirms the booking.
    
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
    // NOTE: Booking confirmation email will be sent when host confirms the booking
    // This ensures guests only receive confirmation emails when their booking is actually confirmed
    
    console.log('✅ Booking created successfully:', docRef.id);
    return docRef.id;
  } else {
    // Create booking without immediate payment processing
    // This is for PayPal bookings or "pay later" bookings where payment happens when host confirms
    const listingTitleForMessage = listingData.title || 'Accommodation';
    
    // Use provided bookingAmount and guestFee if available, otherwise calculate
    let bookingAmount;
    let guestFee;
    let totalAmount;
    
    if (providedBookingAmount !== undefined && providedGuestFee !== undefined) {
      bookingAmount = Math.round(providedBookingAmount * 100) / 100;
      guestFee = Math.round(providedGuestFee * 100) / 100;
      totalAmount = Math.round((bookingAmount + guestFee) * 100) / 100;
    } else {
      // Fallback: calculate from totalPrice
      bookingAmount = Math.round((totalPrice / (1 + GUEST_FEE_PERCENTAGE)) * 100) / 100;
      guestFee = Math.round((totalPrice - bookingAmount) * 100) / 100;
      totalAmount = Math.round((bookingAmount + guestFee) * 100) / 100;
    }
    
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
      paymentProvider: paymentProvider || 'getpay', // 'getpay' or 'paypal' - IMPORTANT: This determines payment method
      paymentMethod: 'pending', // Always pending until host confirms
      paymentStatus: 'pending', // Will be updated to 'paid' when payment is processed
      earningsReleased: false, // Earnings not released yet
      message: message || null, // Guest's message to host
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      category: listingData.category || 'accommodation',
      // Coupon information (if applied)
      couponCode: bookingData.couponCode || null,
      couponDiscount: bookingData.couponDiscount || 0,
      couponId: bookingData.couponId || null,
      // PayPal payment information (if PayPal was used)
      paypalOrderId: paypalOrderId || null, // PayPal order ID from authorization
      paypalTransactionId: paypalTransactionId || null // PayPal transaction ID if payment was captured
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
      
      // Only check confirmed bookings (not pending, cancelled, or completed)
      // Pending bookings don't block dates - only confirmed bookings do
      // Payment is only deducted when host confirms, so dates are only unavailable when confirmed
      if (booking.status !== 'confirmed') {
        continue;
      }
      
      const existingCheckIn = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate);
      const existingCheckOut = booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate);

      // Normalize dates to midnight for accurate comparison
      existingCheckIn.setHours(0, 0, 0, 0);
      existingCheckOut.setHours(0, 0, 0, 0);
      
      // Ensure incoming dates are also Date objects and normalized
      const normalizedCheckIn = checkIn instanceof Date ? new Date(checkIn) : new Date(checkIn);
      const normalizedCheckOut = checkOut instanceof Date ? new Date(checkOut) : new Date(checkOut);
      normalizedCheckIn.setHours(0, 0, 0, 0);
      normalizedCheckOut.setHours(0, 0, 0, 0);

      // Check for overlap: new check-in is before existing check-out AND new check-out is after existing check-in
      if (normalizedCheckIn < existingCheckOut && normalizedCheckOut > existingCheckIn) {
        console.log('⚠️ Date conflict detected:', {
          existing: { 
            checkIn: existingCheckIn.toISOString().split('T')[0], 
            checkOut: existingCheckOut.toISOString().split('T')[0],
            status: booking.status,
            bookingId: docSnap.id
          },
          requested: { 
            checkIn: normalizedCheckIn.toISOString().split('T')[0], 
            checkOut: normalizedCheckOut.toISOString().split('T')[0] 
          }
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
      
      // Only include confirmed bookings (not pending, cancelled, or completed)
      // Pending bookings don't block dates - only confirmed bookings do
      // Payment is only deducted when host confirms, so dates are only unavailable when confirmed
      if (booking.status !== 'confirmed') {
        console.log(`⏭️ Skipping booking ${doc.id} with status: ${booking.status} (only confirmed bookings block dates)`);
        return;
      }

      console.log(`📌 Processing confirmed booking ${doc.id} - marking dates as unavailable`);

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

  // Apply only the highest applicable discount
  const discounts = pricing.discounts || {};
  const nights = Math.floor((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const daysInAdvance = Math.floor((checkInDate - new Date()) / (1000 * 60 * 60 * 24));

  let discountPercent = 0;
  if (nights >= 30 && discounts.monthly) {
    discountPercent = discounts.monthly;
  } else if (nights >= 7 && discounts.weekly) {
    discountPercent = discounts.weekly;
  } else if (discounts.earlyBird && daysInAdvance >= 30) {
    discountPercent = discounts.earlyBird;
  } else if (discounts.lastMinute && daysInAdvance <= 7 && daysInAdvance >= 0) {
    discountPercent = discounts.lastMinute;
  }

  if (discountPercent > 0) {
    total = total * (1 - discountPercent / 100);
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
    
    // Calculate refund amount based on booking status and payment status
    const totalPrice = booking.totalPrice || 0;
    const bookingAmount = booking.bookingAmount || 0;
    const earningsReleased = booking.earningsReleased || false;
    const isPaid = booking.paymentStatus === 'paid';
    
    let refundAmount = 0;
    let refundType = '';
    let hostRefundAmount = null;
    
    if (isPaid) {
      // Booking was paid - calculate refund amount
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
    } else {
      // If not paid, just update status to cancelled (no refund needed)
      await updateDoc(bookingRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: user.uid,
        refundPending: false,
        refundAmount: 0,
        refundType: 'no_refund',
        updatedAt: serverTimestamp()
      });
    }
    
    // Return success message
    const refundMessage = isPaid
      ? (booking.status === 'pending'
          ? `Booking cancelled. A full refund of ₱${refundAmount.toLocaleString()} has been requested and will be processed by admin.`
          : `Booking cancelled. A half refund of ₱${refundAmount.toLocaleString()} has been requested and will be processed by admin.`)
      : 'Booking cancelled successfully. No payment was processed, so no refund is needed.';
    
    // Send cancellation email to guest (ALWAYS send email, regardless of payment status)
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const firstName = userData.firstName || '';
      const lastName = userData.lastName || '';
      
      // Format dates properly for email - use simple format to avoid special characters
      let checkInDateFormatted = '';
      let checkOutDateFormatted = '';
      
      try {
        if (booking.checkInDate?.toDate) {
          const date = booking.checkInDate.toDate();
          checkInDateFormatted = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        } else if (booking.checkInDate) {
          const date = new Date(booking.checkInDate);
          if (!isNaN(date.getTime())) {
            checkInDateFormatted = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
          }
        }
      } catch (e) {
        console.warn('Error formatting check-in date:', e);
        checkInDateFormatted = 'N/A';
      }
      
      try {
        if (booking.checkOutDate?.toDate) {
          const date = booking.checkOutDate.toDate();
          checkOutDateFormatted = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        } else if (booking.checkOutDate) {
          const date = new Date(booking.checkOutDate);
          if (!isNaN(date.getTime())) {
            checkOutDateFormatted = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
          }
        }
      } catch (e) {
        console.warn('Error formatting check-out date:', e);
        checkOutDateFormatted = 'N/A';
      }
      
      // Ensure dates are not empty
      if (!checkInDateFormatted) checkInDateFormatted = 'N/A';
      if (!checkOutDateFormatted) checkOutDateFormatted = 'N/A';
      
      const emailResult = await sendCancellationEmail(
        booking.guestEmail || user.email,
        firstName,
        lastName,
        {
          bookingId: bookingId,
          listingTitle: listingTitle,
          checkInDate: checkInDateFormatted,
          checkOutDate: checkOutDateFormatted,
          totalPrice: booking.totalPrice || 0,
          refundAmount: refundAmount,
          refundType: refundType,
          refundPending: isPaid ? true : false, // Only pending if booking was paid
          refundProcessed: false,
          paymentMethod: booking.paymentMethod || 'GetPay Wallet',
          cancellationReason: 'Guest cancelled booking.'
        }
      );
      
      if (emailResult.success) {
        console.log('✅ Cancellation email sent to guest successfully');
      } else if (emailResult.skipped) {
        // EmailJS not configured - log this clearly
        console.warn('⚠️ Cancellation email skipped - EmailJS not configured. Please check your .env file for VITE_EMAILJS_BOOKING_PUBLIC_KEY, VITE_EMAILJS_BOOKING_SERVICE_ID, and VITE_EMAILJS_CANCELLATION_TEMPLATE_ID');
      } else {
        // Other email errors - log with full details
        console.error('❌ Failed to send cancellation email:', emailResult.error);
        console.error('Email details:', {
          email: booking.guestEmail || user.email,
          bookingId: bookingId,
          listingTitle: listingTitle
        });
      }
    } catch (error) {
      // Catch any unexpected errors in email sending
      console.error('❌ Error in cancellation email sending process:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        email: booking.guestEmail || user.email,
        bookingId: bookingId
      });
      // Don't fail cancellation if email sending fails
    }
    
    return { 
      success: true, 
      message: refundMessage
    };
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, message: error.message || 'Failed to cancel booking' };
  }
};

