import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';

/**
 * Create a new booking/reservation
 * @param {Object} bookingData - The booking details
 * @param {string} bookingData.listingId - The listing ID
 * @param {Date} bookingData.checkInDate - Check-in date
 * @param {Date} bookingData.checkOutDate - Check-out date
 * @param {number} bookingData.guests - Number of guests
 * @param {number} bookingData.totalPrice - Total price for the stay
 * @returns {Promise<string>} - The booking ID
 */
export const createBooking = async (bookingData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to create a booking');

  const { listingId, checkInDate, checkOutDate, guests, totalPrice } = bookingData;

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
  const { doc, getDoc } = await import('firebase/firestore');
  const listingRef = doc(db, 'listings', listingId);
  const listingSnap = await getDoc(listingRef);
  
  if (!listingSnap.exists()) {
    throw new Error('Listing not found');
  }

  const listingData = listingSnap.data();

  // Create booking document
  const bookingDoc = {
    guestId: user.uid,
    guestEmail: user.email,
    listingId: listingId,
    ownerId: listingData.ownerId || listingData.userId,
    ownerEmail: listingData.ownerEmail || listingData.userEmail,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guests: guests || 1,
    totalPrice: totalPrice || 0,
    status: 'pending', // pending, confirmed, cancelled, completed
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
  
  console.log('✅ Booking created successfully:', docRef.id);
  return docRef.id;
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
    
    // Try query with status filter first
    let querySnapshot;
    try {
        const q = query(
          bookingsCollection,
          where('listingId', '==', listingId),
          where('status', '==', 'confirmed')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('⚠️ Index error for date conflict check, trying without status filter:', indexError.message);
      // Fallback: Get all bookings for this listing and filter in JavaScript
      try {
        const q = query(
          bookingsCollection,
          where('listingId', '==', listingId)
        );
        querySnapshot = await getDocs(q);
      } catch (error2) {
        console.error('❌ Error checking date conflict (fallback):', error2);
        return true; // Err on the side of caution
      }
    }
    
    // Check each existing booking for overlap (only confirmed bookings)
    for (const docSnap of querySnapshot.docs) {
      const booking = docSnap.data();
      
      // Only check confirmed bookings
      if (booking.status !== 'confirmed') {
        continue;
      }
      
      const existingCheckIn = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate);
      const existingCheckOut = booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate);

      // Check for overlap: new check-in is before existing check-out AND new check-out is after existing check-in
      if (checkIn < existingCheckOut && checkOut > existingCheckIn) {
        console.log('⚠️ Date conflict detected:', {
          existing: { checkIn: existingCheckIn, checkOut: existingCheckOut },
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
    
    // Try query with status filter first (only confirmed bookings)
    let querySnapshot;
    try {
      const q = query(
        bookingsCollection,
        where('listingId', '==', listingId),
        where('status', '==', 'confirmed')
      );
      querySnapshot = await getDocs(q);
    } catch (indexError) {
      console.warn('⚠️ Index error for unavailable dates, trying without status filter:', indexError.message);
      // Fallback: Get all bookings for this listing and filter in JavaScript
      try {
        const q = query(
          bookingsCollection,
          where('listingId', '==', listingId)
        );
        querySnapshot = await getDocs(q);
      } catch (error2) {
        console.error('❌ Error getting unavailable dates (fallback):', error2);
        return [];
      }
    }

    const unavailableDates = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    querySnapshot.forEach((doc) => {
      const booking = doc.data();
      
      // Only include confirmed bookings
      if (booking.status !== 'confirmed') {
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

