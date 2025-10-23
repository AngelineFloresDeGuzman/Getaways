import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Create a new listing for a host
 * @param {Object} listingData - The listing details (category, title, etc.)
 * @returns {Promise<string>} - The new listing ID
 */
export const createListing = async (listingData) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to create a listing');

  const listingsCollection = collection(db, 'listings');
  const docRef = await addDoc(listingsCollection, {
    ...listingData,
    ownerId: user.uid,
    ownerEmail: user.email,
    category: listingData.category, // e.g. 'accommodation', 'experience', 'service'
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'draft',
  });
  return docRef.id;
};
