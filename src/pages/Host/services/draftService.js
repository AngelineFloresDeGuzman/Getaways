import { db, auth } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Save onboarding progress as a draft
 * @param {Object} draftData - The onboarding form data
 * @param {string} draftId - Optional existing draft ID to update
 * @returns {Promise<string>} - The draft ID
 */
export const saveDraft = async (draftData, draftId = null) => {
  try {
    const user = auth.currentUser;
    console.log('Current user in saveDraft:', user); // Debug log
    if (!user) {
      console.error('User not authenticated for draft saving');
      throw new Error('User must be authenticated to save drafts');
    }

    const draftsCollection = collection(db, 'onboardingDrafts');
    let docId = draftId;

    // If no draftId provided, try to find the user's most recent draft
    if (!docId) {
      console.log('No draftId provided, checking for existing drafts...');
      const userDraftsQuery = query(
        draftsCollection,
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(userDraftsQuery);
      if (!querySnapshot.empty) {
        // Filter for draft status and find the most recent one
        const draftDocs = querySnapshot.docs
          .filter(doc => doc.data().status === 'draft')
          .sort((a, b) => {
            const aTime = a.data().lastModified?.toDate() || new Date(0);
            const bTime = b.data().lastModified?.toDate() || new Date(0);
            return bTime - aTime; // Sort descending (most recent first)
          });

        if (draftDocs.length > 0) {
          docId = draftDocs[0].id;
          console.log('Found existing draft to update:', docId);
        } else {
          // Create new draft ID
          docId = `${user.uid}_${Date.now()}`;
          console.log('No existing drafts found, creating new draft:', docId);
        }
      } else {
        // Create new draft ID
        docId = `${user.uid}_${Date.now()}`;
        console.log('No existing drafts found, creating new draft:', docId);
      }
    }

    const draftRef = doc(draftsCollection, docId);

    console.log('draftService: About to save minimal data to Firestore');
    console.log('draftService: Document ID:', docId);
    console.log('draftService: Input data:', draftData);
    console.log('draftService: Existing draft ID:', draftId);

    // Only include minimal fields at first creation
    let draftWithMetadata;
    const existingSnap = await getDoc(draftRef);
    const isNewDraft = !existingSnap.exists();

    // Remove top-level privacyType/propertyStructure from draftData before merging
    const { privacyType, propertyStructure, ...cleanDraftData } = draftData;

    if (isNewDraft) {
      // Create new draft
      draftWithMetadata = {
        userId: user.uid,
        userEmail: user.email,
        status: 'draft',
        currentStep: cleanDraftData.currentStep ?? null,
        category: cleanDraftData.category || null,
        createdAt: serverTimestamp(), // Only set once
        lastModified: serverTimestamp(),
        id: docId,
        data: cleanDraftData.data || {},
      };
    } else {
      // Update existing draft, never touch createdAt
      const existing = existingSnap.data() || {};
      // Check if privacyType is already correct and no other changes are needed
      const prevPrivacyType = existing.data?.privacyType;
      const newPrivacyType = cleanDraftData.data?.privacyType;
      const onlyPrivacyType = Object.keys(cleanDraftData.data || {}).length === 1 && cleanDraftData.data.privacyType !== undefined;
      const noOtherChanges = (!cleanDraftData.currentStep || cleanDraftData.currentStep === existing.currentStep) && (!cleanDraftData.category || cleanDraftData.category === existing.category);
      if (prevPrivacyType === newPrivacyType && onlyPrivacyType && noOtherChanges) {
        // No update needed, return existing draftId
        return docId;
      }
      draftWithMetadata = {
        ...existing,
        ...cleanDraftData,
        category: cleanDraftData.category ?? existing.category ?? null,
        currentStep: cleanDraftData.currentStep ?? existing.currentStep ?? null,
        createdAt: existing.createdAt, // ✅ Keep original
        lastModified: serverTimestamp(), // ✅ Always updates
        data: {
          ...existing.data,
          ...cleanDraftData.data,
        },
      };
      // Explicitly delete any top-level privacyType/propertyStructure if present
      delete draftWithMetadata.privacyType;
      delete draftWithMetadata.propertyStructure;
    }

    console.log('draftService: Final data structure:', Object.keys(draftWithMetadata));
    console.log('draftService: createdAt value:', draftWithMetadata.createdAt);

    if (draftWithMetadata.photos && Array.isArray(draftWithMetadata.photos)) {
      draftWithMetadata.photos = draftWithMetadata.photos.map(photo => ({
        id: photo.id,
        name: photo.name || "untitled",
        base64:
          typeof photo.base64 === "string"
            ? photo.base64
            : photo.base64?.base64 || null,
        url: photo.url || null,
      }));
    }

    // 🧠 Prevent overwriting valid data with null or undefined
    for (const key in draftWithMetadata) {
      if (draftWithMetadata[key] === null || draftWithMetadata[key] === undefined) {
        delete draftWithMetadata[key];
      }
    }

    try {
      await setDoc(draftRef, draftWithMetadata, { merge: true });
      console.log('draftService: Successfully saved to Firestore');
      console.log('draftService: Document saved with ID:', docId);
    } catch (firestoreError) {
      console.error('draftService: Firestore save failed:', firestoreError);
      console.error('draftService: Error code:', firestoreError.code);
      console.error('draftService: Error message:', firestoreError.message);
      console.error('draftService: Full error:', firestoreError);

      // Provide more specific error messages
      let userFriendlyMessage = 'Failed to save draft: ';
      switch (firestoreError.code) {
        case 'permission-denied':
          userFriendlyMessage += 'Permission denied. Please check Firestore security rules.';
          break;
        case 'unavailable':
          userFriendlyMessage += 'Service temporarily unavailable. Please try again later.';
          break;
        case 'failed-precondition':
          userFriendlyMessage += 'Database configuration issue. Please contact support.';
          break;
        case 'unauthenticated':
          userFriendlyMessage += 'User not authenticated. Please log in again.';
          break;
        default:
          userFriendlyMessage += firestoreError.message;
      }

      throw new Error(userFriendlyMessage);
    }

    return docId;
  } catch (error) {
    console.error('Error saving draft:', error);
    throw new Error('Failed to save draft: ' + error.message);
  }
};

/**
 * Load a specific draft by ID
 * @param {string} draftId - The draft ID
 * @returns {Promise<Object|null>} - The draft data or null if not found
 */
export const loadDraft = async (draftId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to load drafts');
    }

    const draftRef = doc(db, 'onboardingDrafts', draftId);
    const draftSnap = await getDoc(draftRef);

    if (draftSnap.exists()) {
      const draftData = draftSnap.data();

      // Verify the draft belongs to the current user
      if (draftData.userId !== user.uid) {
        throw new Error('Draft does not belong to current user');
      }

      return draftData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error loading draft:', error);
    throw new Error('Failed to load draft: ' + error.message);
  }
};

