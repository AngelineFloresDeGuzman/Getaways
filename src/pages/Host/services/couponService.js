import { db, auth } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Create a new coupon for a host
 * @param {Object} couponData - Coupon details (code, discountType, discountValue, etc.)
 * @returns {Promise<string>} - The new coupon ID
 */
export const createCoupon = async (couponData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to create a coupon');

  const {
    code,
    description,
    discountType, // 'percentage' or 'fixed'
    discountValue,
    validFrom,
    validUntil,
    maxUses,
    listingIds = [], // Specific listings (empty array = all listings)
    active = true,
    minBookingAmount = 0
  } = couponData;

  // Validate coupon data
  if (!code || !code.trim()) {
    throw new Error('Coupon code is required');
  }
  if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
    throw new Error('Invalid discount type');
  }
  if (!discountValue || discountValue <= 0) {
    throw new Error('Discount value must be greater than 0');
  }
  if (discountType === 'percentage' && discountValue > 100) {
    throw new Error('Percentage discount cannot exceed 100%');
  }

  // Check if coupon code already exists for this host
  const existingCoupons = await getHostCoupons(user.uid);
  const codeExists = existingCoupons.some(c => c.code.toLowerCase() === code.toLowerCase().trim());
  if (codeExists) {
    throw new Error('Coupon code already exists');
  }

  const couponDoc = {
    hostId: user.uid,
    code: code.trim().toUpperCase(),
    description: description || '',
    discountType,
    discountValue: parseFloat(discountValue),
    validFrom: validFrom ? new Date(validFrom) : new Date(),
    validUntil: validUntil ? new Date(validUntil) : null,
    maxUses: maxUses || null, // null = unlimited
    currentUses: 0,
    listingIds: Array.isArray(listingIds) ? listingIds : [],
    active,
    minBookingAmount: parseFloat(minBookingAmount) || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const couponsCollection = collection(db, 'coupons');
  const docRef = await addDoc(couponsCollection, couponDoc);
  
  console.log('✅ Coupon created successfully:', docRef.id);
  return docRef.id;
};

/**
 * Get all coupons for a host
 * @param {string} hostId - The host user ID
 * @returns {Promise<Array>} - Array of coupon documents
 */
export const getHostCoupons = async (hostId) => {
  try {
    const couponsCollection = collection(db, 'coupons');
    const q = query(
      couponsCollection,
      where('hostId', '==', hostId)
    );

    const querySnapshot = await getDocs(q);
    const coupons = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      coupons.push({
        id: doc.id,
        ...data,
        validFrom: data.validFrom?.toDate ? data.validFrom.toDate() : new Date(data.validFrom),
        validUntil: data.validUntil?.toDate ? data.validUntil.toDate() : (data.validUntil ? new Date(data.validUntil) : null),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
      });
    });

    // Sort by creation date (newest first)
    coupons.sort((a, b) => b.createdAt - a.createdAt);

    return coupons;
  } catch (error) {
    console.error('❌ Error getting host coupons:', error);
    throw error;
  }
};

/**
 * Get a coupon by ID
 * @param {string} couponId - The coupon ID
 * @returns {Promise<Object>} - Coupon document
 */
export const getCouponById = async (couponId) => {
  try {
    const couponRef = doc(db, 'coupons', couponId);
    const couponSnap = await getDoc(couponRef);
    
    if (!couponSnap.exists()) {
      throw new Error('Coupon not found');
    }

    const data = couponSnap.data();
    return {
      id: couponSnap.id,
      ...data,
      validFrom: data.validFrom?.toDate ? data.validFrom.toDate() : new Date(data.validFrom),
      validUntil: data.validUntil?.toDate ? data.validUntil.toDate() : (data.validUntil ? new Date(data.validUntil) : null),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
    };
  } catch (error) {
    console.error('❌ Error getting coupon by ID:', error);
    throw error;
  }
};

