import { auth, db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';

/**
 * Get admin user ID from users collection
 * @returns {Promise<string|null>} - Admin user ID or null if not found
 */
export const getAdminUserId = async () => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('roles', 'array-contains', 'admin')
    );
    const querySnapshot = await getDocs(usersQuery);
    
    if (!querySnapshot.empty) {
      // Return the first admin user ID found
      return querySnapshot.docs[0].id;
    }
    
    // Fallback: check for admin role in single role field
    const allUsersSnapshot = await getDocs(collection(db, 'users'));
    for (const userDoc of allUsersSnapshot.docs) {
      const userData = userDoc.data();
      const roles = Array.isArray(userData.roles) ? userData.roles : (userData.role ? [userData.role] : []);
      if (roles.includes('admin')) {
        return userDoc.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting admin user ID:', error);
    return null;
  }
};

/**
 * Get GetPay wallet balance for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Wallet balance
 */
export const getWalletBalance = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      // Get wallet balance from user document
      const wallet = userData.getpay || {};
      return wallet.balance || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
};

/**
 * Initialize GetPay wallet for a user (if it doesn't exist)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const initializeWallet = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (!userData.getpay) {
        await updateDoc(userRef, {
          getpay: {
            balance: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
        });
      }
    }
  } catch (error) {
    console.error('Error initializing wallet:', error);
    throw error;
  }
};

/**
 * Cash in to GetPay wallet from PayPal
 * @param {string} userId - User ID
 * @param {number} amount - Amount to cash in
 * @param {string} paypalTransactionId - PayPal transaction ID
 * @param {string} paypalEmail - PayPal email used for cash-in
 * @returns {Promise<Object>} - Transaction details
 */
export const cashInFromPayPal = async (userId, amount, paypalTransactionId, paypalEmail) => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('User not authenticated');
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    // Initialize wallet if it doesn't exist
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const userData = userSnap.data();
    if (!userData.getpay) {
      // Initialize wallet first
      await updateDoc(userRef, {
        getpay: {
          balance: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      });
    }

    // Get current balance after potential initialization
    const updatedUserSnap = await getDoc(userRef);
    const updatedUserData = updatedUserSnap.data();
    const currentBalance = updatedUserData.getpay?.balance || 0;

    // Now update wallet balance and create transaction in a batch
    const batch = writeBatch(db);

    // Update wallet balance
    batch.update(userRef, {
      'getpay.balance': increment(amount),
      'getpay.updatedAt': serverTimestamp(),
      'getpay.lastCashIn': serverTimestamp()
    });

    // Create wallet transaction record
    const transactionsRef = collection(db, 'walletTransactions');
    const transactionRef = doc(transactionsRef);
    const transactionData = {
      userId,
      type: 'cash_in',
      amount,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + amount,
      status: 'completed',
      method: 'paypal',
      paypalTransactionId,
      paypalEmail,
      description: `Cash in from PayPal`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    batch.set(transactionRef, transactionData);

    await batch.commit();

    return {
      transactionId: transactionRef.id,
      ...transactionData,
      balanceAfter: transactionData.balanceAfter
    };
  } catch (error) {
    console.error('Error cashing in from PayPal:', error);
    throw error;
  }
};

/**
 * Deduct from GetPay wallet (for payments)
 * @param {string} userId - User ID
 * @param {number} amount - Amount to deduct
 * @param {string} description - Transaction description
 * @param {Object} metadata - Additional metadata (bookingId, etc.)
 * @returns {Promise<Object>} - Transaction details
 */
