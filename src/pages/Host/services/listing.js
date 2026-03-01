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
    // Verify listing exists before updating
    const existingListingRef = doc(db, 'listings', existingListingId);
    const existingListingSnap = await getDoc(existingListingRef);
    
    if (!existingListingSnap.exists()) {
      throw new Error(`Listing with ID ${existingListingId} does not exist`);
    }
  }

  const listingsCollection = collection(db, 'listings');
  
  // Get category early for conditional logic
  const category = listingData.category || 'accommodation';
  
  // Extract location data for easy access
  const locationData = listingData.location || {};
  const photos = listingData.photos || [];
  const pricing = listingData.pricing || {};
  
  // Debug: Log photos received in createListing
  if (photos.length > 0) {
  } else {
    // No photos received (This is OK if user removed all photos)
  }
  
  // Get first photo's base64 for main image (but don't duplicate - use from photos array)
  const firstPhoto = photos.length > 0 ? (photos[0]?.base64 || photos[0]?.url || photos[0]) : null;
  
  // Create listing document with all necessary fields for display on accommodations page
  // IMPORTANT: Don't duplicate photos - store only once in photos array
  const listingDoc = {
    // Core fields
    ownerId: user.uid,
    ownerEmail: user.email,
    category: category,
    title: listingData.title || 'Untitled Listing',
    description: listingData.description || '',
    descriptionHighlights: listingData.descriptionHighlights || [],
    
    // Location (simplified for display, full data in locationData)
    location: locationData.city || locationData.province || locationData.country || 'Location',
    
    // Pricing - handle both accommodation and service pricing
    price: category === 'service' 
      ? (pricing.basePrice || pricing.price || pricing.weekdayPrice || 0)
      : (pricing.weekdayPrice || pricing.basePrice || 0),
    
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
    pricing: pricing,
  };

  // Add category-specific fields
  if (category === 'service') {
    // Service-specific fields
    listingDoc.serviceCategory = listingData.serviceCategory || null;
    listingDoc.serviceYearsOfExperience = listingData.serviceYearsOfExperience || null;
    listingDoc.serviceExperience = listingData.serviceExperience || null;
    listingDoc.serviceDegree = listingData.serviceDegree || null;
    listingDoc.serviceCareerHighlight = listingData.serviceCareerHighlight || null;
    listingDoc.serviceProfilePicture = listingData.serviceProfilePicture || null;
    listingDoc.serviceProfiles = listingData.serviceProfiles || [];
    listingDoc.serviceAddress = listingData.serviceAddress || null;
    listingDoc.serviceWhereProvide = listingData.serviceWhereProvide || null;
    listingDoc.serviceOfferings = listingData.serviceOfferings || [];
    listingDoc.serviceNationalPark = listingData.serviceNationalPark !== undefined ? listingData.serviceNationalPark : null;
    listingDoc.serviceTransportingGuests = listingData.serviceTransportingGuests !== undefined ? listingData.serviceTransportingGuests : null;
    listingDoc.serviceAgreedToTerms = listingData.serviceAgreedToTerms !== undefined ? listingData.serviceAgreedToTerms : false;
  } else if (category === 'experience') {
    // Experience-specific fields
    listingDoc.experienceCategory = listingData.experienceCategory || null;
    listingDoc.experienceSubcategory = listingData.experienceSubcategory || null;
    listingDoc.yearsOfExperience = listingData.yearsOfExperience || null;
    listingDoc.introTitle = listingData.introTitle || null;
    listingDoc.expertise = listingData.expertise || null;
    listingDoc.recognition = listingData.recognition || null;
    listingDoc.profiles = listingData.profiles || [];
    listingDoc.residentialAddress = listingData.residentialAddress || {};
    listingDoc.meetingAddress = listingData.meetingAddress || {};
    listingDoc.meetingLocationData = listingData.meetingLocationData || {};
    listingDoc.itineraryItems = listingData.itineraryItems || [];
    listingDoc.maxGuests = listingData.maxGuests || 1;
    listingDoc.pricePerGuest = listingData.pricePerGuest || null;
    listingDoc.privateGroupMinimum = listingData.privateGroupMinimum || null;
    listingDoc.experienceDiscounts = listingData.experienceDiscounts || listingData.discounts || [];
    listingDoc.willTransportGuests = listingData.willTransportGuests !== undefined ? listingData.willTransportGuests : null;
    listingDoc.transportationTypes = listingData.transportationTypes || [];
    listingDoc.termsAgreed = listingData.termsAgreed !== undefined ? listingData.termsAgreed : false;
    listingDoc.experienceTitle = listingData.experienceTitle || listingData.title || '';
    listingDoc.experienceDescription = listingData.experienceDescription || listingData.description || '';
    
    // Pricing for experiences
    listingDoc.pricing = {
      pricePerGuest: listingData.pricePerGuest || 0,
      privateGroupMinimum: listingData.privateGroupMinimum || 0,
      ...pricing
    };
    
    // Update price field for display
    listingDoc.price = listingData.pricePerGuest || pricing.pricePerGuest || 0;
  } else {
    // Accommodation-specific fields
    listingDoc.propertyBasics = listingData.propertyBasics || {};
    listingDoc.amenities = listingData.amenities || {};
    listingDoc.privacyType = listingData.privacyType || '';
    listingDoc.propertyStructure = listingData.propertyStructure || '';
    listingDoc.bookingSettings = listingData.bookingSettings || {};
    listingDoc.guestSelection = listingData.guestSelection || {};
    listingDoc.discounts = listingData.discounts || {};
    listingDoc.safetyDetails = listingData.safetyDetails || {};
    listingDoc.finalDetails = listingData.finalDetails || {};
  }

  // If updating existing listing, preserve createdAt and publishedAt
  // CRITICAL: Only update changed fields, preserve unchanged data
  if (existingListingId) {
    const existingListingRef = doc(db, 'listings', existingListingId);
    const existingListingSnap = await getDoc(existingListingRef);
    
    if (existingListingSnap.exists()) {
      const existingData = existingListingSnap.data();
      
      // CRITICAL: Verify this listing belongs to the current user before updating
      if (existingData.ownerId !== user.uid) {
        throw new Error('Listing belongs to a different user');
      }
      
      // Preserve original creation date and published date (don't update these)
      // Remove createdAt and publishedAt from listingDoc since we want to preserve existing values
      delete listingDoc.createdAt;
      delete listingDoc.publishedAt;
      
      // Always update updatedAt
      listingDoc.updatedAt = serverTimestamp();
      
      // CRITICAL: Always update photos field when updating (even if empty array)
      // This ensures edited photos are always reflected in the published listing
      listingDoc.photos = photos; // Explicitly set photos to ensure they're updated
      
      // Remove any undefined/null values to avoid overwriting existing data (except photos which can be empty array)
      Object.keys(listingDoc).forEach(key => {
        if (listingDoc[key] === undefined || (listingDoc[key] === null && key !== 'photos')) {
          delete listingDoc[key];
        }
      });
      
      console.log('📝 createListing: Updating existing listing with fields:', Object.keys(listingDoc));
      console.log('📝 createListing: Fields being updated:', Object.keys(listingDoc));
      
      // Update existing listing (Firestore updateDoc only updates provided fields)
      await updateDoc(existingListingRef, listingDoc);
      console.log('✅ Updated existing listing (only changed fields):', existingListingId);
      return existingListingId;
    } else {
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
        // Don't throw - allow creation but log warning
        // The draft's publishedListingId should prevent this, but this is a safety net
      }
    });
  } catch (queryError) {
    // If query fails (e.g., missing index), log warning but continue
    }
  
  // Create new listing
  listingDoc.createdAt = serverTimestamp();
  listingDoc.publishedAt = listingData.publishedAt || serverTimestamp();
  
  const docRef = await addDoc(listingsCollection, listingDoc);
  return docRef.id;
};
