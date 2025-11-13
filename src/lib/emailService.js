import emailjs from '@emailjs/browser';
import { db } from './firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialize EmailJS (you'll need to set these in your environment variables)
// Get these from https://dashboard.emailjs.com/admin/integration

// Two separate services:
// - service_m3bzszx: for verification and password reset emails
// - service_i17lsmg: for booking confirmation and cancellation emails
const EMAILJS_AUTH_SERVICE_ID = import.meta.env.VITE_EMAILJS_AUTH_SERVICE_ID || 'service_m3bzszx';
const EMAILJS_BOOKING_SERVICE_ID = import.meta.env.VITE_EMAILJS_BOOKING_SERVICE_ID || 'service_i17lsmg'; // <-- Replace 'service_i17lsmg' with your actual EmailJS booking service ID from dashboard if needed

// Public keys for EmailJS
const EMAILJS_AUTH_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_AUTH_PUBLIC_KEY || '1bELJwUeoejy0Q4cQ'; // For auth emails
const EMAILJS_BOOKING_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_BOOKING_PUBLIC_KEY || 'Vy3E5HLPceR3d0Pmy'; // For guest emails

// Template IDs for authentication emails (verification, password reset)
const EMAILJS_VERIFY_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VERIFY_TEMPLATE_ID || 'template_qo9q8de';
const EMAILJS_RESET_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID || 'template_btqnqws';

// Template IDs for booking emails
const EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID || 'template_sl3wzej';
const EMAILJS_CANCELLATION_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CANCELLATION_TEMPLATE_ID || 'template_v7z3kcj';
const EMAILJS_SUBSCRIPTION_SUCCESS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_SUBSCRIPTION_SUCCESS_TEMPLATE_ID || 'template_subscription_success';

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
if (EMAILJS_AUTH_PUBLIC_KEY) {
  emailjs.init(EMAILJS_AUTH_PUBLIC_KEY);
}

/**
 * Validate EmailJS configuration
 */
