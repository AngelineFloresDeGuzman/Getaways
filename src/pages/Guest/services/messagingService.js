import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { toast } from '@/components/ui/sonner';

/**
 * Start or get existing conversation between current user and a host
 * @param {string} hostId - The host's user ID
 * @param {string} listingId - Optional listing ID if conversation is about a specific listing
 * @returns {Promise<string>} - The conversation ID
 */
export const startConversation = async (hostId, listingId = null) => {
  try {
    if (!auth.currentUser) {
      toast.error('Please log in to message hosts');
      throw new Error('User must be authenticated');
    }

    const currentUserId = auth.currentUser.uid;

    // Check if conversation already exists
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', currentUserId)
    );

    const existingConvs = await getDocs(q);
    const existingConv = existingConvs.docs.find(docSnap => {
      const data = docSnap.data();
      return (
        data.participants.includes(hostId) &&
        data.participants.includes(currentUserId) &&
        data.participants.length === 2 &&
        (!listingId || data.listingId === listingId)
      );
    });

    if (existingConv) {
      toast.success('Opening existing conversation');
      return existingConv.id;
    }

    // Create new conversation
    const newConversation = {
      participants: [currentUserId, hostId],
      listingId: listingId || null,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessage: '',
      unreadCounts: {
        [currentUserId]: 0,
        [hostId]: 0
      }
    };

    const docRef = await addDoc(conversationsRef, newConversation);
    toast.success('Conversation started!');
    return docRef.id;
  } catch (error) {
    toast.error('Failed to start conversation. Please try again.');
    throw error;
  }
};

/**
 * Start conversation from host side (host messaging a guest)
 * @param {string} guestId - The guest's user ID
 * @param {string} listingId - Optional listing ID
 * @param {string} bookingId - Optional booking ID if conversation is about a booking
 * @returns {Promise<string>} - The conversation ID
 */
export const startConversationFromHost = async (guestId, listingId = null, bookingId = null) => {
  try {
    if (!auth.currentUser) {
      toast.error('Please log in to message guests');
      throw new Error('User must be authenticated');
    }

    const currentUserId = auth.currentUser.uid;

    // Check if conversation already exists
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', currentUserId)
    );

    const existingConvs = await getDocs(q);
    const existingConv = existingConvs.docs.find(docSnap => {
      const data = docSnap.data();
      return (
        data.participants.includes(guestId) &&
        data.participants.includes(currentUserId) &&
        data.participants.length === 2 &&
        (!listingId || data.listingId === listingId) &&
        (!bookingId || data.bookingId === bookingId)
      );
    });

    if (existingConv) {
      toast.success('Opening existing conversation');
      return existingConv.id;
    }

    // Create new conversation
    const newConversation = {
      participants: [currentUserId, guestId],
      listingId: listingId || null,
      bookingId: bookingId || null,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessage: '',
      unreadCounts: {
        [currentUserId]: 0,
        [guestId]: 0
      }
    };

    const docRef = await addDoc(conversationsRef, newConversation);
    toast.success('Conversation started!');
    return docRef.id;
  } catch (error) {
    toast.error('Failed to start conversation. Please try again.');
    throw error;
  }
};

/**
 * Get host ID from listing
 * @param {string} listingId - The listing ID
 * @returns {Promise<string|null>} - The host's user ID
 */
export const getHostIdFromListing = async (listingId) => {
  try {
    const listingDoc = await getDoc(doc(db, 'listings', listingId));
    if (listingDoc.exists()) {
      const data = listingDoc.data();
      return data.ownerId || data.userId || null;
    }
    return null;
  } catch (error) {
    return null;
  }
};

