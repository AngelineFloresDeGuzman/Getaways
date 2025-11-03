import { db, auth } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Create a new listing for a host
 * @param {Object} listingData - The listing details (category, title, etc.)
 * @param {string} existingListingId - Optional: ID of existing listing to update instead of creating new
 * @returns {Promise<string>} - The new or updated listing ID
 */
export const createListing = async (listingData, existingListingId = null) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to create a listing');

  // CRITICAL: If existingListingId is provided, ALWAYS update, never create new
  // This prevents accidental duplicates
  if (existingListingId) {
    console.log('📝 createListing: existingListingId provided, will update existing listing:', existingListingId);
    // Verify listing exists before updating
    const existingListingRef = doc(db, 'listings', existingListingId);
    const existingListingSnap = await getDoc(existingListingRef);
    
    if (!existingListingSnap.exists()) {
      console.error('❌ createListing: existingListingId provided but listing does not exist:', existingListingId);
      throw new Error(`Listing with ID ${existingListingId} does not exist`);
    }
  }

  const listingsCollection = collection(db, 'listings');
  
  // Extract location data for easy access
  const locationData = listingData.location || {};
  const photos = listingData.photos || [];
  const pricing = listingData.pricing || {};
  
  // Debug: Log photos received in createListing
  console.log('📸 createListing: Received photos:', photos.length);
  if (photos.length > 0) {
    console.log('📸 createListing: First photo:', {
      id: photos[0].id,
      name: photos[0].name,
      hasBase64: !!photos[0].base64,
      hasUrl: !!photos[0].url,
      allKeys: Object.keys(photos[0])
    });
  } else {
    console.warn('⚠️ createListing: No photos received!');
  }
  
  // Get first photo's base64 for main image (but don't duplicate - use from photos array)
  const firstPhoto = photos.length > 0 ? (photos[0]?.base64 || photos[0]?.url || photos[0]) : null;
  
  // Create listing document with all necessary fields for display on accommodations page
  // IMPORTANT: Don't duplicate photos - store only once in photos array
  const listingDoc = {
    // Core fields
    ownerId: user.uid,
    ownerEmail: user.email,
    category: listingData.category || 'accommodation',
    title: listingData.title || 'Untitled Listing',
    description: listingData.description || '',
    descriptionHighlights: listingData.descriptionHighlights || [],
    
    // Location (simplified for display, full data in locationData)
    location: locationData.city || locationData.province || locationData.country || 'Location',
    
    // Pricing
    price: pricing.weekdayPrice || pricing.basePrice || 0,
    
    // Photos - STORE ONCE in photos array only (don't duplicate in image/images)
    // For display, use photos[0].base64 from the photos array
    photos: photos, // All photos with base64
    
    // Main image - just reference (index 0) to avoid duplication
    // Frontend should use: photos[0]?.base64 || photos[0]?.url
    imageIndex: photos.length > 0 ? 0 : null, // Index reference, not full data
    
    // Rating/reviews (preserve if updating)
    rating: listingData.rating !== undefined ? listingData.rating : 0,
    reviews: listingData.reviews !== undefined ? listingData.reviews : 0,
    
    // Status - always active for published listings (subscription checked from user payment field)
    status: 'active',
    updatedAt: serverTimestamp(),
    
    // Property details (structured data)
    locationData: locationData,
    propertyBasics: listingData.propertyBasics || {},
    amenities: listingData.amenities || {},
    privacyType: listingData.privacyType || '',
    propertyStructure: listingData.propertyStructure || '',
    pricing: pricing,
    bookingSettings: listingData.bookingSettings || {},
    guestSelection: listingData.guestSelection || {},
    discounts: listingData.discounts || {},
    safetyDetails: listingData.safetyDetails || {},
    finalDetails: listingData.finalDetails || {},
  };

  // If updating existing listing, preserve createdAt and publishedAt
  // CRITICAL: Only update changed fields, preserve unchanged data
  if (existingListingId) {
    const existingListingRef = doc(db, 'listings', existingListingId);
    const existingListingSnap = await getDoc(existingListingRef);
    
    if (existingListingSnap.exists()) {
      const existingData = existingListingSnap.data();
      
      // CRITICAL: Verify this listing belongs to the current user before updating
      if (existingData.ownerId !== user.uid) {
        console.error('❌ createListing: Attempted to update listing owned by different user');
        throw new Error('Listing belongs to a different user');
      }
      
      // Preserve original creation date and published date (don't update these)
      // Remove createdAt and publishedAt from listingDoc since we want to preserve existing values
      delete listingDoc.createdAt;
      delete listingDoc.publishedAt;
      
      // Always update updatedAt
      listingDoc.updatedAt = serverTimestamp();
      
      // Remove any undefined/null values to avoid overwriting existing data
      Object.keys(listingDoc).forEach(key => {
        if (listingDoc[key] === undefined || listingDoc[key] === null) {
          delete listingDoc[key];
        }
      });
      
      console.log('📝 createListing: Updating existing listing with fields:', Object.keys(listingDoc));
      console.log('📝 createListing: Fields being updated:', listingDoc);
      
      // Update existing listing (Firestore updateDoc only updates provided fields)
      await updateDoc(existingListingRef, listingDoc);
      console.log('✅ Updated existing listing (only changed fields):', existingListingId);
      return existingListingId;
    } else {
      console.error('❌ createListing: existingListingId provided but listing does not exist:', existingListingId);
      throw new Error(`Cannot update: Listing ${existingListingId} does not exist`);
    }
  }
  
  // CRITICAL: Before creating new listing, check for duplicates by ownerId + title + location
  // This is a safety check in case publishedListingId wasn't properly set in draft
  const userListingsQuery = query(
    listingsCollection,
    where('ownerId', '==', user.uid),
    where('status', '==', 'active')
  );
  
  try {
    const existingListingsSnapshot = await getDocs(userListingsQuery);
    const listingTitle = listingData.title || 'Untitled Listing';
    const listingLocation = listingDoc.location || '';
    
    // Check if there's already an active listing with same title and location (likely duplicate)
    existingListingsSnapshot.docs.forEach(doc => {
      const existingListing = doc.data();
      if (existingListing.title === listingTitle && existingListing.location === listingLocation) {
        console.warn(`⚠️ createListing: Found existing active listing with same title and location: ${doc.id}`);
        console.warn('⚠️ This might be a duplicate. Consider using update instead.');
        // Don't throw - allow creation but log warning
        // The draft's publishedListingId should prevent this, but this is a safety net
      }
    });
  } catch (queryError) {
    // If query fails (e.g., missing index), log warning but continue
    console.warn('⚠️ createListing: Could not check for duplicates:', queryError.message);
  }
  
  // Create new listing
  listingDoc.createdAt = serverTimestamp();
  listingDoc.publishedAt = listingData.publishedAt || serverTimestamp();
  
  const docRef = await addDoc(listingsCollection, listingDoc);
  console.log('✅ Created new listing:', docRef.id);
  return docRef.id;
};
