// Appeal Service for Host Termination Appeals
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';

const APPEALS_COLLECTION = 'host_appeals';

/**
 * Submit an appeal for host termination
 * @param {string} hostId - Host user ID
 * @param {string} hostEmail - Host email
 * @param {string} hostName - Host name
 * @param {string} reason - Appeal reason/justification
 * @param {string} additionalInfo - Additional information
 * @returns {Promise<string>} Appeal document ID
 */
export const submitAppeal = async (hostId, hostEmail, hostName, reason, additionalInfo = '') => {
  try {
    const appealData = {
      hostId,
      hostEmail,
      hostName,
      reason,
      additionalInfo,
      status: 'pending', // pending, reviewed, approved, rejected
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      adminNotes: null
    };

    const docRef = await addDoc(collection(db, APPEALS_COLLECTION), appealData);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all appeals (for admin)
 * @param {string} status - Optional status filter ('pending', 'reviewed', 'approved', 'rejected')
 * @returns {Promise<Array>} Array of appeals
 */
export const getAllAppeals = async (status = null) => {
  try {
    let q;
    if (status) {
      q = query(
        collection(db, APPEALS_COLLECTION),
        where('status', '==', status),
        orderBy('submittedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, APPEALS_COLLECTION),
        orderBy('submittedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate ? doc.data().submittedAt.toDate() : null,
      reviewedAt: doc.data().reviewedAt?.toDate ? doc.data().reviewedAt.toDate() : null
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get appeal by host ID
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object|null>} Appeal object or null
 */
export const getAppealByHostId = async (hostId) => {
  try {
    const q = query(
      collection(db, APPEALS_COLLECTION),
      where('hostId', '==', hostId),
      orderBy('submittedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const appealDoc = snapshot.docs[0];
    return {
      id: appealDoc.id,
      ...appealDoc.data(),
      submittedAt: appealDoc.data().submittedAt?.toDate ? appealDoc.data().submittedAt.toDate() : null,
      reviewedAt: appealDoc.data().reviewedAt?.toDate ? appealDoc.data().reviewedAt.toDate() : null
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update appeal status (for admin)
 * @param {string} appealId - Appeal document ID
 * @param {string} status - New status ('reviewed', 'approved', 'rejected')
 * @param {string} adminId - Admin user ID
 * @param {string} adminNotes - Admin notes
 * @returns {Promise<void>}
 */
export const updateAppealStatus = async (appealId, status, adminId, adminNotes = '') => {
  try {
    const { updateDoc } = await import('firebase/firestore');
    const appealRef = doc(db, APPEALS_COLLECTION, appealId);
    await updateDoc(appealRef, {
      status,
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId,
      adminNotes
    });
    } catch (error) {
    throw error;
  }
};

