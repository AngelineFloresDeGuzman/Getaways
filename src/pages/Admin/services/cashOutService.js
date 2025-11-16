// Cash Out Request Service for Admin
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';

const CASH_OUT_REQUESTS_COLLECTION = 'cashOutRequests';
const WALLET_TRANSACTIONS_COLLECTION = 'walletTransactions';

/**
 * Get all cash out requests
 * @param {string} status - Optional status filter ('pending', 'approved', 'rejected')
 * @returns {Promise<Array>} Array of cash out requests
 */
export const getAllCashOutRequests = async (status = null) => {
  try {
    let q;
    if (status) {
      q = query(
        collection(db, CASH_OUT_REQUESTS_COLLECTION),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, CASH_OUT_REQUESTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null,
      updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : null,
      reviewedAt: doc.data().reviewedAt?.toDate ? doc.data().reviewedAt.toDate() : null
    }));
  } catch (error) {
    console.error('Error getting cash out requests:', error);
    throw error;
  }
};

/**
 * Approve a cash out request
 * This deducts the money from user's wallet and creates a transaction record
 * @param {string} requestId - Cash out request ID
 * @param {string} adminId - Admin user ID
 * @param {string} adminNotes - Optional admin notes
 * @returns {Promise<void>}
 */
export const approveCashOutRequest = async (requestId, adminId, adminNotes = '') => {
  try {
    const requestRef = doc(db, CASH_OUT_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      throw new Error('Cash out request not found');
    }

    const requestData = requestDoc.data();

    if (requestData.status !== 'pending') {
      throw new Error(`Cannot approve request with status: ${requestData.status}`);
    }

    // Check if user still has sufficient balance
    const userRef = doc(db, 'users', requestData.userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const currentBalance = userData.getpay?.balance || 0;

    if (currentBalance < requestData.amount) {
      throw new Error(`User has insufficient balance. Current: ₱${currentBalance.toLocaleString()}, Required: ₱${requestData.amount.toLocaleString()}`);
    }

    // Use batch to ensure atomicity
    const batch = writeBatch(db);

    // 1. Update request status to approved
    batch.update(requestRef, {
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      adminNotes: adminNotes || 'Approved by admin',
      balanceAfter: currentBalance - requestData.amount,
      updatedAt: serverTimestamp()
    });

    // 2. Deduct from user's wallet balance
    batch.update(userRef, {
      'getpay.balance': increment(-requestData.amount),
      'getpay.updatedAt': serverTimestamp(),
      'getpay.lastCashOut': serverTimestamp()
    });

    // 3. Create wallet transaction record
    const transactionsRef = collection(db, WALLET_TRANSACTIONS_COLLECTION);
    const transactionRef = doc(transactionsRef);
    batch.set(transactionRef, {
      userId: requestData.userId,
      type: 'cash_out',
      amount: requestData.amount,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - requestData.amount,
      status: 'approved',
      method: 'paypal',
      paypalEmail: requestData.paypalEmail,
      paypalTransactionId: requestData.paypalTransactionId,
      description: `Cash out to PayPal (${requestData.paypalEmail}) - Approved by admin`,
      metadata: {
        cashOutRequest: true,
        requestId: requestId,
        approvedBy: adminId,
        approvedAt: new Date().toISOString(),
        adminNotes: adminNotes || 'Approved by admin'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      date: serverTimestamp()
    });

    await batch.commit();
    console.log(`✅ Cash out request ${requestId} approved. ₱${requestData.amount} deducted from user ${requestData.userId}`);
  } catch (error) {
    console.error('Error approving cash out request:', error);
    throw error;
  }
};

/**
 * Reject a cash out request
 * @param {string} requestId - Cash out request ID
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<void>}
 */
export const rejectCashOutRequest = async (requestId, adminId, reason = '') => {
  try {
    const requestRef = doc(db, CASH_OUT_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      throw new Error('Cash out request not found');
    }

    const requestData = requestDoc.data();

    if (requestData.status !== 'pending') {
      throw new Error(`Cannot reject request with status: ${requestData.status}`);
    }

    await updateDoc(requestRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      adminNotes: reason || 'Rejected by admin',
      updatedAt: serverTimestamp()
    });

    console.log(`❌ Cash out request ${requestId} rejected. Reason: ${reason || 'No reason provided'}`);
  } catch (error) {
    console.error('Error rejecting cash out request:', error);
    throw error;
  }
};

