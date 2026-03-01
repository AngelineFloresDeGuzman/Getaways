// Platform Settings Service for Admin
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const PLATFORM_SETTINGS_DOC_ID = 'platform_settings';

/**
 * Get platform settings
 * @returns {Promise<Object>} - Platform settings
 */
export const getPlatformSettings = async () => {
  try {
    const settingsRef = doc(db, 'platformSettings', PLATFORM_SETTINGS_DOC_ID);
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
    
    // Return default settings if document doesn't exist
    return {
      adminPayPalEmail: '',
      adminPayPalAccountName: '',
      updatedAt: null
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update platform settings
 * @param {Object} settings - Settings to update
 * @param {string} settings.adminPayPalEmail - Admin PayPal email
 * @param {string} settings.adminPayPalAccountName - Admin PayPal account name (optional)
 * @returns {Promise<Object>} - Updated settings
 */
export const updatePlatformSettings = async (settings) => {
  try {
    const settingsRef = doc(db, 'platformSettings', PLATFORM_SETTINGS_DOC_ID);
    const settingsDoc = await getDoc(settingsRef);
    
    const updateData = {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: 'admin' // In a real app, you'd get this from auth.currentUser
    };
    
    if (settingsDoc.exists()) {
      await updateDoc(settingsRef, updateData);
    } else {
      await setDoc(settingsRef, {
        ...updateData,
        createdAt: serverTimestamp()
      });
    }
    
    return updateData;
  } catch (error) {
    throw error;
  }
};

/**
 * Get admin PayPal email
 * @returns {Promise<string>} - Admin PayPal email
 */
export const getAdminPayPalEmail = async () => {
  try {
    const settings = await getPlatformSettings();
    return settings.adminPayPalEmail || '';
  } catch (error) {
    return '';
  }
};

/**
 * Update admin PayPal email
 * @param {string} email - PayPal email
 * @param {string} accountName - Account name (optional)
 * @returns {Promise<void>}
 */
export const updateAdminPayPalEmail = async (email, accountName = '') => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    await updatePlatformSettings({
      adminPayPalEmail: email.trim(),
      adminPayPalAccountName: accountName.trim() || ''
    });
  } catch (error) {
    throw error;
  }
};

