// netlify/functions/utils/firebase.js
const admin = require('firebase-admin');

// For local development, load environment variables from the .env file.
// The `CONTEXT` variable is only set in Netlify's build/runtime environment.
if (!process.env.CONTEXT) {
  require('dotenv').config();
}

// This check prevents re-initializing the app on every function invocation.
if (!admin.apps.length) {
  let serviceAccount;

  // When running on Netlify, the service account is a Base64 encoded string.
  // The service account is always expected to be a Base64 encoded string,
  // whether running on Netlify or locally via `netlify dev`.
  // This simplifies environment variable handling.
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8'));
  } else {
    console.error(
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set. Firebase Admin SDK cannot be initialized.'
    );
    // In a real application, you might want to throw an error or handle this more gracefully.
    // For now, we'll let the app proceed, but Firebase operations will likely fail.
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Export the initialized Firestore database instance for use in other functions.
const db = admin.firestore();

module.exports = { db };