export const deductFromWallet = async (userId, amount, description, metadata = {}, skipAuthCheck = false) => {
  // Allow system-level deductions (like points deduction) to skip auth check
  if (!skipAuthCheck && (!auth.currentUser || auth.currentUser.uid !== userId)) {
    throw new Error('User not authenticated');
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const wallet = userSnap.data().getpay || {};
    const currentBalance = wallet.balance || 0;

    if (currentBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const batch = writeBatch(db);

    // Update wallet balance
    batch.update(userRef, {
      'getpay.balance': increment(-amount),
      'getpay.updatedAt': serverTimestamp()
    });

    // Create wallet transaction record
    const transactionsRef = collection(db, 'walletTransactions');
    const transactionRef = doc(transactionsRef);
    const transactionData = {
      userId,
      type: 'payment',
      amount,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount,
      status: 'completed',
      method: 'getpay',
      description,
      metadata,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    batch.set(transactionRef, transactionData);

    await batch.commit();

    return {
      transactionId: transactionRef.id,
      ...transactionData,
      balanceAfter: transactionData.balanceAfter
    };
  } catch (error) {
    console.error('Error deducting from wallet:', error);
    throw error;
  }
};

/**
 * Add to GetPay wallet (for earnings/refunds)
 * @param {string} userId - User ID
 * @param {number} amount - Amount to add
 * @param {string} description - Transaction description
 * @param {Object} metadata - Additional metadata (bookingId, etc.)
 * @returns {Promise<Object>} - Transaction details
 */
export const addToWallet = async (userId, amount, description, metadata = {}) => {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const wallet = userSnap.data().getpay || {};
    const currentBalance = wallet.balance || 0;
    const userData = userSnap.data();

    const batch = writeBatch(db);

    // Initialize wallet if it doesn't exist
    if (!userSnap.data().getpay) {
      batch.set(userRef, {
        getpay: {
          balance: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      }, { merge: true });
    }

    // Process pending debts first (if any)
    // Debts are paid from the incoming credit before it's added to balance
    const pointsDebts = userData.pointsDebts || [];
    let remainingCredit = amount;
    let totalDebtPaid = 0;
    const debtsToRemove = [];
    const debtsToUpdate = [];
    
    if (pointsDebts.length > 0 && amount > 0) {
      // Sort debts by creation date (oldest first)
      const sortedDebts = [...pointsDebts].sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return aDate - bDate;
      });
      
      for (let i = 0; i < sortedDebts.length && remainingCredit > 0; i++) {
        const debt = sortedDebts[i];
        const debtAmount = debt.currencyValue || (debt.points * POINTS_TO_CURRENCY_RATE);
        
        if (debtAmount <= remainingCredit) {
          // Fully pay off this debt
          totalDebtPaid += debtAmount;
          remainingCredit -= debtAmount;
          debtsToRemove.push(debt.listingId);
          
          // Create transaction for debt payment (balance doesn't change, credit pays debt)
          const debtTransactionRef = doc(collection(db, 'walletTransactions'));
          batch.set(debtTransactionRef, {
            userId,
            type: 'payment',
            amount: debtAmount,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance,
            status: 'completed',
            method: 'getpay',
            description: `Debt payment for unpublished listing (from credit)`,
            metadata: {
              listingId: debt.listingId,
              pointsDebt: debt.points,
              reason: 'points_debt_payment',
              paidFromCredit: true
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else if (remainingCredit > 0) {
          // Partially pay off this debt
          totalDebtPaid += remainingCredit;
          const updatedDebt = {
            ...debt,
            currencyValue: debtAmount - remainingCredit,
            points: (debtAmount - remainingCredit) / POINTS_TO_CURRENCY_RATE,
            paidAmount: (debt.paidAmount || 0) + remainingCredit
          };
          debtsToUpdate.push(updatedDebt);
          
          // Create transaction for partial debt payment
          const debtTransactionRef = doc(collection(db, 'walletTransactions'));
          batch.set(debtTransactionRef, {
            userId,
            type: 'payment',
            amount: remainingCredit,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance,
            status: 'completed',
            method: 'getpay',
            description: `Partial debt payment for unpublished listing (from credit)`,
            metadata: {
              listingId: debt.listingId,
              pointsDebt: remainingCredit / POINTS_TO_CURRENCY_RATE,
              reason: 'points_debt_partial_payment',
              partial: true,
              paidFromCredit: true
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          remainingCredit = 0;
        }
      }
      
      // Update debts array: remove fully paid, update partially paid
      const updatedDebts = sortedDebts
        .filter(debt => !debtsToRemove.includes(debt.listingId))
        .map(debt => {
          const updated = debtsToUpdate.find(d => d.listingId === debt.listingId);
          return updated || debt;
        });
      
      if (updatedDebts.length !== pointsDebts.length || debtsToUpdate.length > 0) {
        batch.update(userRef, {
          pointsDebts: updatedDebts
        });
      }
    }

    // Final balance: current balance + remaining credit (after debt payments)
    const finalBalance = currentBalance + remainingCredit;
    batch.update(userRef, {
      'getpay.balance': finalBalance,
      'getpay.updatedAt': serverTimestamp()
    });

    // Create wallet transaction record for the credit (net amount after debt payments)
    if (remainingCredit > 0) {
      const transactionsRef = collection(db, 'walletTransactions');
      const transactionRef = doc(transactionsRef);
      const transactionData = {
        userId,
        type: 'credit',
        amount: remainingCredit,
        balanceBefore: currentBalance,
        balanceAfter: finalBalance,
        status: 'completed',
        method: 'getpay',
        description: totalDebtPaid > 0 ? `${description} (₱${totalDebtPaid} used for debt payment)` : description,
        metadata: {
          ...metadata,
          originalAmount: amount,
          debtPaid: totalDebtPaid,
          netCredit: remainingCredit
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      batch.set(transactionRef, transactionData);
    }

    await batch.commit();

    return {
      balanceAfter: finalBalance,
      originalAmount: amount,
      debtPaid: totalDebtPaid,
      netCredit: remainingCredit
    };
  } catch (error) {
    console.error('Error adding to wallet:', error);
    throw error;
  }
};

/**
 * Get wallet transactions for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of transactions to return
 * @returns {Promise<Array>} - Array of transactions
 */
export const getWalletTransactions = async (userId, limit = 100) => {
  try {
    const transactionsRef = collection(db, 'walletTransactions');
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const transactions = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        date: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      });
    });

    return transactions.slice(0, limit);
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    // If index doesn't exist, try without orderBy
    try {
      const transactionsRef = collection(db, 'walletTransactions');
      const q = query(
        transactionsRef,
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const transactions = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          date: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        });
      });

      // Sort manually by date
      transactions.sort((a, b) => b.date - a.date);

      return transactions.slice(0, limit);
    } catch (fallbackError) {
      console.error('Error getting wallet transactions (fallback):', fallbackError);
      return [];
    }
  }
};

/**
 * Check if user has sufficient wallet balance
 * @param {string} userId - User ID
 * @param {number} amount - Amount to check
 * @returns {Promise<boolean>} - True if balance is sufficient
 */
export const hasSufficientBalance = async (userId, amount) => {
  const balance = await getWalletBalance(userId);
  return balance >= amount;
};

/**
 * Points to currency conversion rate
 * 10 points = ₱1 (PHP)
 * 1 point = ₱0.10
 */
const POINTS_TO_CURRENCY_RATE = 0.1; // 10 points = ₱1

/**
 * Cash out from GetPay wallet to PayPal
 * Note: This creates a cash-out request. Actual PayPal payout requires server-side processing.
 * @param {string} userId - User ID
 * @param {number} amount - Amount to cash out
 * @param {string} paypalEmail - PayPal email to send money to
 * @returns {Promise<Object>} - Transaction details
 */
export const cashOutToPayPal = async (userId, amount, paypalEmail) => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('User not authenticated');
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Minimum cash-out amount (e.g., ₱100)
  const MIN_CASH_OUT_AMOUNT = 100;
  if (amount < MIN_CASH_OUT_AMOUNT) {
    throw new Error(`Minimum cash-out amount is ₱${MIN_CASH_OUT_AMOUNT}`);
  }

  // Validate PayPal email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!paypalEmail || !emailRegex.test(paypalEmail)) {
    throw new Error('Valid PayPal email is required');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const wallet = userSnap.data().getpay || {};
    const currentBalance = wallet.balance || 0;

    if (currentBalance < amount) {
      throw new Error(`Insufficient wallet balance. You have ₱${currentBalance.toLocaleString()} but need ₱${amount.toLocaleString()}`);
    }

    // Manual cash-out flow: Deduct from wallet and create pending transaction
    // Admin will process the payout manually via PayPal and mark as completed
    const transactionsRef = collection(db, 'walletTransactions');
    const transactionRef = doc(transactionsRef);
    const cashOutTransactionId = `CO_${Date.now()}_${userId.substring(0, 8)}`;
    
    const transactionData = {
      userId,
      type: 'cash_out',
      amount,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount, // Deduct immediately
      status: 'pending', // Waiting for admin to process manually
      method: 'paypal',
      paypalEmail,
      paypalTransactionId: cashOutTransactionId,
      description: `Cash out to PayPal (${paypalEmail}) - Pending admin processing`,
      metadata: {
        cashOutRequest: true,
        manualProcessing: true,
        adminActionRequired: true,
        requestedAt: new Date().toISOString()
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Use batch to ensure atomicity
    const batch = writeBatch(db);

    // Deduct from wallet balance
    batch.update(userRef, {
      'getpay.balance': increment(-amount),
      'getpay.updatedAt': serverTimestamp(),
      'getpay.lastCashOut': serverTimestamp()
    });

    // Create transaction record
    batch.set(transactionRef, transactionData);

    await batch.commit();

    console.log('Cash-out request created. Waiting for admin processing.');

    return {
      transactionId: transactionRef.id,
      cashOutTransactionId,
      status: 'pending',
      message: `Cash-out request submitted! ₱${amount.toLocaleString()} has been deducted from your wallet and is pending admin processing. You will receive the money in your PayPal account (${paypalEmail}) within 1-3 business days after admin processes your request.`
    };
  } catch (error) {
    console.error('Error cashing out to PayPal:', error);
    throw error;
  }
};