/**
 * Get all drafts for the current user
 * @returns {Promise<Array>} - Array of draft objects
 */
export const getUserDrafts = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to get drafts');
    }

    const draftsCollection = collection(db, 'onboardingDrafts');
    // Simplified query to avoid composite index requirement
    const q = query(
      draftsCollection,
      where('userId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    const drafts = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter by status and only include drafts
      if (data.status === 'draft') {
        drafts.push({
          id: doc.id,
          ...data
        });
      }
    });

    // Sort by lastModified in JavaScript instead of Firestore
    drafts.sort((a, b) => {
      const aTime = a.lastModified?.toDate?.() || new Date(0);
      const bTime = b.lastModified?.toDate?.() || new Date(0);
      return bTime - aTime; // Descending order (newest first)
    });

    return drafts;
  } catch (error) {
    console.error('Error getting user drafts:', error);
    throw new Error('Failed to get drafts: ' + error.message);
  }
};

/**
 * Delete a draft
 * @param {string} draftId - The draft ID to delete
 * @returns {Promise<void>}
 */
export const deleteDraft = async (draftId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to delete drafts');
    }

    // First verify the draft belongs to the current user
    const draftData = await loadDraft(draftId);
    if (!draftData) {
      throw new Error('Draft not found');
    }

    const draftRef = doc(db, 'onboardingDrafts', draftId);
    await deleteDoc(draftRef);
  } catch (error) {
    console.error('Error deleting draft:', error);
    throw new Error('Failed to delete draft: ' + error.message);
  }
};

