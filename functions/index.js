const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Generate password reset link using Firebase Admin SDK
 * This is needed because client SDK doesn't expose the reset link
 */
exports.generatePasswordResetLink = functions.https.onCall(async (data, context) => {
  const { email } = data;

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  try {
    // Generate password reset link using Admin SDK
    const continueUrl = data.continueUrl || 'https://getaways-official.web.app/reset-password';
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    return { resetLink };
  } catch (error) {
    console.error('Error generating password reset link:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

