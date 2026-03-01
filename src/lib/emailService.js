import emailjs from '@emailjs/browser';
import { db } from './firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialize EmailJS (you'll need to set these in your environment variables)
// Get these from https://dashboard.emailjs.com/admin/integration

// Two separate services:
// - Configured in environment variables for security
const EMAILJS_AUTH_SERVICE_ID = import.meta.env.VITE_EMAILJS_AUTH_SERVICE_ID;
const EMAILJS_BOOKING_SERVICE_ID = import.meta.env.VITE_EMAILJS_BOOKING_SERVICE_ID;

// Public keys for EmailJS
const EMAILJS_AUTH_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_AUTH_PUBLIC_KEY;
const EMAILJS_BOOKING_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_BOOKING_PUBLIC_KEY;

// Template IDs for authentication emails (verification, password reset)
const EMAILJS_VERIFY_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_VERIFY_TEMPLATE_ID;
const EMAILJS_RESET_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID;

// Template IDs for booking emails
const EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID;
const EMAILJS_CANCELLATION_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CANCELLATION_TEMPLATE_ID;
const EMAILJS_SUBSCRIPTION_SUCCESS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_SUBSCRIPTION_SUCCESS_TEMPLATE_ID;

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
      console.warn('⚠️ Cannot send booking confirmation email: Recipient email address is required');
      return { success: false, error: 'Recipient email address is required' };
    }

    // Check if EmailJS is properly configured
    if (!EMAILJS_BOOKING_PUBLIC_KEY || !EMAILJS_BOOKING_SERVICE_ID || !EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID) {
      console.warn('⚠️ EmailJS is not configured for booking emails. Skipping email send.');
      return { success: false, error: 'EmailJS not configured', skipped: true };
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

    // Initialize EmailJS with booking public key if not already initialized with it
    if (EMAILJS_BOOKING_PUBLIC_KEY) {
      emailjs.init(EMAILJS_BOOKING_PUBLIC_KEY);
    }

    console.log('Sending booking confirmation email with params:', {
      serviceId: EMAILJS_BOOKING_SERVICE_ID,
      templateId: EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID,
      to_email: email.trim(),
      publicKey: EMAILJS_BOOKING_PUBLIC_KEY ? 'configured' : 'missing'
    });

    const response = await emailjs.send(
      EMAILJS_BOOKING_SERVICE_ID,
      EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Booking confirmation email sent successfully:', response);
    return { success: true };
  } catch (error) {
    // Check if it's a configuration error (service not found, etc.)
    const isConfigError = error?.text?.includes('service ID not found') || 
                         error?.text?.includes('template') ||
                         error?.status === 400;
    
    if (isConfigError) {
      console.warn('⚠️ EmailJS is not properly configured for booking emails. Email sending skipped.', {
        serviceId: EMAILJS_BOOKING_SERVICE_ID,
        templateId: EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID,
        error: error.text || error.message
      });
      return { success: false, error: 'EmailJS not configured', skipped: true };
    }
    
    // For other errors, log but don't break the booking flow
    console.warn('⚠️ Failed to send booking confirmation email (non-critical):', error.message || error.text);
    return { success: false, error: error.message || error.text };
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

    if (!EMAILJS_BOOKING_PUBLIC_KEY) {
      throw new Error('EmailJS booking public key is not configured');
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
      console.warn('⚠️ Cannot send cancellation email: Recipient email address is required');
      return { success: false, error: 'Recipient email address is required' };
    }

    // Check if EmailJS is properly configured
    if (!EMAILJS_BOOKING_PUBLIC_KEY || !EMAILJS_BOOKING_SERVICE_ID || !EMAILJS_CANCELLATION_TEMPLATE_ID) {
      console.warn('⚠️ EmailJS is not configured for cancellation emails. Skipping email send.');
      return { success: false, error: 'EmailJS not configured', skipped: true };
    }

    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Guest';
    const logoUrl = getLogoUrl();
    
    // Helper function to sanitize strings for EmailJS (removes problematic characters)
    const sanitizeForEmailJS = (value) => {
      if (value === null || value === undefined) return '';
      try {
        let str = String(value);
        // Remove or replace problematic characters that EmailJS might not handle well
        // Remove null bytes, control characters (except newlines, tabs, carriage returns)
        str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        // Replace curly braces that aren't part of template variables (but keep {{variable}} patterns)
        // This is tricky - we'll be more conservative and just ensure no standalone braces
        // EmailJS uses {{variable}} so we need to be careful
        return str.trim();
      } catch (e) {
        console.warn('Error sanitizing string for EmailJS:', e);
        return '';
      }
    };
    
    // Helper function to safely convert values to strings for EmailJS
    const safeString = (value, defaultValue = '') => {
      if (value === null || value === undefined) {
        const sanitized = sanitizeForEmailJS(defaultValue);
        return sanitized || '';
      }
      try {
        const sanitized = sanitizeForEmailJS(value);
        return sanitized || sanitizeForEmailJS(defaultValue) || '';
      } catch (e) {
        const sanitized = sanitizeForEmailJS(defaultValue);
        return sanitized || '';
      }
    };
    
    // Safely format refund amount - use PHP instead of peso sign to avoid Unicode issues
    let refundAmountFormatted = 'PHP 0.00';
    if (cancellationData.refundAmount !== null && cancellationData.refundAmount !== undefined) {
      try {
        const refundNum = parseFloat(cancellationData.refundAmount);
        if (!isNaN(refundNum) && isFinite(refundNum) && refundNum >= 0) {
          // Use PHP instead of peso sign to avoid EmailJS corruption issues
          const formatted = refundNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          refundAmountFormatted = `PHP ${formatted}`;
        }
      } catch (e) {
        console.warn('Error formatting refund amount:', e);
        refundAmountFormatted = 'PHP 0.00';
      }
    }
    
    // Determine refund type safely - handle all possible values
    let refundTypeText = 'No Refund';
    const refundType = cancellationData?.refundType || '';
    if (refundType === 'full_refund' || refundType === 'full') {
      refundTypeText = 'Full Refund';
    } else if (refundType === 'half_refund' || refundType === 'half') {
      refundTypeText = 'Half Refund';
    } else if (refundType === 'no_refund' || refundType === 'none' || !refundType) {
      refundTypeText = 'No Refund';
    } else {
      // Fallback for any other value
      refundTypeText = String(refundType) || 'No Refund';
    }
    
    // Determine refund status safely
    let refundStatusText = 'Not Applicable';
    if (cancellationData.refundPending === true) {
      refundStatusText = 'Pending Admin Processing';
    } else if (cancellationData.refundProcessed === true) {
      refundStatusText = 'Processed';
    }
    
    // Create refund message based on status (EmailJS doesn't support conditionals)
    let refundMessage = 'No refund is applicable for this cancellation.';
    if (cancellationData.refundPending === true) {
      refundMessage = 'Your refund request has been submitted and is pending admin processing. You will receive another email once your refund has been processed.';
    } else if (cancellationData.refundProcessed === true) {
      refundMessage = 'Your refund has been processed and should appear in your account within 5-7 business days.';
    }
    
    // Ensure all values are strings and properly sanitized
    // CRITICAL: All values must be non-empty strings or EmailJS will fail
    const templateParams = {
      to_email: safeString(email?.trim(), 'guest@example.com'),
      to_name: safeString(firstName, 'Guest'),
      user_name: safeString(fullName, 'Guest'),
      first_name: safeString(firstName, 'Guest'),
      last_name: safeString(lastName, ''),
      booking_id: safeString(cancellationData?.bookingId, 'N/A'),
      listing_title: safeString(cancellationData?.listingTitle, 'Accommodation'),
      check_in_date: safeString(cancellationData?.checkInDate, 'N/A'),
      check_out_date: safeString(cancellationData?.checkOutDate, 'N/A'),
      refund_amount: safeString(refundAmountFormatted, 'PHP 0.00'),
      refund_type: safeString(refundTypeText, 'No Refund'),
      refund_status: safeString(refundStatusText, 'Not Applicable'),
      refund_message: safeString(refundMessage, 'No refund is applicable for this cancellation.'),
      app_name: safeString('Getaways', 'Getaways'),
      support_email: safeString(SUPPORT_EMAIL || 'support@getaways.com', 'support@getaways.com'),
      logo_url: safeString(logoUrl || 'https://via.placeholder.com/150', 'https://via.placeholder.com/150'),
      reply_to: safeString(email?.trim(), 'noreply@getaways.com'),
    };
    
    // Final validation: ensure no undefined, null, or empty values that could corrupt EmailJS
    Object.keys(templateParams).forEach(key => {
      const value = templateParams[key];
      if (value === undefined || value === null || value === '') {
        console.warn(`⚠️ Template param ${key} is empty, using fallback`);
        // Use appropriate fallback based on key
        if (key.includes('email')) {
          templateParams[key] = 'noreply@getaways.com';
        } else if (key.includes('url')) {
          templateParams[key] = 'https://via.placeholder.com/150';
        } else {
          templateParams[key] = 'N/A';
        }
      }
      // Ensure it's a string
      templateParams[key] = String(templateParams[key]);
    });
    
    // Log all template params for debugging (but mask sensitive data)
    console.log('📧 Cancellation email template params (sanitized):', {
      keys: Object.keys(templateParams),
      paramCount: Object.keys(templateParams).length,
      hasEmptyValues: Object.values(templateParams).some(v => !v || v.trim() === ''),
      sampleValues: {
        to_email: templateParams.to_email ? `${templateParams.to_email.substring(0, 3)}...` : 'empty',
        booking_id: templateParams.booking_id,
        listing_title: templateParams.listing_title?.substring(0, 30) || 'empty',
        check_in_date: templateParams.check_in_date,
        refund_amount: templateParams.refund_amount,
        refund_type: templateParams.refund_type,
      }
    });
    
    // Additional validation: Check for any characters that might corrupt EmailJS
    const problematicChars = /[{}]/g; // Curly braces outside of template variables
    let hasProblematicChars = false;
    Object.keys(templateParams).forEach(key => {
      const value = templateParams[key];
      // Check if value contains standalone curly braces (not part of template syntax)
      // EmailJS template variables use {{variable}}, so standalone { or } are problematic
      if (typeof value === 'string' && value.match(problematicChars)) {
        // Check if it's NOT a template variable pattern
        if (!value.match(/^{{[a-zA-Z_][a-zA-Z0-9_]*}}$/)) {
          console.warn(`⚠️ Template param ${key} contains potentially problematic characters:`, value);
          hasProblematicChars = true;
          // Remove standalone curly braces
          templateParams[key] = value.replace(/[{}]/g, '');
        }
      }
    });
    
    if (hasProblematicChars) {
      console.warn('⚠️ Some template params had problematic characters and were cleaned');
    }

    // Initialize EmailJS with booking public key if not already initialized with it
    if (EMAILJS_BOOKING_PUBLIC_KEY) {
      emailjs.init(EMAILJS_BOOKING_PUBLIC_KEY);
    }

    console.log('Sending cancellation email with params:', {
      serviceId: EMAILJS_BOOKING_SERVICE_ID,
      templateId: EMAILJS_CANCELLATION_TEMPLATE_ID,
      to_email: email.trim(),
      publicKey: EMAILJS_BOOKING_PUBLIC_KEY ? 'configured' : 'missing'
    });

    // Log the exact params being sent (for debugging)
    console.log('📤 Sending to EmailJS with these params:', {
      serviceId: EMAILJS_BOOKING_SERVICE_ID,
      templateId: EMAILJS_CANCELLATION_TEMPLATE_ID,
      paramKeys: Object.keys(templateParams),
      paramValues: Object.keys(templateParams).reduce((acc, key) => {
        const value = templateParams[key];
        // Log first 50 chars of each value for debugging
        acc[key] = typeof value === 'string' 
          ? (value.length > 50 ? value.substring(0, 50) + '...' : value)
          : String(value);
        return acc;
      }, {})
    });

    const response = await emailjs.send(
      EMAILJS_BOOKING_SERVICE_ID,
      EMAILJS_CANCELLATION_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Cancellation email sent successfully:', response);
    return { success: true };
  } catch (error) {
    // Log the full error for debugging
    console.error('❌ EmailJS Error Details:', {
      status: error?.status,
      statusText: error?.statusText,
      text: error?.text,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });
    
    // Try to parse error text if it's JSON
    let errorDetails = null;
    if (error?.text) {
      try {
        errorDetails = typeof error.text === 'string' ? JSON.parse(error.text) : error.text;
        console.error('❌ EmailJS Error Response (parsed):', errorDetails);
      } catch (e) {
        console.error('❌ EmailJS Error Response (raw):', error.text);
      }
    }
    
    // Check if it's a configuration error (service not found, etc.)
    const isConfigError = error?.text?.includes('service ID not found') || 
                         error?.text?.includes('template') ||
                         error?.status === 400;
    
    // Check for corrupted variables error
    const isCorruptedVariablesError = error?.text?.includes('corrupted') || 
                                      error?.text?.includes('dynamic variables') ||
                                      error?.text?.includes('template') && error?.text?.includes('variable') ||
                                      error?.message?.includes('corrupted') ||
                                      error?.message?.includes('dynamic variables');
    
    if (isCorruptedVariablesError) {
      console.error('❌ EmailJS template variable corruption error detected!');
      console.error('❌ Full error:', error);
      console.error('❌ Template params that were sent:', Object.keys(templateParams).reduce((acc, key) => {
        const value = templateParams[key];
        acc[key] = {
          type: typeof value,
          length: String(value).length,
          isEmpty: !value || String(value).trim() === '',
          hasSpecialChars: /[<>{}]/.test(String(value)),
          value: String(value).substring(0, 100) // First 100 chars for debugging
        };
        return acc;
      }, {}));
      
      // Return error but don't break cancellation flow
      return { success: false, error: 'Template variable error: ' + (error.text || error.message || 'Unknown error') };
    }
    
    if (isConfigError) {
      console.warn('⚠️ EmailJS is not properly configured for cancellation emails. Email sending skipped.', {
        serviceId: EMAILJS_BOOKING_SERVICE_ID,
        templateId: EMAILJS_CANCELLATION_TEMPLATE_ID,
        error: error.text || error.message
      });
      return { success: false, error: 'EmailJS not configured', skipped: true };
    }
    
    // For other errors, log but don't break the cancellation flow
    console.warn('⚠️ Failed to send cancellation email (non-critical):', error.message || error.text);
    return { success: false, error: error.message || error.text };
  }
};