/**
 * Mark a draft as completed/published
 * @param {string} draftId - The draft ID
 * @returns {Promise<void>}
 */
export const markDraftAsCompleted = async (draftId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const draftRef = doc(db, 'onboardingDrafts', draftId);
    await setDoc(draftRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error marking draft as completed:', error);
    throw new Error('Failed to mark draft as completed: ' + error.message);
  }
};

/**
 * Get draft summary for display purposes
 * @param {Object} draftData - The full draft data
 * @returns {Object} - Simplified draft summary
 */
export const getDraftSummary = (draftData) => {
  const steps = {
    'propertydetails': 'Property Details',
    'propertystructure': 'Structure',
    'privacytype': 'Privacy Type',
    'location': 'Location',
    'locationconfirmation': 'Location Confirmation',
    'propertybasics': 'Property Basics',
    'makeitstandout': 'Highlights',
    'amenities': 'Amenities',
    'photos': 'Photos',
    'titledescription': 'Title & Description',
    'description': 'Description',
    'descriptiondetails': 'Description Details',
    'finishsetup': 'Finish Setup',
    'bookingsettings': 'Booking Settings',
    'guestselection': 'Guest Selection',
    'pricing': 'Pricing',
    'weekendpricing': 'Weekend Pricing',
    'discounts': 'Discounts',
    'safetydetails': 'Safety Details',
    'finaldetails': 'Final Details',
    'payment': 'Payment'
  };

  return {
    id: draftData.id,
    title: draftData.title || draftData.propertyType || 'Untitled Property',
    propertyType: draftData.propertyType || 'Property',
    location: draftData.locationData ?
      `${draftData.locationData.city || ''}, ${draftData.locationData.province || ''}` :
      'Location not set',
    currentStep: steps[draftData.currentStep] || 'Property Details',
    lastModified: draftData.lastModified,
    createdAt: draftData.createdAt,
    progress: calculateProgress(draftData.currentStep),
    hasPhotos: draftData.photos && draftData.photos.length > 0,
    mainImage: draftData.photos && draftData.photos.length > 0 ?
      (draftData.photos[0].base64 || draftData.photos[0].url) :
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=300&q=80'
  };
};

/**
 * Calculate completion progress based on current step
 * @param {string} currentStep - The current step identifier
 * @returns {number} - Progress percentage (0-100)
 */
const calculateProgress = (currentStep) => {
  const stepOrder = [
    'propertydetails', 'propertystructure', 'privacytype', 'location',
    'locationconfirmation', 'propertybasics', 'makeitstandout', 'amenities',
    'photos', 'titledescription', 'description',
    'descriptiondetails', 'finishsetup', 'bookingsettings', 'guestselection',
    'pricing', 'weekendpricing', 'discounts', 'safetydetails', 'finaldetails', 'payment'
  ];

  const currentIndex = stepOrder.indexOf(currentStep);
  if (currentIndex === -1) return 0;

  return Math.round(((currentIndex + 1) / stepOrder.length) * 100);
};

export default {
  saveDraft,
  loadDraft,
  getUserDrafts,
  deleteDraft,
  markDraftAsCompleted,
  getDraftSummary
};