/**
 * User Payment Data Migration Helper
 * 
 * This file contains utilities for migrating user payment data to the consolidated structure.
 * 
 * NEW STRUCTURE (payment field map):
 * {
 *   payment: {
 *     type: 'monthly' | 'yearly',
 *     startDate: timestamp,
 *     status: 'active' | 'inactive',
 *     lastPaymentDate: timestamp,
 *     method: 'paypal',
 *     lastPayPalTransactionId: string,
 *     lastPayPalPayerEmail: string,
 *     paypalEmail: string,
 *     paypalConnectedAt: timestamp,
 *     paypalStatus: 'connected' | 'disconnected'
 *   }
 * }
 * 
 * OLD STRUCTURE (top-level fields - should be migrated):
 * - subscriptionPlan (→ payment.type)
 * - subscriptionStartDate (→ payment.startDate)
 * - subscriptionStatus (→ payment.status)
 * - lastPaymentDate (→ payment.lastPaymentDate)
 * - paymentMethod (→ payment.method)
 * - paypalEmail (→ payment.paypalEmail)
 * - paypalConnectedAt (→ payment.paypalConnectedAt)
 * - paypalStatus (→ payment.paypalStatus)
 * - lastPayPalPayerEmail (→ payment.lastPayPalPayerEmail)
 * - lastPayPalTransactionId (→ payment.lastPayPalTransactionId)
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Migrates old top-level payment fields to the payment map
 * This should be called once per user to clean up duplicate fields
 * 
 * @param {string} userId - The user ID to migrate
 * @returns {Promise<boolean>} - true if migration was performed, false if not needed
 */
export const migrateUserPaymentFields = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.warn('User document does not exist:', userId);
      return false;
    }
    
    const userData = userSnap.data();
    const existingPayment = userData.payment || {};
    
    // Check if migration is needed (if old fields exist but not in payment map)
    const hasOldFields = 
      userData.subscriptionPlan ||
      userData.subscriptionStartDate ||
      userData.subscriptionStatus ||
      userData.paymentMethod ||
      userData.paypalEmail ||
      userData.paypalConnectedAt ||
      userData.paypalStatus ||
      userData.lastPayPalPayerEmail ||
      userData.lastPayPalTransactionId ||
      userData.lastPaymentDate;
    
    // Check if payment map already has all the data (no migration needed)
    const paymentHasAllData = 
      existingPayment.type &&
      existingPayment.status &&
      existingPayment.method;
    
    if (!hasOldFields || paymentHasAllData) {
      // No migration needed
      return false;
    }
    
    // Build consolidated payment map from old fields
    const consolidatedPayment = {
      ...existingPayment, // Preserve existing payment data
      
      // Map old fields to new structure (only if not already in payment map)
      type: existingPayment.type || userData.subscriptionPlan || null,
      startDate: existingPayment.startDate || userData.subscriptionStartDate || null,
      status: existingPayment.status || userData.subscriptionStatus || null,
      lastPaymentDate: existingPayment.lastPaymentDate || userData.lastPaymentDate || null,
      method: existingPayment.method || userData.paymentMethod || 'paypal',
      paypalEmail: existingPayment.paypalEmail || userData.paypalEmail || null,
      paypalConnectedAt: existingPayment.paypalConnectedAt || userData.paypalConnectedAt || null,
      paypalStatus: existingPayment.paypalStatus || userData.paypalStatus || null,
      lastPayPalPayerEmail: existingPayment.lastPayPalPayerEmail || userData.lastPayPalPayerEmail || null,
      lastPayPalTransactionId: existingPayment.lastPayPalTransactionId || userData.lastPayPalTransactionId || null,
    };
    
    // Remove null values
    Object.keys(consolidatedPayment).forEach(key => {
      if (consolidatedPayment[key] === null) {
        delete consolidatedPayment[key];
      }
    });
    
    // Prepare update: set payment map and delete old top-level fields
    const updateData = {
      payment: consolidatedPayment
    };
    
    // Delete old top-level fields
    const fieldsToDelete = [
      'subscriptionPlan',
      'subscriptionStartDate',
      'subscriptionStatus',
      'paymentMethod',
      'paypalEmail',
      'paypalConnectedAt',
      'paypalStatus',
      'lastPayPalPayerEmail',
      'lastPayPalTransactionId',
      'lastPaymentDate'
    ];
    
    // Use deleteField for each old field (Firestore deleteField() import needed)
    const { deleteField } = await import('firebase/firestore');
    fieldsToDelete.forEach(field => {
      if (userData[field] !== undefined) {
        updateData[field] = deleteField();
      }
    });
    
    await updateDoc(userRef, updateData);
    console.log('✅ Migrated user payment fields to consolidated payment map:', userId);
    return true;
  } catch (error) {
    console.error('❌ Error migrating user payment fields:', error);
    throw error;
  }
};

/**
 * Reads payment data from user document (handles both old and new structure)
 * 
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Payment data (from payment map or migrated from old fields)
 */
export const getUserPaymentData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    const userData = userSnap.data();
    const payment = userData.payment || {};
    
    // If payment map is empty but old fields exist, return migrated structure (without saving)
    if (!payment.type && !payment.status && userData.subscriptionPlan) {
      return {
        type: userData.subscriptionPlan,
        startDate: userData.subscriptionStartDate,
        status: userData.subscriptionStatus,
        lastPaymentDate: userData.lastPaymentDate,
        method: userData.paymentMethod || 'paypal',
        paypalEmail: userData.paypalEmail,
        paypalConnectedAt: userData.paypalConnectedAt,
        paypalStatus: userData.paypalStatus,
        lastPayPalPayerEmail: userData.lastPayPalPayerEmail,
        lastPayPalTransactionId: userData.lastPayPalTransactionId,
      };
    }
    
    return payment;
  } catch (error) {
    console.error('Error reading user payment data:', error);
    return null;
  }
};