/**
 * Update a coupon
 * @param {string} couponId - The coupon ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateCoupon = async (couponId, updates) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to update a coupon');

  try {
    // Verify coupon belongs to host
    const coupon = await getCouponById(couponId);
    if (coupon.hostId !== user.uid) {
      throw new Error('You do not have permission to update this coupon');
    }

    const couponRef = doc(db, 'coupons', couponId);
    
    // Validate updates
    const allowedFields = ['code', 'description', 'discountType', 'discountValue', 'validFrom', 'validUntil', 'maxUses', 'listingIds', 'active', 'minBookingAmount'];
    const cleanUpdates = {};
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'code') {
          cleanUpdates.code = updates.code.trim().toUpperCase();
        } else if (field === 'discountValue' || field === 'minBookingAmount') {
          cleanUpdates[field] = parseFloat(updates[field]);
        } else if (field === 'validFrom' || field === 'validUntil') {
          cleanUpdates[field] = updates[field] ? new Date(updates[field]) : null;
        } else if (field === 'listingIds') {
          cleanUpdates[field] = Array.isArray(updates[field]) ? updates[field] : [];
        } else {
          cleanUpdates[field] = updates[field];
        }
      }
    });

    // Validate discount value if being updated
    if (cleanUpdates.discountType === 'percentage' && cleanUpdates.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    cleanUpdates.updatedAt = serverTimestamp();

    await updateDoc(couponRef, cleanUpdates);
    console.log('✅ Coupon updated successfully:', couponId);
  } catch (error) {
    console.error('❌ Error updating coupon:', error);
    throw error;
  }
};

/**
 * Delete a coupon
 * @param {string} couponId - The coupon ID
 * @returns {Promise<void>}
 */
export const deleteCoupon = async (couponId) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to delete a coupon');

  try {
    // Verify coupon belongs to host
    const coupon = await getCouponById(couponId);
    if (coupon.hostId !== user.uid) {
      throw new Error('You do not have permission to delete this coupon');
    }

    const couponRef = doc(db, 'coupons', couponId);
    await deleteDoc(couponRef);
    console.log('✅ Coupon deleted successfully:', couponId);
  } catch (error) {
    console.error('❌ Error deleting coupon:', error);
    throw error;
  }
};

/**
 * Validate and get coupon for a booking
 * @param {string} couponCode - The coupon code to validate
 * @param {string} listingId - The listing ID
 * @param {number} bookingAmount - The booking amount before discount
 * @returns {Promise<Object|null>} - Valid coupon object or null
 */
export const validateCoupon = async (couponCode, listingId, bookingAmount) => {
  try {
    if (!couponCode || !couponCode.trim()) {
      return null;
    }

    const couponsCollection = collection(db, 'coupons');
    const q = query(
      couponsCollection,
      where('code', '==', couponCode.trim().toUpperCase()),
      where('active', '==', true)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { valid: false, error: 'Invalid coupon code' };
    }

    const couponDoc = querySnapshot.docs[0];
    const coupon = {
      id: couponDoc.id,
      ...couponDoc.data(),
      validFrom: couponDoc.data().validFrom?.toDate ? couponDoc.data().validFrom.toDate() : new Date(couponDoc.data().validFrom),
      validUntil: couponDoc.data().validUntil?.toDate ? couponDoc.data().validUntil.toDate() : (couponDoc.data().validUntil ? new Date(couponDoc.data().validUntil) : null)
    };

    const now = new Date();

    // Check if coupon is valid for this listing
    if (coupon.listingIds && coupon.listingIds.length > 0 && !coupon.listingIds.includes(listingId)) {
      return { valid: false, error: 'This coupon is not valid for this listing' };
    }

    // Check validity dates
    if (coupon.validFrom && now < coupon.validFrom) {
      return { valid: false, error: 'Coupon is not yet valid' };
    }

    if (coupon.validUntil && now > coupon.validUntil) {
      return { valid: false, error: 'Coupon has expired' };
    }

    // Check max uses
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, error: 'Coupon has reached maximum usage limit' };
    }

    // Check minimum booking amount
    if (coupon.minBookingAmount && bookingAmount < coupon.minBookingAmount) {
      return { valid: false, error: `Minimum booking amount of ₱${coupon.minBookingAmount.toLocaleString()} required` };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = bookingAmount * (coupon.discountValue / 100);
    } else {
      discountAmount = coupon.discountValue;
      // Fixed discount cannot exceed booking amount
      if (discountAmount > bookingAmount) {
        discountAmount = bookingAmount;
      }
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100 // Round to 2 decimal places
      },
      couponId: coupon.id
    };
  } catch (error) {
    console.error('❌ Error validating coupon:', error);
    return { valid: false, error: 'Error validating coupon' };
  }
};

/**
 * Increment coupon usage count
 * @param {string} couponId - The coupon ID
 * @returns {Promise<void>}
 */
export const incrementCouponUsage = async (couponId) => {
  try {
    const couponRef = doc(db, 'coupons', couponId);
    const couponSnap = await getDoc(couponRef);
    
    if (!couponSnap.exists()) {
      throw new Error('Coupon not found');
    }

    const currentUses = couponSnap.data().currentUses || 0;
    await updateDoc(couponRef, {
      currentUses: currentUses + 1,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('❌ Error incrementing coupon usage:', error);
    throw error;
  }
};

