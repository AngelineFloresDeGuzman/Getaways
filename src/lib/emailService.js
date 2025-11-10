import emailjs from '@emailjs/browser';
import { db } from './firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialize EmailJS (you'll need to set these in your environment variables)
// Get these from https://dashboard.emailjs.com/admin/integration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_m3bzszx';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '1bELJwUeoejy0Q4cQ';
const EMAILJS_VERIFY_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VERIFY_TEMPLATE_ID || 'template_qo9q8de';
const EMAILJS_RESET_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID || 'template_btqnqws';
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@getaways.com';
// Logo URL - must be absolute URL for emails (hosted on your domain or CDN)
// Use environment variable or construct from current origin
const getLogoUrl = () => {
  if (import.meta.env.VITE_LOGO_URL) {
    return import.meta.env.VITE_LOGO_URL;
  }
  // Use window.location.origin if available, otherwise use a placeholder
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/logo.jpg`;
  }
  // Fallback for server-side or when window is not available
  return '/logo.jpg'; // This will need to be replaced with full URL in EmailJS template
};

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Generate a verification token and store it in Firestore
 */
export const generateVerificationToken = async (userId, email) => {
  try {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Store token in Firestore
    await addDoc(collection(db, 'verificationTokens'), {
      userId,
      email,
      token,
      type: 'email_verification',
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: Timestamp.now(),
      used: false,
    });

    return token;
  } catch (error) {
    console.error('Error generating verification token:', error);
    throw error;
  }
};

/**
 * Generate a password reset token and store it in Firestore
 */
export const generatePasswordResetToken = async (userId, email) => {
  try {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Store token in Firestore
    await addDoc(collection(db, 'passwordResetTokens'), {
      userId,
      email,
      token,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: Timestamp.now(),
      used: false,
    });

    return token;
  } catch (error) {
    console.error('Error generating password reset token:', error);
    throw error;
  }
};

/**
 * Verify and mark a verification token as used
 */
export const verifyToken = async (token) => {
  try {
    const tokensRef = collection(db, 'verificationTokens');
    const q = query(tokensRef, where('token', '==', token), where('used', '==', false));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data();

    // Check if token is expired
    const expiresAt = tokenData.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      return { valid: false, error: 'Token has expired' };
    }

    // Mark token as used
    await updateDoc(tokenDoc.ref, { used: true, usedAt: Timestamp.now() });

    return {
      valid: true,
      userId: tokenData.userId,
      email: tokenData.email,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false, error: 'Error verifying token' };
  }
};

/**
 * Verify and mark a password reset token as used
 */
export const verifyPasswordResetToken = async (token) => {
  try {
    const tokensRef = collection(db, 'passwordResetTokens');
    const q = query(tokensRef, where('token', '==', token), where('used', '==', false));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data();

    // Check if token is expired
    const expiresAt = tokenData.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      return { valid: false, error: 'Token has expired' };
    }

    return {
      valid: true,
      userId: tokenData.userId,
      email: tokenData.email,
      tokenDocRef: tokenDoc.ref,
    };
  } catch (error) {
    console.error('Error verifying password reset token:', error);
    return { valid: false, error: 'Error verifying token' };
  }
};

/**
 * Send verification email using EmailJS
 */
export const sendVerificationEmail = async (email, firstName, lastName, token) => {
  try {
    // Validate email
    if (!email || !email.trim()) {
      throw new Error('Recipient email address is required');
    }

    // Ensure EmailJS is initialized
    if (!EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS public key is not configured');
    }

    const verificationLink = `${window.location.origin}/verify-email?token=${token}`;

    // EmailJS requires the recipient email to be in the templateParams
    // Make sure your EmailJS template has "To Email" field set to use {{to_email}}
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
    const logoUrl = getLogoUrl(); // Get logo URL once
    const templateParams = {
      to_email: email.trim(), // This must match the template's "To Email" field variable
      to_name: firstName || 'User',
      user_name: fullName, // Full name for {{user_name}}
      first_name: firstName || '',
      last_name: lastName || '',
      verification_link: verificationLink,
      app_name: 'Getaways',
      support_email: SUPPORT_EMAIL, // Support email for {{support_email}} and mailto:{{support_email}}
      logo_url: logoUrl, // Absolute URL for logo image - use {{logo_url}} in template
      reply_to: email.trim(), // Also set reply_to
    };
    console.log('Sending verification email with params:', { 
      serviceId: EMAILJS_SERVICE_ID, 
      templateId: EMAILJS_VERIFY_TEMPLATE_ID,
      to_email: email.trim(),
      email_length: email.trim().length,
      logo_url: logoUrl // Log the logo URL being sent
    });

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_VERIFY_TEMPLATE_ID,
      templateParams
    );

    console.log('Verification email sent successfully:', response);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message,
      email_provided: email
    });
    throw error;
  }
};

/**
 * Send password reset email using EmailJS
 * @param {string} email - User's email address
 * @param {string} firstName - User's first name
 * @param {string} token - Custom password reset token
 */
export const sendPasswordResetEmail = async (email, firstName, token) => {
  try {
    // Validate email
    if (!email || !email.trim()) {
      throw new Error('Recipient email address is required');
    }

    // Ensure EmailJS is initialized
    if (!EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS public key is not configured');
    }

    const resetLink = `${window.location.origin}/reset-password?token=${token}`;

    // EmailJS requires the recipient email to be in the templateParams
    // Make sure your EmailJS template has "To Email" field set to use {{to_email}}
    // The resetLink is Firebase-generated and contains the oobCode parameter
    const fullName = firstName || 'User';
    const logoUrl = getLogoUrl(); // Get logo URL once
    const templateParams = {
      to_email: email.trim(), // This must match the template's "To Email" field variable
      to_name: firstName || 'User',
      user_name: fullName, // User name for {{user_name}}
      reset_link: resetLink, // Firebase-generated reset link with oobCode
      app_name: 'Getaways',
      support_email: SUPPORT_EMAIL, // Support email for {{support_email}} and mailto:{{support_email}}
      logo_url: logoUrl, // Absolute URL for logo image - use {{logo_url}} in template
      reply_to: email.trim(), // Also set reply_to
    };
    console.log('Sending password reset email with params:', { 
      serviceId: EMAILJS_SERVICE_ID, 
      templateId: EMAILJS_RESET_TEMPLATE_ID,
      to_email: email.trim(),
      email_length: email.trim().length,
      logo_url: logoUrl // Log the logo URL being sent
    });

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_RESET_TEMPLATE_ID,
      templateParams
    );

    console.log('Password reset email sent successfully:', response);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message,
      email_provided: email
    });
    throw error;
  }
};