export const validateEmailJSConfig = () => {
  const issues = [];
  
  if (!EMAILJS_AUTH_SERVICE_ID || EMAILJS_AUTH_SERVICE_ID === '') {
    issues.push('EMAILJS_AUTH_SERVICE_ID is missing or empty');
  }
  
  if (!EMAILJS_BOOKING_SERVICE_ID || EMAILJS_BOOKING_SERVICE_ID === '') {
    issues.push('EMAILJS_BOOKING_SERVICE_ID is missing or empty');
  }
  
  if (!EMAILJS_AUTH_PUBLIC_KEY || EMAILJS_AUTH_PUBLIC_KEY === '') {
    issues.push('EMAILJS_AUTH_PUBLIC_KEY is missing or empty');
  }
  
  if (!EMAILJS_VERIFY_TEMPLATE_ID || EMAILJS_VERIFY_TEMPLATE_ID === '') {
    issues.push('EMAILJS_VERIFY_TEMPLATE_ID is missing or empty');
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ EmailJS Configuration Issues:', issues);
    return { valid: false, issues };
  }
  
  return { valid: true, issues: [] };
};

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
    // Validate configuration first
    const configValidation = validateEmailJSConfig();
    if (!configValidation.valid) {
      console.error('❌ EmailJS configuration invalid:', configValidation.issues);
      throw new Error(`EmailJS configuration error: ${configValidation.issues.join(', ')}`);
    }

    // Validate email
    if (!email || !email.trim()) {
      throw new Error('Recipient email address is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email address format');
    }

    // Log configuration values for debugging
    console.log('📧 EmailJS Configuration (Auth):', {
      serviceId: EMAILJS_AUTH_SERVICE_ID,
      templateId: EMAILJS_VERIFY_TEMPLATE_ID,
      publicKey: EMAILJS_AUTH_PUBLIC_KEY ? `${EMAILJS_AUTH_PUBLIC_KEY.substring(0, 10)}...` : 'MISSING',
      publicKeyLength: EMAILJS_AUTH_PUBLIC_KEY?.length || 0,
      email: email.trim(),
    });

    // Re-initialize EmailJS to ensure it's properly set up
    if (EMAILJS_AUTH_PUBLIC_KEY) {
      emailjs.init(EMAILJS_AUTH_PUBLIC_KEY);
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
    
    console.log('📤 Sending verification email with params:', { 
      serviceId: EMAILJS_AUTH_SERVICE_ID, 
      templateId: EMAILJS_VERIFY_TEMPLATE_ID,
      to_email: email.trim(),
      email_length: email.trim().length,
      logo_url: logoUrl,
      templateParamsKeys: Object.keys(templateParams)
    });

    const response = await emailjs.send(
      EMAILJS_AUTH_SERVICE_ID,
      EMAILJS_VERIFY_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Verification email sent successfully:', response);
    return { success: true };
  } catch (error) {
    // Enhanced error logging
    console.error('❌ Error sending verification email:', error);
    console.error('❌ Error object:', JSON.stringify(error, null, 2));
    console.error('❌ Error details:', {
      status: error?.status,
      statusText: error?.statusText,
      text: error?.text,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      email_provided: email,
      serviceId: EMAILJS_AUTH_SERVICE_ID,
      templateId: EMAILJS_VERIFY_TEMPLATE_ID,
    });
    
    // Try to extract more details from EmailJS error
    if (error?.text) {
      try {
        const errorData = typeof error.text === 'string' ? JSON.parse(error.text) : error.text;
        console.error('❌ EmailJS error response:', errorData);
      } catch (e) {
        console.error('❌ EmailJS error text (raw):', error.text);
      }
    }
    
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
    if (!EMAILJS_AUTH_PUBLIC_KEY) {
      throw new Error('EmailJS auth public key is not configured');
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
      serviceId: EMAILJS_AUTH_SERVICE_ID, 
      templateId: EMAILJS_RESET_TEMPLATE_ID,
      to_email: email.trim(),
      email_length: email.trim().length,
      logo_url: logoUrl // Log the logo URL being sent
    });

    const response = await emailjs.send(
      EMAILJS_AUTH_SERVICE_ID,
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

/**
 * Send booking confirmation email to guest using EmailJS
 * @param {string} email - Guest's email address
 * @param {string} firstName - Guest's first name
 * @param {string} lastName - Guest's last name
 * @param {Object} bookingData - Booking details
 */
export const sendBookingConfirmationEmail = async (email, firstName, lastName, bookingData) => {
  try {
    if (!email || !email.trim()) {
      throw new Error('Recipient email address is required');
    }

    if (!EMAILJS_BOOKING_PUBLIC_KEY) {
      throw new Error('EmailJS booking public key is not configured');
    }

    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Guest';
    const logoUrl = getLogoUrl();
    const templateParams = {
      to_email: email.trim(),
      to_name: firstName || 'Guest',
      user_name: fullName,
      first_name: firstName || '',
      last_name: lastName || '',
      booking_id: bookingData.bookingId || '',
      listing_title: bookingData.listingTitle || 'Accommodation',
      check_in_date: bookingData.checkInDate || '',
      check_out_date: bookingData.checkOutDate || '',
      guests: bookingData.guests || 1,
      total_price: bookingData.totalPrice ? `₱${parseFloat(bookingData.totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00',
      booking_amount: bookingData.bookingAmount ? `₱${parseFloat(bookingData.bookingAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00',
      payment_method: bookingData.paymentMethod || 'GetPay Wallet',
      app_name: 'Getaways',
      support_email: SUPPORT_EMAIL,
      logo_url: logoUrl,
      reply_to: email.trim(),
    };

    console.log('Sending booking confirmation email with params:', {
      serviceId: EMAILJS_BOOKING_SERVICE_ID,
      templateId: EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID,
      to_email: email.trim(),
    });

    const response = await emailjs.send(
      EMAILJS_BOOKING_SERVICE_ID,
      EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID,
      templateParams
    );

    console.log('Booking confirmation email sent successfully:', response);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    // Don't throw - email failure shouldn't break booking creation
    return { success: false, error: error.message };
  }
};

/**
 * Send subscription confirmation email to host using EmailJS
 * @param {string} email - Host's email address
 * @param {string} firstName - Host's first name
 * @param {string} lastName - Host's last name
 * @param {Object} subscriptionData - Subscription details
 */
export const sendSubscriptionConfirmationEmail = async (email, firstName, lastName, subscriptionData) => {
  try {
    if (!email || !email.trim()) {
      throw new Error('Recipient email address is required');
    }

    if (!EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS public key is not configured');
    }

    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Host';
    const logoUrl = getLogoUrl();
    const templateParams = {
      to_email: email.trim(),
      to_name: firstName || 'Host',
      user_name: fullName,
      first_name: firstName || '',
      last_name: lastName || '',
      subscription_type: subscriptionData.subscriptionType || 'monthly',
      subscription_plan: subscriptionData.subscriptionPlan || 'Monthly',
      amount: subscriptionData.amount ? `₱${parseFloat(subscriptionData.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00',
      payment_method: subscriptionData.paymentMethod || 'GetPay Wallet',
      expires_at: subscriptionData.expiresAt || '',
      app_name: 'Getaways',
      support_email: SUPPORT_EMAIL,
      logo_url: logoUrl,
      reply_to: email.trim(),
    };

    console.log('Sending subscription confirmation email with params:', {
      serviceId: EMAILJS_BOOKING_SERVICE_ID,
      templateId: EMAILJS_SUBSCRIPTION_SUCCESS_TEMPLATE_ID,
      to_email: email.trim(),
    });

    const response = await emailjs.send(
      EMAILJS_BOOKING_SERVICE_ID,
      EMAILJS_SUBSCRIPTION_SUCCESS_TEMPLATE_ID,
      templateParams
    );

    console.log('Subscription confirmation email sent successfully:', response);
    return { success: true };
  } catch (error) {
    console.error('Error sending subscription confirmation email:', error);
    // Don't throw - email failure shouldn't break subscription
    return { success: false, error: error.message };
  }
};

/**
 * Send cancellation confirmation email to guest using EmailJS
 * @param {string} email - Guest's email address
 * @param {string} firstName - Guest's first name
 * @param {string} lastName - Guest's last name
 * @param {Object} cancellationData - Cancellation details
 */
export const sendCancellationEmail = async (email, firstName, lastName, cancellationData) => {
  try {
    if (!email || !email.trim()) {
      throw new Error('Recipient email address is required');
    }

    if (!EMAILJS_BOOKING_PUBLIC_KEY) {
      throw new Error('EmailJS booking public key is not configured');
    }

    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Guest';
    const logoUrl = getLogoUrl();
    const templateParams = {
      to_email: email.trim(),
      to_name: firstName || 'Guest',
      user_name: fullName,
      first_name: firstName || '',
      last_name: lastName || '',
      booking_id: cancellationData.bookingId || '',
      listing_title: cancellationData.listingTitle || 'Accommodation',
      check_in_date: cancellationData.checkInDate || '',
      check_out_date: cancellationData.checkOutDate || '',
      refund_amount: cancellationData.refundAmount ? `₱${parseFloat(cancellationData.refundAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00',
      refund_type: cancellationData.refundType === 'full_refund' ? 'Full Refund' : cancellationData.refundType === 'half_refund' ? 'Half Refund' : 'No Refund',
      refund_status: cancellationData.refundPending ? 'Pending Admin Processing' : cancellationData.refundProcessed ? 'Processed' : 'Not Applicable',
      app_name: 'Getaways',
      support_email: SUPPORT_EMAIL,
      logo_url: logoUrl,
      reply_to: email.trim(),
    };

    console.log('Sending cancellation email with params:', {
      serviceId: EMAILJS_BOOKING_SERVICE_ID,
      templateId: EMAILJS_CANCELLATION_TEMPLATE_ID,
      to_email: email.trim(),
    });

    const response = await emailjs.send(
      EMAILJS_BOOKING_SERVICE_ID,
      EMAILJS_CANCELLATION_TEMPLATE_ID,
      templateParams
    );

    console.log('Cancellation email sent successfully:', response);
    return { success: true };
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    // Don't throw - email failure shouldn't break cancellation
    return { success: false, error: error.message };
  }
};

